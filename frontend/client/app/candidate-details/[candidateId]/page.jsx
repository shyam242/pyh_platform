"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, Briefcase, Award, Users, Building2,
  Download, MapPin, DollarSign, Clock, BookOpen, TrendingUp,
  ExternalLink, FileText, User, AlertCircle, CheckCircle2, Upload
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

export default function CandidateDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = params.candidateId;
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const sourceType = searchParams ? (searchParams.get("source_type") || "referral") : "referral";

  const [candidateData, setCandidateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { fetchCandidateDetails(); }, [candidateId]);

  // Fire-and-forget — never blocks the UI
  const trackView = (name, type = "profile_view") => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_BASE_URL}/api/recruiter/track-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ candidateId: Number(candidateId), candidateName: name, viewType: type }),
    }).catch(() => {});
  };

  const fetchCandidateDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/recruiter/${candidateId}/details?source_type=${sourceType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch candidate details");
      const data = await res.json();
      setCandidateData(data);
      // Track profile view as soon as details load
      trackView(data.name, "profile_view");
    } catch (err) {
      showError(err.message || "Failed to load candidate details");
      setTimeout(() => router.back(), 2000);
    } finally {
      setLoading(false);
    }
  };

  const downloadCV = async () => {
    if (!candidateData?.cv_file) return showError("CV file not available");
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/recruiter/${candidateId}/cv/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download CV");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${candidateData.name}-CV.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      // Track CV download
      trackView(candidateData.name, "candidate_cv");
      showSuccess("CV downloaded!");
    } catch (err) {
      showError(err.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const initials = (name) => name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#4f46e5", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <p style={{ marginTop: 16, color: "#6b7280", fontSize: 14 }}>Loading…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!candidateData) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} color="#9ca3af" />
          <p style={{ marginTop: 12, color: "#374151" }}>Candidate not found</p>
        </div>
      </div>
    );
  }

  const skills = {
    core: candidateData.core_skills || candidateData.skills?.split(",").map(s => s.trim()) || [],
    technical: candidateData.technical_skills?.split(",").map(s => s.trim()) || [],
    soft: candidateData.soft_skills?.split(",").map(s => s.trim()) || [],
  };

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 24 }}>
      <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </p>
      {children}
    </div>
  );

  const Field = ({ icon: Icon, label, value, accent }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} color="#6b7280" />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 2 }}>{label}</p>
        <p style={{ margin: 0, fontSize: 13, color: accent ? "#4f46e5" : "#111827", fontWeight: 500 }}>{value || "Not provided"}</p>
      </div>
    </div>
  );

  const SkillPill = ({ label, color }) => {
    const colors = {
      blue: { bg: "#eff6ff", text: "#1d4ed8" },
      purple: { bg: "#f0f4ff", text: "#4338ca" },
      green: { bg: "#f0fdf4", text: "#16a34a" },
      gray: { bg: "#f3f4f6", text: "#4b5563" },
    };
    const c = colors[color] || colors.gray;
    return (
      <span style={{ padding: "4px 10px", background: c.bg, color: c.text, borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
        {label}
      </span>
    );
  };

  const StatCard = ({ label, value, sub }) => (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", flex: 1 }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827" }}>{value || "—"}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Top Nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 32px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => router.back()}
              style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <ArrowLeft size={16} color="#374151" />
            </button>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>Candidate Details</p>
              <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                {candidateData.department || "Not specified"} · Bulk upload
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {candidateData.cv_file && (
              <button
                onClick={downloadCV}
                disabled={downloading}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  background: downloading ? "#f3f4f6" : "#4f46e5", color: downloading ? "#9ca3af" : "#fff",
                  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: downloading ? "not-allowed" : "pointer", transition: "background 0.15s"
                }}
              >
                <Download size={14} />
                {downloading ? "Downloading…" : "Download CV"}
              </button>
            )}
            {candidateData.linkedin && (
              <a
                href={candidateData.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#374151", textDecoration: "none" }}
              >
                <ExternalLink size={14} />
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Hero card */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "24px", overflow: "hidden", position: "relative" }}>
            {/* Subtle bg accent */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #4f46e5, #7c3aed)" }} />

            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, paddingTop: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: 14, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                {candidateData.candidate_image_url ? (
                  <img src={candidateData.candidate_image_url} alt={candidateData.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 20, fontWeight: 600, color: "#4f46e5" }}>{initials(candidateData.name)}</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 600, color: "#111827" }}>
                      {candidateData.name}
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                      {candidateData.department || "Not specified"} · {candidateData.industry || "Not specified"}
                    </p>
                  </div>
                  {candidateData.status === "shortlist" && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
                      <CheckCircle2 size={12} />
                      Shortlisted
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                  {candidateData.email && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
                      <Mail size={12} /> {candidateData.email}
                    </span>
                  )}
                  {candidateData.phone && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
                      <Phone size={12} /> {candidateData.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 12 }}>
            <StatCard label="Experience" value={candidateData.experience ? `${candidateData.experience} yrs` : null} />
            <StatCard label="Current CTC" value={candidateData.current_ctc} />
            <StatCard label="Expected CTC" value={candidateData.expected_ctc} />
            <StatCard label="Notice Period" value={candidateData.notice_period} />
          </div>

          {/* Professional Details */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "22px 24px" }}>
            <Section title="Professional Details">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                <Field icon={Building2} label="Current Company" value={candidateData.current_company_name} />
                <Field icon={Briefcase} label="Department" value={candidateData.department} />
                <Field icon={MapPin} label="Current Location" value={candidateData.current_location} />
                <Field icon={MapPin} label="Preferred Location" value={candidateData.preferred_location} />
                <Field icon={BookOpen} label="Qualification" value={candidateData.qualification} />
                <Field icon={TrendingUp} label="Reason for Change" value={candidateData.reason_for_change} />
              </div>
              {candidateData.offer_in_hand !== undefined && (
                <div style={{ marginTop: 6 }}>
                  <Field icon={Award} label="Offer in Hand" value={candidateData.offer_in_hand === "yes" ? "Yes" : "No"} />
                </div>
              )}
            </Section>

            {/* Skills */}
            {(skills.core.length > 0 || skills.technical.length > 0 || skills.soft.length > 0) && (
              <Section title="Skills">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {skills.core.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 7px", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Core Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {skills.core.map((s, i) => <SkillPill key={i} label={s} color="purple" />)}
                      </div>
                    </div>
                  )}
                  {skills.technical.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 7px", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Technical Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {skills.technical.map((s, i) => <SkillPill key={i} label={s} color="blue" />)}
                      </div>
                    </div>
                  )}
                  {skills.soft.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 7px", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Soft Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {skills.soft.map((s, i) => <SkillPill key={i} label={s} color="green" />)}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Quick Links */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "20px" }}>
            <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Links & Files
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {candidateData.cv_file && (
                <button
                  onClick={downloadCV}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8f9fc", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", width: "100%", textAlign: "left" }}
                >
                  <div style={{ width: 32, height: 32, background: "#fef2f2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={14} color="#dc2626" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#374151" }}>Resume / CV</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>Click to download</p>
                  </div>
                </button>
              )}
              {candidateData.linkedin && (
                <a
                  href={candidateData.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8f9fc", border: "1px solid #e5e7eb", borderRadius: 8, textDecoration: "none" }}
                >
                  <div style={{ width: 32, height: 32, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Users size={14} color="#1d4ed8" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#374151" }}>LinkedIn Profile</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>View on LinkedIn</p>
                  </div>
                </a>
              )}
            </div>
          </div>

          {/* Source badge - only show if NOT referred */}
          {!candidateData.referrer_id && (
            <div style={{ background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 14, padding: "16px 20px" }}>
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Source</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f0f4ff", color: "#4338ca", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                <Upload size={12} />
                Bulk Upload
              </span>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9ca3af" }}>
                This candidate was added via bulk upload and was not referred.
              </p>
            </div>
          )}

          {/* Referrer */}
          {candidateData.referrer_id && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "20px" }}>
              <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Referred by</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#ea580c" }}>
                  {initials(candidateData.referrer_name)}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{candidateData.referrer_name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>{candidateData.referrer_company}</p>
                </div>
              </div>
              <Field icon={Mail} label="Email" value={candidateData.referrer_email} />
              <Field icon={Award} label="Experience" value={candidateData.referrer_experience} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
