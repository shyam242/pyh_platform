"use client";

import { useState } from "react";
import {
  ArrowLeft, Mail, Phone, MapPin, Download, ExternalLink, Star,
  Briefcase, Building2, BookOpen, Award, TrendingUp, User, Users,
  CheckCircle2, Sparkles, FileText, StickyNote, Send, Clock, Linkedin,
} from "lucide-react";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#EBEBEB";

const getInitials = name =>
  !name ? "?" : name.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase();

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "skills", label: "Skills Match" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "summary", label: "Summary" },
  { key: "cv", label: "CV Preview" },
];

function Pill({ children, color = "gray" }) {
  const colors = {
    blue: { bg: "#eff6ff", text: "#1d4ed8" },
    purple: { bg: "#f0f4ff", text: "#4338ca" },
    green: { bg: "#f0fdf4", text: "#16a34a" },
    orange: { bg: O_LITE, text: "#C2410C" },
    gray: { bg: "#f3f4f6", text: "#4b5563" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{ padding: "4px 12px", background: c.bg, color: c.text, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function Card({ title, children, style }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px", ...style }}>
      {title && (
        <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={13} color="#6b7280" />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 10.5, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#111827", fontWeight: 500, wordBreak: "break-word" }}>{value || "Not provided"}</p>
      </div>
    </div>
  );
}

/** Compact "Referred by" card — the only place referral origin is ever shown to a recruiter. */
export function ReferredByCard({ referrerName, referrerRole, referrerCompany, onViewProfile, onDownload, accent = "orange" }) {
  const accents = {
    orange: { bg: "#FFF3E8", icon: "#C2410C", iconBg: "#FEE2C7" },
    green: { bg: "#F0FDF4", icon: "#15803D", iconBg: "#DCFCE7" },
    pink: { bg: "#FDF2F8", icon: "#BE185D", iconBg: "#FCE7F3" },
    blue: { bg: "#EFF6FF", icon: "#1D4ED8", iconBg: "#DBEAFE" },
  };
  const c = accents[accent] || accents.orange;
  return (
    <div style={{ background: c.bg, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: c.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={15} color={c.icon} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#6b7280" }}>Referred by</p>
          <p style={{ margin: "2px 0 0", fontSize: 13.5, fontWeight: 700, color: "#111827" }}>
            {referrerName} {referrerRole && <span style={{ fontWeight: 500, color: "#6b7280" }}>· {referrerRole}</span>}
          </p>
        </div>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 11.5, color: "#6b7280" }}>
        Source: Employee Referral{referrerCompany ? ` · ${referrerCompany}` : ""}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onViewProfile && (
          <button onClick={onViewProfile} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "#fff", color: "#111827", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            View Profile
          </button>
        )}
        {onDownload && (
          <button onClick={onDownload} title="Download CV" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Download size={14} color="#6b7280" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Unified recruiter-facing candidate detail view.
 * NOTE: intentionally never renders anything about how the candidate was sourced
 * (bulk upload, referral, etc.) except the "Referred by" card, and never exposes
 * an edit affordance — recruiters can view and act on candidates, not modify them.
 */
export default function CandidateDetailView({
  candidate,
  statusLabel,
  matchScore,
  matchLabel,
  matchAnalyzedAt,
  matchWhyShortlist = [],
  matchConcerns = [],
  onBack,
  onDownloadCV,
  downloading,
  onShortlist,
  shortlisted,
  onSendEmail,
  onAddNotes,
  referrer,
}) {
  const [tab, setTab] = useState("overview");

  const skills = {
    core: candidate.core_skills || (candidate.skills ? candidate.skills.split(",").map(s => s.trim()).filter(Boolean) : []),
    technical: candidate.technical_skills ? candidate.technical_skills.split(",").map(s => s.trim()).filter(Boolean) : [],
    soft: candidate.soft_skills ? candidate.soft_skills.split(",").map(s => s.trim()).filter(Boolean) : [],
  };
  const allSkills = [...skills.core, ...skills.technical];

  return (
    <div style={{ minHeight: "100%", background: "#f8f9fc", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${BORDER}`, padding: "0 32px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {candidate.hasCv && (
              <button
                onClick={onDownloadCV}
                disabled={downloading}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: downloading ? "#f3f4f6" : "#fff", color: downloading ? "#9ca3af" : "#374151", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: downloading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                <Download size={14} /> {downloading ? "Downloading…" : "Download CV"}
              </button>
            )}
            {onShortlist && (
              <button
                onClick={onShortlist}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: shortlisted ? "#DCFCE7" : O, color: shortlisted ? "#15803D" : "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                <Star size={14} /> {shortlisted ? "Shortlisted" : "Shortlist"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 32px 56px" }}>
        {/* Hero */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px 26px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: O_LITE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              {candidate.imageUrl ? (
                <img src={candidate.imageUrl} alt={candidate.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 20, fontWeight: 700, color: "#C2410C" }}>{getInitials(candidate.name)}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: "#0f172a" }}>{candidate.name}</h1>
                {matchLabel && <Pill color="green">{matchLabel}</Pill>}
                {statusLabel && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600 }}>
                    <CheckCircle2 size={12} /> {statusLabel}
                  </span>
                )}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#6b7280" }}>{candidate.role || "Role not specified"}</p>
              {candidate.location && (
                <p style={{ margin: "4px 0 0", display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#94a3b8" }}>
                  <MapPin size={12} /> {candidate.location}
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10 }}>
                {candidate.email && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#6b7280" }}><Mail size={12} /> {candidate.email}</span>}
                {candidate.phone && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#6b7280" }}><Phone size={12} /> {candidate.phone}</span>}
                {candidate.linkedin && (
                  <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#1d4ed8", textDecoration: "none" }}>
                    <Linkedin size={12} /> LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, marginTop: 20, paddingTop: 18, borderTop: `1px solid #f3f4f6`, flexWrap: "wrap" }}>
            <StatInline label="Experience" value={candidate.experience ? `${candidate.experience} yrs` : null} />
            <StatInline label="Current CTC" value={candidate.currentCtc} />
            <StatInline label="Expected CTC" value={candidate.expectedCtc} />
            <StatInline label="Notice Period" value={candidate.noticePeriod} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: `1.5px solid ${BORDER}`, marginBottom: 22, overflowX: "auto" }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                color: tab === t.key ? O : "#94a3b8",
                borderBottom: tab === t.key ? `2.5px solid ${O}` : "2.5px solid transparent",
                marginBottom: -1.5,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {tab === "overview" && (
              <>
                {allSkills.length > 0 && (
                  <Card title="Key Skills">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {allSkills.map((s, i) => <Pill key={i} color={i % 2 ? "blue" : "purple"}>{s}</Pill>)}
                    </div>
                  </Card>
                )}
                <Card title="Experience Summary">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                    <InfoRow icon={Clock} label="Total Experience" value={candidate.experience ? `${candidate.experience} yrs` : null} />
                    <InfoRow icon={Briefcase} label="Current Role" value={candidate.role} />
                    <InfoRow icon={Building2} label="Current Company" value={candidate.currentCompany} />
                    <InfoRow icon={TrendingUp} label="Reason for Change" value={candidate.reasonForChange} />
                  </div>
                </Card>
                <Card title="About">
                  <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
                    {candidate.about || `${candidate.name?.split(" ")[0] || "This candidate"} has ${candidate.experience ? `${candidate.experience} years of` : ""} experience${candidate.role ? ` as a ${candidate.role}` : ""}${candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""}.`}
                  </p>
                </Card>
              </>
            )}

            {tab === "skills" && (
              matchScore != null ? (
                <Card title={`JD Match Score${matchLabel ? ` — ${matchLabel}` : ""}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                    <div style={{ fontSize: 40, fontWeight: 700, color: O }}>{matchScore}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {matchAnalyzedAt && <>Analyzed {new Date(matchAnalyzedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>}
                    </div>
                  </div>
                  {matchWhyShortlist.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>Why shortlist</p>
                      {matchWhyShortlist.map((w, i) => <p key={i} style={{ margin: "0 0 4px", fontSize: 12.5, color: "#374151" }}>• {w}</p>)}
                    </div>
                  )}
                  {matchConcerns.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#C2410C", textTransform: "uppercase" }}>Concerns</p>
                      {matchConcerns.map((w, i) => <p key={i} style={{ margin: "0 0 4px", fontSize: 12.5, color: "#374151" }}>• {w}</p>)}
                    </div>
                  )}
                </Card>
              ) : (
                <Card>
                  <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>No JD match analysis has been run for this candidate yet. Use "JD → CV Match" to score them against a job description.</p>
                </Card>
              )
            )}

            {tab === "experience" && (
              <Card title="Professional Details">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                  <InfoRow icon={Building2} label="Current Company" value={candidate.currentCompany} />
                  <InfoRow icon={Briefcase} label="Role" value={candidate.role} />
                  <InfoRow icon={MapPin} label="Current Location" value={candidate.location} />
                  <InfoRow icon={MapPin} label="Preferred Location" value={candidate.preferredLocation} />
                  <InfoRow icon={Award} label="Offer in Hand" value={candidate.offerInHand} />
                  <InfoRow icon={TrendingUp} label="Reason for Change" value={candidate.reasonForChange} />
                </div>
                {(skills.technical.length > 0 || skills.soft.length > 0) && (
                  <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16, marginTop: 6 }}>
                    {skills.technical.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ margin: "0 0 7px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>Technical Skills</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{skills.technical.map((s, i) => <Pill key={i} color="blue">{s}</Pill>)}</div>
                      </div>
                    )}
                    {skills.soft.length > 0 && (
                      <div>
                        <p style={{ margin: "0 0 7px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>Soft Skills</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{skills.soft.map((s, i) => <Pill key={i} color="green">{s}</Pill>)}</div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

            {tab === "education" && (
              <Card title="Education">
                <InfoRow icon={BookOpen} label="Highest Qualification" value={candidate.qualification} />
              </Card>
            )}

            {tab === "summary" && (
              <Card title="Summary">
                {matchWhyShortlist.length === 0 && matchConcerns.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>No AI-generated summary available yet for this candidate.</p>
                ) : (
                  <>
                    {matchWhyShortlist.map((w, i) => <p key={i} style={{ margin: "0 0 6px", fontSize: 13, color: "#374151" }}>• {w}</p>)}
                    {matchConcerns.map((w, i) => <p key={i} style={{ margin: "0 0 6px", fontSize: 13, color: "#C2410C" }}>• {w}</p>)}
                  </>
                )}
              </Card>
            )}

            {tab === "cv" && (
              <Card title="CV Preview">
                {candidate.hasCv ? (
                  candidate.cvPreviewUrl ? (
                    <iframe src={candidate.cvPreviewUrl} title="CV Preview" style={{ width: "100%", height: 560, border: `1px solid ${BORDER}`, borderRadius: 10 }} />
                  ) : (
                    <button onClick={onDownloadCV} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: O, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      <Download size={14} /> Download CV to view
                    </button>
                  )
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>No CV on file for this candidate.</p>
                )}
              </Card>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card title="Contact Information">
              <InfoRow icon={Mail} label="Email" value={candidate.email} />
              <InfoRow icon={Phone} label="Phone" value={candidate.phone} />
              {candidate.linkedin && (
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ExternalLink size={13} color="#6b7280" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 10.5, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>LinkedIn</p>
                    <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 500 }}>View Profile</a>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Actions">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {onShortlist && (
                  <button onClick={onShortlist} style={actionBtnStyle()}>
                    <Star size={14} /> {shortlisted ? "Shortlisted" : "Add to Shortlist"}
                  </button>
                )}
                {onSendEmail && (
                  <button onClick={onSendEmail} style={actionBtnStyle()}>
                    <Send size={14} /> Send Email
                  </button>
                )}
                {onAddNotes && (
                  <button onClick={onAddNotes} style={actionBtnStyle()}>
                    <StickyNote size={14} /> Add Notes
                  </button>
                )}
              </div>
            </Card>

            {referrer && (
              <ReferredByCard
                referrerName={referrer.name}
                referrerRole={referrer.role}
                referrerCompany={referrer.company}
                onDownload={candidate.hasCv ? onDownloadCV : undefined}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatInline({ label, value }) {
  return (
    <div>
      <p style={{ margin: "0 0 2px", fontSize: 10.5, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>{value || "—"}</p>
    </div>
  );
}

const actionBtnStyle = () => ({
  display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#f8f9fc",
  border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#374151",
  cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left",
});
