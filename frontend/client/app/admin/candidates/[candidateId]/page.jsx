"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Download, Mail, Phone, MapPin, Briefcase, DollarSign, Clock, BookOpen, Award, ExternalLink, Pencil, X, Save } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import axios from "axios";
import { API_BASE_URL } from "@/utils/api";

const O = "#ff9d4d";
const BORDER = "#e2e8f0";

export default function AdminCandidateDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = params?.candidateId;

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [parsingProjects, setParsingProjects] = useState(false);
  const [parsedProjects, setParsedProjects] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { if (candidateId) fetchCandidateDetails(); }, [candidateId]);

  const fetchCandidateDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/admin/candidates/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCandidate(response.data.candidate);
      setForm(response.data.candidate);
      if (response.data.candidate?.parsed_projects) {
        try {
          const pp = response.data.candidate.parsed_projects;
          setParsedProjects(typeof pp === "string" ? JSON.parse(pp) : pp);
        } catch {}
      }
    } catch (error) {
      showError("Failed to load candidate details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/candidates/${candidateId}/details`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCandidate(res.data.candidate);
      setForm(res.data.candidate);
      setEditing(false);
      showSuccess("Candidate updated successfully");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update candidate");
    } finally {
      setSaving(false);
    }
  };

  const parseProjects = async () => {
    setParsingProjects(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/candidates/${candidateId}/parse-projects`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setParsedProjects(response.data.projects || []);
      showSuccess(`Found ${response.data.total_projects_found || response.data.projects?.length || 0} project(s)!`);
    } catch (error) {
      showError(error.response?.data?.error || "Failed to parse projects");
    } finally {
      setParsingProjects(false);
    }
  };

  const downloadResume = async () => {
    try {
      setDownloading(true);
      if (!candidate?.resume_file_path && !candidate?.resume_url && !candidate?.resume) {
        showError("No resume available for this candidate"); return;
      }
      const resumePath = candidate?.resume_file_path || candidate?.resume_url || candidate?.resume;
      const link = document.createElement("a");
      link.href = `${API_BASE_URL}${resumePath}`;
      link.setAttribute("download", `${candidate.name}_resume.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Resume downloaded successfully");
    } catch { showError("Failed to download resume"); }
    finally { setDownloading(false); }
  };

  const handleDeleteCandidate = async () => {
    if (!confirm("Are you sure you want to delete this candidate profile? This action is permanent.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/admin/candidates/${candidateId}`, { headers: { Authorization: `Bearer ${token}` } });
      showSuccess("Candidate profile deleted successfully");
      router.push("/admin");
    } catch (error) {
      showError(error.response?.data?.message || "Failed to delete candidate");
    }
  };

  const Input = ({ label, field, type = "text" }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <input
        type={type}
        value={form[field] || ""}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder={label}
        style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#0f172a", backgroundColor: "#f8fafc" }}
        onFocus={e => e.target.style.borderColor = O}
        onBlur={e => e.target.style.borderColor = BORDER}
      />
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
      <p>Loading candidate details...</p>
    </div>
  );

  if (!candidate) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 1rem", fontSize: "1.2rem", fontWeight: "600" }}>Candidate not found</p>
        <button onClick={() => router.back()} style={{ padding: "0.5rem 1rem", backgroundColor: O, color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}>Go Back</button>
      </div>
    </div>
  );

  const parseSkills = (value) => {
    if (!value) return [];
    try { return typeof value === "string" ? value.split(",").map(s => s.trim()).filter(Boolean) : Array.isArray(value) ? value : []; }
    catch { return []; }
  };

  const generalSkills = parseSkills(candidate.skills);
  const technicalSkills = parseSkills(candidate.technical_skills);
  const softSkills = parseSkills(candidate.soft_skills);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>

      {/* Edit Modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }} onClick={() => setEditing(false)} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Edit Candidate</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Update details for {candidate.name}</p>
              </div>
              <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}><X size={20} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
              <Input label="Full Name" field="name" />
              <Input label="Email" field="email" type="email" />
              <Input label="Phone" field="phone" />
              <Input label="Experience" field="experience" />
              <Input label="Current Company" field="current_company_name" />
              <Input label="Qualification" field="highest_qualification" />
              <Input label="Current Location" field="current_location" />
              <Input label="Preferred Location" field="preferred_location" />
              <Input label="Current CTC (LPA)" field="cctc" />
              <Input label="Expected CTC (LPA)" field="ectc" />
              <Input label="Notice Period" field="notice_period" />
              <Input label="Offer in Hand" field="offer_in_hand" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reason for Change</label>
              <input value={form.reason_for_change || ""} onChange={e => setForm(f => ({ ...f, reason_for_change: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#0f172a", backgroundColor: "#f8fafc" }}
                onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Skills (comma separated)</label>
              <input value={form.skills || ""} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                placeholder="React, Node.js, Python..."
                style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#0f172a", backgroundColor: "#f8fafc" }}
                onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Technical Skills</label>
                <input value={form.technical_skills || ""} onChange={e => setForm(f => ({ ...f, technical_skills: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#0f172a", backgroundColor: "#f8fafc" }}
                  onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Soft Skills</label>
                <input value={form.soft_skills || ""} onChange={e => setForm(f => ({ ...f, soft_skills: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#0f172a", backgroundColor: "#f8fafc" }}
                  onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
              </div>
            </div>

            <Input label="LinkedIn Profile URL" field="linkedin_profile" />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
              <button onClick={() => setEditing(false)} style={{ padding: "10px 22px", border: `1.5px solid ${BORDER}`, borderRadius: 9, background: "#fff", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "10px 28px", border: "none", borderRadius: 9, background: saving ? "#fcc5a0" : O, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
                <Save size={15} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ backgroundColor: "white", padding: "1.5rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.5rem", color: O }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Candidate Details</h1>
        </div>
        <button onClick={() => { setForm(candidate); setEditing(true); }}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "#fff7ed", color: O, border: `1.5px solid #fed7aa`, borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <Pencil size={15} /> Edit Details
        </button>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem" }}>
          {/* Left Column */}
          <div>
            {/* Profile Card */}
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "2px solid #f1f5f9" }}>
                {candidate.image ? (
                  <img src={candidate.image} alt={candidate.name} style={{ width: "100px", height: "100px", borderRadius: "0.5rem", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100px", height: "100px", borderRadius: "0.5rem", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", fontWeight: "700", color: "#64748b" }}>
                    {candidate.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>{candidate.name}</h2>
                  <p style={{ margin: "0 0 1rem", color: "#64748b", fontSize: "0.95rem" }}>
                    {candidate.email}{candidate.phone ? ` • ${candidate.phone}` : ""}
                  </p>
                  <span style={{ display: "inline-block", padding: "0.4rem 0.8rem", backgroundColor: candidate.verified ? "#dcfce7" : "#fef3c7", color: candidate.verified ? "#166534" : "#92400e", borderRadius: "0.25rem", fontSize: "0.85rem", fontWeight: "600" }}>
                    {candidate.verified ? "✓ Verified" : "⏳ Pending Verification"}
                  </span>
                </div>
              </div>

              {/* Personal Info */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Personal Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {[
                    { icon: Mail, label: "Email", value: candidate.email },
                    { icon: Phone, label: "Contact Number", value: candidate.contact || candidate.phone },
                    candidate.current_location && { icon: MapPin, label: "Current Location", value: candidate.current_location },
                    candidate.preferred_location && { icon: MapPin, label: "Preferred Location", value: candidate.preferred_location },
                  ].filter(Boolean).map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                      <item.icon size={18} style={{ color: O, marginTop: "2px" }} />
                      <div>
                        <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>{item.label}</p>
                        <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{item.value || "Not provided"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Professional Info */}
              {(candidate.current_company_name || candidate.experience || candidate.cctc || candidate.ectc || candidate.notice_period || candidate.offer_in_hand) && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Professional Information</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    {[
                      candidate.current_company_name && { icon: Briefcase, label: "Current Company", value: candidate.current_company_name },
                      candidate.experience && { icon: Clock, label: "Experience", value: candidate.experience },
                      (candidate.cctc || candidate.current_ctc) && { icon: DollarSign, label: "Current CTC (LPA)", value: candidate.cctc || candidate.current_ctc },
                      (candidate.ectc || candidate.expected_ctc) && { icon: DollarSign, label: "Expected CTC (LPA)", value: candidate.ectc || candidate.expected_ctc },
                      candidate.notice_period && { icon: Clock, label: "Notice Period", value: candidate.notice_period },
                      candidate.offer_in_hand && { icon: Award, label: "Offer in Hand", value: candidate.offer_in_hand },
                    ].filter(Boolean).map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <item.icon size={18} style={{ color: O, marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>{item.label}</p>
                          <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {(generalSkills.length > 0 || technicalSkills.length > 0 || softSkills.length > 0) && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Skills</h3>
                  {[
                    { label: "General Skills", skills: generalSkills, bg: "#fef3e2", color: "#7c2d12" },
                    { label: "Technical Skills", skills: technicalSkills, bg: "#eef2ff", color: "#4338ca" },
                    { label: "Soft Skills", skills: softSkills, bg: "#ecfdf5", color: "#166534" },
                  ].filter(g => g.skills.length > 0).map((group) => (
                    <div key={group.label} style={{ marginBottom: "1rem" }}>
                      <p style={{ margin: "0 0 0.75rem", color: "#64748b", fontSize: "0.9rem", fontWeight: "600" }}>{group.label}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                        {group.skills.map((skill, idx) => (
                          <span key={idx} style={{ display: "inline-block", padding: "0.5rem 1rem", backgroundColor: group.bg, color: group.color, borderRadius: "0.375rem", fontSize: "0.9rem", fontWeight: "500" }}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Additional Info */}
              {(candidate.reason_for_change || candidate.linkedin_profile) && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Additional Details</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                    {candidate.reason_for_change && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <Briefcase size={18} style={{ color: O, marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Reason for Change</p>
                          <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.reason_for_change}</p>
                        </div>
                      </div>
                    )}
                    {candidate.linkedin_profile && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <ExternalLink size={18} style={{ color: O, marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>LinkedIn Profile</p>
                          <a href={candidate.linkedin_profile} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontSize: "0.95rem", fontWeight: "600" }}>{candidate.linkedin_profile}</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {candidate.highest_qualification && (
                <div>
                  <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Education</h3>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <BookOpen size={18} style={{ color: O, marginTop: "2px" }} />
                    <div>
                      <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Highest Qualification</p>
                      <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.highest_qualification}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Resume */}
            {(candidate.resume_file_path || candidate.resume_url || candidate.resume) && (
              <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Resume</h3>
                <button onClick={downloadResume} disabled={downloading}
                  style={{ width: "100%", padding: "0.875rem", backgroundColor: downloading ? "#fcc5a0" : O, color: "#fff", border: "none", borderRadius: "0.5rem", fontSize: "0.95rem", fontWeight: "600", cursor: downloading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <Download size={16} /> {downloading ? "Downloading..." : "Download Resume"}
                </button>
              </div>
            )}

            {/* Parsed Projects */}
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Parsed Projects</h3>
                <span style={{ fontSize: 10, backgroundColor: "#E87722", color: "#fff", borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>AI</span>
              </div>
              {!(candidate.resume_file_path || candidate.resume_url || candidate.resume) ? (
                <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", margin: 0 }}>No resume uploaded.</p>
              ) : (
                <button onClick={parseProjects} disabled={parsingProjects}
                  style={{ width: "100%", padding: "0.75rem", backgroundColor: parsingProjects ? "#fcd9b8" : "#E87722", color: "#fff", border: "none", borderRadius: "0.5rem", fontSize: "0.9rem", fontWeight: "600", cursor: parsingProjects ? "not-allowed" : "pointer", marginBottom: parsedProjects ? "1rem" : 0 }}>
                  {parsingProjects ? "Parsing..." : parsedProjects ? "Re-parse Projects" : "Parse Projects"}
                </button>
              )}
              {parsedProjects?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {parsedProjects.map((p, i) => (
                    <div key={i} style={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{p.description}</div>
                      {p.technologies?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {p.technologies.map((t, j) => <span key={j} style={{ fontSize: 10, backgroundColor: "#EFF6FF", color: "#1d4ed8", padding: "2px 7px", borderRadius: 5 }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Actions */}
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Admin Actions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => { setForm(candidate); setEditing(true); }}
                  style={{ width: "100%", padding: "0.875rem", backgroundColor: "#fff7ed", color: O, border: `1.5px solid #fed7aa`, borderRadius: "0.5rem", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <Pencil size={16} /> Edit Candidate Details
                </button>
                <button onClick={handleDeleteCandidate}
                  style={{ width: "100%", padding: "0.875rem", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "0.5rem", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer" }}>
                  Delete Candidate Profile
                </button>
              </div>
            </div>

            {/* Profile Status */}
            <div style={{ backgroundColor: "#fef3e2", borderRadius: "1rem", padding: "1.5rem", border: "1px solid #fed7aa" }}>
              <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: "700", color: "#7c2d12" }}>Profile Status</h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#92400e", lineHeight: "1.5" }}>
                {candidate.verified ? "✓ This candidate's profile has been verified." : "⏳ This candidate is pending verification."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
