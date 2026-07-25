"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, AlertCircle, Download, Mail, Phone, Briefcase, Building2, Users, ExternalLink, Pencil, X, Save } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import axios from "axios";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722";
const BORDER = "#e2e8f0";

// Defined OUTSIDE component to prevent remount-on-every-keystroke cursor bug
const Input = ({ label, field, type = "text", form, setForm }) => (
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

export default function AdminReferredCandidateDetailsPage() {
  const router = useRouter();
  const { referralId } = useParams();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { if (referralId) fetchDetails(); }, [referralId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/admin/referred-candidates/${referralId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const c = res.data.candidate;
      setCandidate(c);
      setForm({ ...c, skills: Array.isArray(c.skills) ? c.skills.join(", ") : (c.skills || "") });
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load referred candidate details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API_BASE_URL}/api/admin/referred-candidates/${referralId}/details`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const c = res.data.candidate;
      setCandidate(prev => ({ ...prev, ...c }));
      setForm({ ...candidate, ...c, skills: Array.isArray(c.skills) ? c.skills.join(", ") : (c.skills || "") });
      setEditing(false);
      showSuccess("Referred candidate updated successfully");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update candidate");
    } finally {
      setSaving(false);
    }
  };

  const downloadCV = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/recruiter/${referralId}/cv/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("CV not available");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${candidate?.name || "candidate"}-CV.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError(err.message || "Failed to download CV");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: O, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <p style={{ marginTop: 16, color: "#6b7280", fontSize: 14 }}>Loading…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} color="#9ca3af" />
          <p style={{ marginTop: 12, color: "#374151" }}>Candidate not found</p>
        </div>
      </div>
    );
  }

  const skillsArr = Array.isArray(candidate.skills) ? candidate.skills : (candidate.skills ? String(candidate.skills).split(",").map(s => s.trim()).filter(Boolean) : []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>

      {/* Edit Modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }} onClick={() => setEditing(false)} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Edit Referred Candidate</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Update details for {candidate.name}</p>
              </div>
              <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}><X size={20} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
              <Input label="Full Name" field="name" form={form} setForm={setForm} />
              <Input label="Email" field="email" type="email" form={form} setForm={setForm} />
              <Input label="Phone" field="phone" form={form} setForm={setForm} />
              <Input label="Experience" field="experience" form={form} setForm={setForm} />
              <Input label="Company" field="company" form={form} setForm={setForm} />
              <Input label="Department" field="department" form={form} setForm={setForm} />
              <Input label="Industry" field="industry" form={form} setForm={setForm} />
              <Input label="LinkedIn Profile URL" field="linkedin" form={form} setForm={setForm} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Skills (comma separated)</label>
              <input value={form.skills || ""} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                placeholder="React, Node.js, Python..."
                style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#0f172a", backgroundColor: "#f8fafc" }}
                onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
              <button onClick={() => setEditing(false)} style={{ padding: "10px 22px", border: `1.5px solid ${BORDER}`, borderRadius: 9, background: "#fff", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "10px 28px", border: "none", borderRadius: 9, background: saving ? "#f5c197" : O, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
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
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Referred Candidate Details</h1>
        </div>
        <button onClick={() => { setForm({ ...candidate, skills: skillsArr.join(", ") }); setEditing(true); }}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "#fff3e8", color: O, border: "1.5px solid #fbbf7a", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <Pencil size={15} /> Edit Details
        </button>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem" }}>
          {/* Left Column */}
          <div>
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "2px solid #f1f5f9" }}>
                <div style={{ width: "100px", height: "100px", borderRadius: "0.5rem", backgroundColor: "#fff3e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", fontWeight: "700", color: O, flexShrink: 0 }}>
                  {candidate.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>{candidate.name}</h2>
                  <p style={{ margin: "0 0 1rem", color: "#64748b", fontSize: "0.95rem" }}>
                    {candidate.email}{candidate.phone ? ` • ${candidate.phone}` : ""}
                  </p>
                  <span style={{ display: "inline-block", padding: "0.4rem 0.8rem", backgroundColor: "#f3e8ff", color: "#7c3aed", borderRadius: "0.25rem", fontSize: "0.85rem", fontWeight: "600" }}>
                    Referred{candidate.status ? ` • ${candidate.status}` : ""}
                  </span>
                </div>
              </div>

              {/* Personal Info */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Personal Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {[
                    { icon: Mail, label: "Email", value: candidate.email },
                    { icon: Phone, label: "Phone", value: candidate.phone },
                  ].map((item, i) => (
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
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Professional Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {[
                    { icon: Building2, label: "Company", value: candidate.company },
                    { icon: Briefcase, label: "Department", value: candidate.department },
                    { icon: Briefcase, label: "Industry", value: candidate.industry },
                    { icon: Briefcase, label: "Experience", value: candidate.experience },
                  ].map((item, i) => (
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

              {/* Skills */}
              {skillsArr.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Skills</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                    {skillsArr.map((skill, idx) => (
                      <span key={idx} style={{ display: "inline-block", padding: "0.5rem 1rem", backgroundColor: "#f3e8ff", color: "#7c3aed", borderRadius: "0.375rem", fontSize: "0.9rem", fontWeight: "500" }}>{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* LinkedIn */}
              {candidate.linkedin && (
                <div>
                  <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Additional Details</h3>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <ExternalLink size={18} style={{ color: O, marginTop: "2px" }} />
                    <div>
                      <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>LinkedIn Profile</p>
                      <a href={candidate.linkedin} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontSize: "0.95rem", fontWeight: "600" }}>{candidate.linkedin}</a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* CV */}
            {candidate.cv_file && (
              <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Resume / CV</h3>
                <button onClick={downloadCV} disabled={downloading}
                  style={{ width: "100%", padding: "0.875rem", backgroundColor: downloading ? "#f5c197" : O, color: "#fff", border: "none", borderRadius: "0.5rem", fontSize: "0.95rem", fontWeight: "600", cursor: downloading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <Download size={16} /> {downloading ? "Downloading..." : "Download CV"}
                </button>
              </div>
            )}

            {/* Admin Actions */}
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Admin Actions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => { setForm({ ...candidate, skills: skillsArr.join(", ") }); setEditing(true); }}
                  style={{ width: "100%", padding: "0.875rem", backgroundColor: "#fff3e8", color: O, border: "1.5px solid #fbbf7a", borderRadius: "0.5rem", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <Pencil size={16} /> Edit Candidate Details
                </button>
              </div>
            </div>

            {/* Referred By */}
            {candidate.referrer && (
              <div style={{ backgroundColor: "#f3e8ff", borderRadius: "1rem", padding: "1.5rem", border: "1px solid #e9d5ff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Users size={16} color="#7c3aed" />
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "#5b21b6" }}>Referred By</h4>
                </div>
                <p style={{ margin: "0 0 4px", fontSize: "0.9rem", fontWeight: "600", color: "#4c1d95" }}>{candidate.referrer.name}</p>
                {candidate.referrer.company && <p style={{ margin: 0, fontSize: "0.85rem", color: "#6d28d9" }}>{candidate.referrer.company}</p>}
                {candidate.referrer.email && <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "#7c3aed" }}>{candidate.referrer.email}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
