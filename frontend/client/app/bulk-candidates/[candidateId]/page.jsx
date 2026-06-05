"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, Briefcase, Award, Users, Building2,
  Download, MapPin, BookOpen, TrendingUp, ExternalLink, FileText,
  AlertCircle, CheckCircle2
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import axios from "axios";

export default function BulkCandidateDetailPage() {
  const router = useRouter();
  const { candidateId } = useParams();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const initials = (name) => name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#f97316", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
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

  const coreSkills = typeof candidate.skills === "string"
    ? candidate.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  const techSkills = typeof candidate.technical_skills === "string"
    ? candidate.technical_skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  const softSkills = typeof candidate.soft_skills === "string"
    ? candidate.soft_skills.split(",").map(s => s.trim()).filter(Boolean) : [];

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

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc" }}>
      {/* Nav */}
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
                {candidate.role || "Not specified"} · Bulk upload
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {candidate.resume_link && (
              <a
                href={candidate.resume_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#f97316", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none" }}
              >
                <Download size={14} />
                Download CV
              </a>
            )}
            {candidate.linkedin && (
              <a
                href={candidate.linkedin}
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

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 290px", gap: 20 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Hero card */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "24px", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #f97316, #f97316)" }} />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, paddingTop: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: 14, background: "#fef3e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20, fontWeight: 600, color: "#f97316" }}>
                {initials(candidate.name)}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 600, color: "#111827" }}>
                  {candidate.name}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                  {candidate.role || "Not specified"}
                </p>
                <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                  {candidate.email && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
                      <Mail size={12} /> {candidate.email}
                    </span>
                  )}
                  {candidate.contact && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
                      <Phone size={12} /> {candidate.contact}
                    </span>
                  )}
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
              <div key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 9, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" }}>{value || "—"}</p>
              </div>
            ))}
          </div>

          {/* Professional Details */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "22px 24px" }}>
            <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Professional Details</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              <Field icon={Building2} label="Current Company" value={candidate.current_company_name} />
              <Field icon={Briefcase} label="Department / Role" value={candidate.role} />
              <Field icon={MapPin} label="Current Location" value={candidate.current_location} />
              <Field icon={MapPin} label="Preferred Location" value={candidate.preferred_location} />
              <Field icon={BookOpen} label="Qualification" value={candidate.highest_qualification} />
              <Field icon={TrendingUp} label="Reason for Change" value={candidate.reason_for_change} />
            </div>

            {/* Skills */}
            {(coreSkills.length > 0 || techSkills.length > 0 || softSkills.length > 0) && (
              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16, marginTop: 8 }}>
                <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Skills</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {coreSkills.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 7px", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Core Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {coreSkills.map((s, i) => (
                          <span key={i} style={{ padding: "3px 10px", background: "#fef3e2", color: "#ea580c", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {techSkills.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 7px", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Technical Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {techSkills.map((s, i) => (
                          <span key={i} style={{ padding: "3px 10px", background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {softSkills.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 7px", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Soft Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {softSkills.map((s, i) => (
                          <span key={i} style={{ padding: "3px 10px", background: "#f0fdf4", color: "#16a34a", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{s}</span>
                        ))}
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
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "20px" }}>
            <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Links & Files</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {candidate.resume_link && (
                <a
                  href={candidate.resume_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8f9fc", border: "1px solid #e5e7eb", borderRadius: 8, textDecoration: "none" }}
                >
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
                <a
                  href={candidate.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8f9fc", border: "1px solid #e5e7eb", borderRadius: 8, textDecoration: "none" }}
                >
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
          <div style={{ background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Source</p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fef3e2", color: "#ea580c", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
              Bulk Upload
            </span>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
              This candidate was bulk uploaded and was not referred by anyone.
            </p>
          </div>

          {/* Additional Info */}
          {(candidate.offer_in_hand || candidate.reason_for_change || candidate.highest_qualification) && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "20px" }}>
              <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Additional Info</p>
              {candidate.offer_in_hand && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 10, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Offer in Hand</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#374151" }}>{candidate.offer_in_hand}</p>
                </div>
              )}
              {candidate.reason_for_change && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 10, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reason for Change</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#374151" }}>{candidate.reason_for_change}</p>
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
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
