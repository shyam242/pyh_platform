"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, Briefcase, Award, Users, Building2,
  Download, MapPin, BookOpen, TrendingUp, ExternalLink, FileText,
  AlertCircle, Pencil, X, Save
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import axios from "axios";
import { API_BASE_URL } from "@/utils/api";

const O = "#f97316";
const BORDER = "#e5e7eb";

// Defined OUTSIDE component to prevent remount-on-every-keystroke cursor bug
const Input = ({ label, field, form, setForm, type = "text", placeholder }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
    <input
      type={type}
      value={form[field] || ""}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      placeholder={placeholder || label}
      style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#111827", backgroundColor: "#fafafa" }}
      onFocus={e => e.target.style.borderColor = O}
      onBlur={e => e.target.style.borderColor = BORDER}
    />
  </div>
);

export default function BulkCandidateDetailPage() {
  const router = useRouter();
  const { candidateId } = useParams();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { fetchCandidateDetails(); }, [candidateId]);

  const fetchCandidateDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/admin/bulk-candidates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const found = response.data.find(c => c.id === parseInt(candidateId));
      if (found) {
        setCandidate(found);
        setForm(found);
      } else {
        showError("Candidate not found");
        router.back();
      }
    } catch (err) {
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
        `${API_BASE_URL}/api/admin/bulk-candidates/${candidateId}/details`,
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

  const initials = (name) => name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

  const coreSkills = (candidate?.skills || "").split(",").map(s => s.trim()).filter(Boolean);
  const techSkills = (candidate?.technical_skills || "").split(",").map(s => s.trim()).filter(Boolean);
  const softSkills = (candidate?.soft_skills || "").split(",").map(s => s.trim()).filter(Boolean);

  const Field = ({ icon: Icon, label, value }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 30, height: 30, borderRadius: 7, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={13} color="#6b7280" />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 10, color: "#9ca3af", fontWeight: 500, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
        <p style={{ margin: 0, fontSize: 13, color: "#111827", fontWeight: 500 }}>{value || "Not provided"}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
      <div style={{ minHeight: "100vh", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} color="#9ca3af" />
          <p style={{ marginTop: 12, color: "#374151" }}>Candidate not found</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc" }}>
      {/* Edit Modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }} onClick={() => setEditing(false)} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>Edit Candidate</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Update details for {candidate.name}</p>
              </div>
              <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
              <Input label="Full Name" field="name" form={form} setForm={setForm} />
              <Input label="Email" field="email" type="email" form={form} setForm={setForm} />
              <Input label="Phone" field="contact" form={form} setForm={setForm} />
              <Input label="Experience (years)" field="experience" form={form} setForm={setForm} />
              <Input label="Current Company" field="current_company_name" form={form} setForm={setForm} />
              <Input label="Qualification" field="highest_qualification" form={form} setForm={setForm} />
              <Input label="Current Location" field="current_location" form={form} setForm={setForm} />
              <Input label="Preferred Location" field="preferred_location" form={form} setForm={setForm} />
              <Input label="Current CTC" field="current_ctc" form={form} setForm={setForm} />
              <Input label="Expected CTC" field="expected_ctc" form={form} setForm={setForm} />
              <Input label="Notice Period" field="notice_period" form={form} setForm={setForm} />
              <Input label="Offer in Hand" field="offer_in_hand" form={form} setForm={setForm} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reason for Change</label>
              <input value={form.reason_for_change || ""} onChange={e => setForm(f => ({ ...f, reason_for_change: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#111827", backgroundColor: "#fafafa" }}
                onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Skills (comma separated)</label>
              <input value={form.skills || ""} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                placeholder="React, Node.js, Python..."
                style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#111827", backgroundColor: "#fafafa" }}
                onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Technical Skills</label>
                <input value={form.technical_skills || ""} onChange={e => setForm(f => ({ ...f, technical_skills: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#111827", backgroundColor: "#fafafa" }}
                  onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Soft Skills</label>
                <input value={form.soft_skills || ""} onChange={e => setForm(f => ({ ...f, soft_skills: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#111827", backgroundColor: "#fafafa" }}
                  onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
              </div>
            </div>

            <Input label="LinkedIn URL" field="linkedin" form={form} setForm={setForm} />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
              <button onClick={() => setEditing(false)} style={{ padding: "10px 22px", border: `1.5px solid ${BORDER}`, borderRadius: 9, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "10px 28px", border: "none", borderRadius: 9, background: saving ? "#fed7aa" : O, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
                <Save size={15} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${BORDER}`, padding: "0 32px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ArrowLeft size={16} color="#374151" />
            </button>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>Candidate Details</p>
              <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>{candidate.role || "Not specified"} · Bulk upload</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setForm(candidate); setEditing(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#fef3e2", color: O, border: `1px solid #fed7aa`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <Pencil size={14} /> Edit Details
            </button>
            {candidate.resume_link && (
              <a href={candidate.resume_link} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: O, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
                <Download size={14} /> Download CV
              </a>
            )}
            {candidate.linkedin && (
              <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#374151", textDecoration: "none" }}>
                <ExternalLink size={14} /> LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 32px 0" }}>
        {candidate.needs_manual_review && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
            <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#92400e" }}>This resume needs manual review</p>
              <p style={{ margin: 0, fontSize: 12, color: "#78350f", lineHeight: 1.6 }}>
                {candidate.parse_error || "The uploaded file couldn't be parsed automatically."} The original resume{candidate.original_resume_filename ? ` (${candidate.original_resume_filename})` : ""} has been kept — nothing was discarded. Fill in the candidate's details below to complete their profile.
              </p>
            </div>
            <button onClick={() => { setForm(candidate); setEditing(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#D97706", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
              <Pencil size={13} /> Fill Details
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px 28px", display: "grid", gridTemplateColumns: "1fr 290px", gap: 20 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Hero card */}
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: O }} />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, paddingTop: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: 14, background: "#fef3e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20, fontWeight: 600, color: O }}>
                {initials(candidate.name)}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 600, color: "#111827" }}>{candidate.name}</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>{candidate.role || "Not specified"}</p>
                <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                  {candidate.email && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}><Mail size={12} /> {candidate.email}</span>}
                  {candidate.contact && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}><Phone size={12} /> {candidate.contact}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: "Experience", value: candidate.experience ? `${candidate.experience} yrs` : null },
              { label: "Current CTC", value: candidate.current_ctc },
              { label: "Expected CTC", value: candidate.expected_ctc },
              { label: "Notice Period", value: candidate.notice_period },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 9, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" }}>{value || "—"}</p>
              </div>
            ))}
          </div>

          {/* Professional Details */}
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "22px 24px" }}>
            <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Professional Details</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              <Field icon={Building2} label="Current Company" value={candidate.current_company_name} />
              <Field icon={Briefcase} label="Department / Role" value={candidate.role} />
              <Field icon={MapPin} label="Current Location" value={candidate.current_location} />
              <Field icon={MapPin} label="Preferred Location" value={candidate.preferred_location} />
              <Field icon={BookOpen} label="Qualification" value={candidate.highest_qualification} />
              <Field icon={TrendingUp} label="Reason for Change" value={candidate.reason_for_change} />
            </div>

            {(coreSkills.length > 0 || techSkills.length > 0 || softSkills.length > 0) && (
              <div style={{ borderTop: `1px solid #f3f4f6`, paddingTop: 16, marginTop: 8 }}>
                <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Skills</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {coreSkills.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 7px", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Core Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {coreSkills.map((s, i) => <span key={i} style={{ padding: "3px 10px", background: "#fef3e2", color: "#ea580c", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{s}</span>)}
                      </div>
                    </div>
                  )}
                  {techSkills.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 7px", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Technical Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {techSkills.map((s, i) => <span key={i} style={{ padding: "3px 10px", background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{s}</span>)}
                      </div>
                    </div>
                  )}
                  {softSkills.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 7px", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Soft Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {softSkills.map((s, i) => <span key={i} style={{ padding: "3px 10px", background: "#f0fdf4", color: "#16a34a", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{s}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Links & Files */}
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px" }}>
            <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Links & Files</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {candidate.resume_link && (
                <a href={candidate.resume_link} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8f9fc", border: `1px solid ${BORDER}`, borderRadius: 8, textDecoration: "none" }}>
                  <div style={{ width: 32, height: 32, background: "#fef2f2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={14} color="#dc2626" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#374151" }}>Resume / CV</p>
                    <p style={{ margin: 0, fontSize: 10, color: "#9ca3af" }}>Click to view</p>
                  </div>
                </a>
              )}
              {candidate.linkedin && (
                <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8f9fc", border: `1px solid ${BORDER}`, borderRadius: 8, textDecoration: "none" }}>
                  <div style={{ width: 32, height: 32, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Users size={14} color="#1d4ed8" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#374151" }}>LinkedIn Profile</p>
                    <p style={{ margin: 0, fontSize: 10, color: "#9ca3af" }}>View on LinkedIn</p>
                  </div>
                </a>
              )}
            </div>
          </div>

          {/* Source */}
          <div style={{ background: "#fafafa", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Source</p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fef3e2", color: "#ea580c", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>Bulk Upload</span>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>This candidate was bulk uploaded and was not referred by anyone.</p>
          </div>

          {/* Additional Info */}
          {(candidate.offer_in_hand || candidate.reason_for_change || candidate.highest_qualification) && (
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px" }}>
              <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Additional Info</p>
              {candidate.offer_in_hand && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 10, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Offer in Hand</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#374151" }}>{candidate.offer_in_hand}</p>
                </div>
              )}
              {candidate.highest_qualification && (
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 10, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Qualification</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#374151" }}>{candidate.highest_qualification}</p>
                </div>
              )}
            </div>
          )}

          {/* Edit CTA */}
          <button onClick={() => { setForm(candidate); setEditing(true); }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", background: O, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(249,115,22,0.25)" }}>
            <Pencil size={15} /> Edit Candidate Details
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
