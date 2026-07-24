"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building2, Award, Calendar, Users, ExternalLink, UserCheck } from "lucide-react";
import { showError } from "@/utils/toast";
import axios from "axios";
import { API_BASE_URL } from "@/utils/api";

const O = "#ff9d4d";
const O_LITE = "#FFF7ED";
const BORDER = "#e2e8f0";

const initials = (name) => (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
const avatarColor = (name) => {
  const colors = [["#DBEAFE","#1d4ed8"],["#DCFCE7","#15803d"],["#FEF3C7","#b45309"],["#FCE7F3","#be185d"],["#E0E7FF","#4338ca"]];
  const idx = (name || "").split("").reduce((a,c)=>a+c.charCodeAt(0),0) % colors.length;
  return colors[idx];
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function AdminReferredCandidateDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const referralId = params?.referralId;

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (referralId) fetchDetails(); }, [referralId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/admin/referred-candidates/${referralId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCandidate(res.data.candidate);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load referred candidate details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
      <p>Loading candidate details...</p>
    </div>
  );

  if (!candidate) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 1rem", fontSize: "1.2rem", fontWeight: 600 }}>Candidate not found</p>
        <button onClick={() => router.back()} style={{ padding: "0.5rem 1rem", backgroundColor: O, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Go Back</button>
      </div>
    </div>
  );

  const [abg, afg] = avatarColor(candidate.name);
  const skills = Array.isArray(candidate.skills) ? candidate.skills : (candidate.skills ? String(candidate.skills).split(",").map(s => s.trim()).filter(Boolean) : []);

  const infoItems = [
    { icon: Mail, label: "Email", value: candidate.email },
    { icon: Phone, label: "Phone", value: candidate.phone },
    { icon: Building2, label: "Company", value: candidate.company },
    { icon: Award, label: "Experience", value: candidate.experience ? `${candidate.experience} yrs` : null },
    { icon: Calendar, label: "Referred On", value: fmtDate(candidate.created_at) },
    { icon: Users, label: "Department", value: candidate.department },
  ].filter(f => f.value);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <button onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20, fontFamily: "inherit", padding: 0 }}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header card */}
        <div style={{ backgroundColor: "#fff", borderRadius: "1rem", padding: "1.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: abg, color: afg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
            {initials(candidate.name)}
          </div>
          <div>
            <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{candidate.name || "—"}</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, backgroundColor: "#DCFCE7", color: "#15803d", border: "1px solid #86efac" }}>
                {candidate.status || "Referred"}
              </span>
              {candidate.acceptance_status && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, backgroundColor: "#F3E8FF", color: "#7c3aed", border: "1px solid #d8b4fe" }}>
                  {candidate.acceptance_status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div style={{ backgroundColor: "#fff", borderRadius: "1rem", padding: "1.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Candidate Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {infoItems.map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, backgroundColor: "#F8FAFC", borderRadius: 12, border: `1.5px solid ${BORDER}` }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: O_LITE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={15} color={O} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          {skills.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Skills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {skills.map(s => (
                  <span key={s} style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", backgroundColor: "#F8FAFC", border: `1.5px solid ${BORDER}`, borderRadius: 999, color: "#374151" }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Referrer card */}
        <div style={{ backgroundColor: "#F3E8FF", border: "1.5px solid #d8b4fe", borderRadius: "1rem", padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <UserCheck size={18} color="#7c3aed" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Referred By</h3>
          </div>
          {candidate.referrer ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{candidate.referrer.name || "Unknown Referrer"}</div>
                {candidate.referrer.email && <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{candidate.referrer.email}</div>}
                {candidate.referrer.phone && <div style={{ fontSize: 13, color: "#64748b" }}>{candidate.referrer.phone}</div>}
                {candidate.referrer.company && <div style={{ fontSize: 13, color: "#64748b" }}>{candidate.referrer.company}</div>}
                {candidate.referrer.linkedin && (
                  <a href={candidate.referrer.linkedin} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12, color: "#0A66C2", fontWeight: 600, textDecoration: "none" }}>
                    <ExternalLink size={12} /> LinkedIn
                  </a>
                )}
              </div>
              <button onClick={() => router.push(`/admin/referrers/${candidate.referrer.id}`)}
                style={{ padding: "10px 20px", backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                View Referrer Profile →
              </button>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>No referrer information available for this candidate.</p>
          )}
        </div>
      </div>
    </div>
  );
}
