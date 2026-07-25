"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AlertCircle, X, Save } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import axios from "axios";
import { API_BASE_URL } from "@/utils/api";
import CandidateDetailView from "@/components/recruiter/CandidateDetailView";

const O = "#E87722";
const BORDER = "#e2e8f0";

// Defined OUTSIDE component to prevent remount-on-every-keystroke cursor bug
const Input = ({ label, field, form, setForm }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
    <input
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

  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
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
      setRaw(res.data.candidate);
      const c = res.data.candidate;
      const skillsArr = Array.isArray(c.skills) ? c.skills : (c.skills ? String(c.skills).split(",").map(s => s.trim()).filter(Boolean) : []);
      setForm({ ...c, skills: skillsArr.join(",") });
    } catch (err) {
      if (err.response?.status === 403) {
        setAccessDenied(true);
      } else {
        showError(err.response?.data?.message || "Failed to load referred candidate details");
      }
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
      setRaw(res.data.candidate);
      showSuccess("Candidate updated successfully");
      setEditing(false);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update candidate");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!confirm("Are you sure you want to delete this candidate profile? This action is permanent.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/admin/referred-candidates/${referralId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSuccess("Candidate profile deleted successfully");
      router.push("/admin");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to delete candidate");
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
      a.download = `${raw?.name || "candidate"}-CV.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError(err.message || "Failed to download CV");
    } finally {
      setDownloading(false);
    }
  };

  const handleShortlist = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(`${API_BASE_URL}/api/recruiter/candidate-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source: "referred", candidateId: referralId, status: "Shortlisted" }),
      });
      if (!r.ok) throw new Error("Update failed");
      setShortlisted(s => !s);
      showSuccess(shortlisted ? "Removed from shortlist" : "Candidate shortlisted");
    } catch (err) {
      showError(err.message || "Failed to update status");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100%", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#E87722", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <p style={{ marginTop: 16, color: "#6b7280", fontSize: 14 }}>Loading…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div style={{ minHeight: "100%", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} color="#9ca3af" />
          <p style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: "#374151" }}>Access denied</p>
          <p style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>This page is only available to admins.</p>
        </div>
      </div>
    );
  }

  if (!raw) {
    return (
      <div style={{ minHeight: "100%", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} color="#9ca3af" />
          <p style={{ marginTop: 12, color: "#374151" }}>Candidate not found</p>
        </div>
      </div>
    );
  }

  const skillsArr = Array.isArray(raw.skills) ? raw.skills : (raw.skills ? String(raw.skills).split(",").map(s => s.trim()).filter(Boolean) : []);

  // Normalize into the shape CandidateDetailView expects. Fields the admin
  // hasn't filled in yet (via Edit Candidate Details) will show "Not provided",
  // same as any other candidate whose recruiter/uploader didn't fill them in.
  const candidate = {
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    linkedin: raw.linkedin,
    experience: raw.experience,
    currentCompany: raw.company,
    department: raw.department,
    role: raw.role,
    location: raw.current_location,
    preferredLocation: raw.preferred_location,
    currentCtc: raw.current_ctc,
    expectedCtc: raw.expected_ctc,
    noticePeriod: raw.notice_period,
    offerInHand: raw.offer_in_hand,
    reasonForChange: raw.reason_for_change,
    skills: skillsArr.join(","),
    hasCv: !!raw.cv_file,
  };

  return (
    <>
      {editing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }} onClick={() => setEditing(false)} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Edit Candidate</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Update details for {raw.name}</p>
              </div>
              <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}><X size={20} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
              <Input label="Full Name" field="name" form={form} setForm={setForm} />
              <Input label="Email" field="email" form={form} setForm={setForm} />
              <Input label="Phone" field="phone" form={form} setForm={setForm} />
              <Input label="Role" field="role" form={form} setForm={setForm} />
              <Input label="Experience" field="experience" form={form} setForm={setForm} />
              <Input label="Company" field="company" form={form} setForm={setForm} />
              <Input label="Department" field="department" form={form} setForm={setForm} />
              <Input label="Industry" field="industry" form={form} setForm={setForm} />
              <Input label="Current Location" field="current_location" form={form} setForm={setForm} />
              <Input label="Preferred Location" field="preferred_location" form={form} setForm={setForm} />
              <Input label="Current CTC (LPA)" field="current_ctc" form={form} setForm={setForm} />
              <Input label="Expected CTC (LPA)" field="expected_ctc" form={form} setForm={setForm} />
              <Input label="Notice Period" field="notice_period" form={form} setForm={setForm} />
              <Input label="Offer in Hand" field="offer_in_hand" form={form} setForm={setForm} />
              <Input label="LinkedIn Profile URL" field="linkedin" form={form} setForm={setForm} />
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

      <CandidateDetailView
        candidate={candidate}
        statusLabel={raw.status}
        onBack={() => router.back()}
        onDownloadCV={downloadCV}
        downloading={downloading}
        onShortlist={handleShortlist}
        shortlisted={shortlisted}
        referrer={raw.referrer ? {
          name: raw.referrer.name,
          company: raw.referrer.company,
        } : undefined}
        onEditCandidate={() => { setForm({ ...raw, skills: candidate.skills }); setEditing(true); }}
        onDeleteCandidate={handleDeleteCandidate}
      />
    </>
  );
}
