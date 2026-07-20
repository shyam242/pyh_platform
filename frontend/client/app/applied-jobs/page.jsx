"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Send, Eye, Star, CheckCircle2, Filter, ChevronDown,
  Sparkles, Search, Bell, X,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api";

const O      = "#E87722";
const O_LITE = "#FFF3E8";
const O_MID  = "#FBBF7A";
const BORDER = "#EBEBEB";

const STAGES = ["applied", "in_review", "shortlisted", "interview", "offered"];
const STAGE_LABELS = { applied: "Application", in_review: "Under review", shortlisted: "Shortlisted", interview: "Interview", offered: "Offered" };

const STATUS_META = {
  applied:     { label: "Applied",     bg: "#EFF6FF", fg: "#1d4ed8" },
  in_review:   { label: "In review",   bg: "#EAF3DE", fg: "#3B6D11" },
  shortlisted: { label: "Shortlisted", bg: O_LITE,    fg: "#B35500" },
  interview:   { label: "Interview",   bg: "#FEF3C7", fg: "#92400E" },
  offered:     { label: "Offered",     bg: "#DBEAFE", fg: "#1E40AF" },
  rejected:    { label: "Rejected",    bg: "#FEF2F2", fg: "#B91C1C" },
};

const DONUT_COLORS = {
  in_review: "#3B82F6", shortlisted: "#A855F7", interview: "#F59E0B", offered: "#22C55E", rejected: "#EF4444",
};

function timeAgo(iso) {
  if (!iso) return "recently";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StageTrack({ status }) {
  const idx = status === "rejected" ? -1 : STAGES.indexOf(status);
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 14, marginBottom: 4 }}>
      {STAGES.map((stage, i) => {
        const done = i <= idx;
        return (
          <div key={stage} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? 1 : "0 0 auto" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 20 }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                backgroundColor: done ? "#EAF3DE" : "#F1F5F9",
                border: `1.5px solid ${done ? "#3B6D11" : "#CBD5E1"}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {done && <CheckCircle2 size={12} color="#3B6D11" />}
              </div>
              <span style={{ fontSize: 10, color: done ? "#3B6D11" : "#94a3b8", fontWeight: done ? 700 : 500, marginTop: 5, whiteSpace: "nowrap" }}>
                {STAGE_LABELS[stage]}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div style={{ flex: 1, height: 2, backgroundColor: i < idx ? "#97C459" : "#E5E7EB", marginBottom: 16 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AppliedJobsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent");
  const [showBanner, setShowBanner] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/signin"); return; }
    fetchApplications(token);
    fetchProfile(token);
  }, []);

  const fetchApplications = async (token) => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/jobs/applied/list`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setApplications((await r.json()) || []);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchProfile = async (token) => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/profile/user`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setProfile(await r.json());
    } catch {}
  };

  const counts = {
    total: applications.length,
    in_review: applications.filter(a => a.status === "in_review" || a.status === "applied").length,
    shortlisted: applications.filter(a => a.status === "shortlisted").length,
    interview: applications.filter(a => a.status === "interview").length,
    offered: applications.filter(a => a.status === "offered").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  const donutRows = [
    { key: "in_review",   label: "In review",   color: DONUT_COLORS.in_review,   value: counts.in_review },
    { key: "shortlisted", label: "Shortlisted", color: DONUT_COLORS.shortlisted, value: counts.shortlisted },
    { key: "interview",   label: "Interview",   color: DONUT_COLORS.interview,   value: counts.interview },
    { key: "offered",     label: "Offered",     color: DONUT_COLORS.offered,     value: counts.offered },
    { key: "rejected",    label: "Rejected",    color: DONUT_COLORS.rejected,    value: counts.rejected },
  ];
  const donutTotal = Math.max(1, counts.total);

  // build conic-gradient string for the donut
  let acc = 0;
  const gradientParts = donutRows.filter(r => r.value > 0).map(r => {
    const start = (acc / donutTotal) * 360;
    acc += r.value;
    const end = (acc / donutTotal) * 360;
    return `${r.color} ${start}deg ${end}deg`;
  });
  const donutBg = counts.total === 0 ? "#F1F5F9" : `conic-gradient(${gradientParts.join(", ")})`;

  const sorted = [...applications].sort((a, b) => {
    if (sortBy === "recent") return new Date(b.applied_at) - new Date(a.applied_at);
    if (sortBy === "oldest") return new Date(a.applied_at) - new Date(b.applied_at);
    if (sortBy === "title") return (a.job_title || "").localeCompare(b.job_title || "");
    return 0;
  });

  const profileSkillsCount = (() => {
    if (!profile?.skills) return 0;
    try { const s = typeof profile.skills === "string" ? JSON.parse(profile.skills) : profile.skills; return Array.isArray(s) ? s.length : 0; }
    catch { return 0; }
  })();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#0f172a", fontSize: 15 }}>
      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 200, backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 48px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button onClick={() => router.push("/dashboard")} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 9, border: `1.5px solid ${BORDER}`, backgroundColor: "#fff", cursor: "pointer" }}>
            <ArrowLeft size={16} color="#475569" />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>Candidate dashboard</span>
        </div>
        <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "0.04em", color: "#0f172a" }}>
          PICK<span style={{ color: O }}>YOUR</span>HIRE
        </span>
      </nav>

      <div style={{ padding: "28px 48px 64px", maxWidth: 1280, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 14 }}>
          <span onClick={() => router.push("/dashboard")} style={{ cursor: "pointer" }}>Dashboard</span>
          <span style={{ margin: "0 6px" }}>›</span>
          <span style={{ color: O, fontWeight: 600 }}>Applied jobs</span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#0f172a" }}>Applied jobs</h1>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 6, marginBottom: 26 }}>Track the status of jobs you've applied to.</p>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 22 }}>
          {[
            { label: "Total applied", value: counts.total,      Icon: Send,        bg: O_LITE, fg: "#B35500" },
            { label: "In review",     value: counts.in_review,  Icon: Eye,         bg: "#EFF6FF", fg: "#1d4ed8" },
            { label: "Shortlisted",   value: counts.shortlisted,Icon: Star,        bg: "#F3E8FF", fg: "#7E22CE" },
            { label: "Interview",     value: counts.interview,  Icon: CheckCircle2,bg: "#EAF3DE", fg: "#3B6D11" },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <c.Icon size={16} color={c.fg} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{c.label}</span>
              </div>
              <span style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>{c.value}</span>
            </div>
          ))}
        </div>

        {/* Complete profile banner */}
        {showBanner && (
          <div style={{ backgroundColor: O_LITE, border: `1.5px solid ${O_MID}`, borderRadius: 14, padding: "16px 22px", marginBottom: 22, display: "flex", alignItems: "center", gap: 14 }}>
            <Sparkles size={20} color={O} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#7A3600" }}>Complete your profile to get better recommendations</div>
              <div style={{ fontSize: 13, color: "#B35500", marginTop: 2 }}>A complete profile helps our system match you with the most relevant opportunities.</div>
            </div>
            <button onClick={() => router.push("/candidate-profile/edit")} style={{ padding: "9px 18px", borderRadius: 9, backgroundColor: O, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              Complete profile
            </button>
            <button onClick={() => setShowBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#B35500", padding: 4 }}>
              <X size={16} />
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>
          {/* LEFT — applications list */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#475569" }}>
                <Filter size={14} /> Filter
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>Sort by:</span>
                <select
                  value={sortBy} onChange={e => setSortBy(e.target.value)}
                  style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "7px 12px", backgroundColor: "#fff", fontFamily: "inherit", cursor: "pointer" }}
                >
                  <option value="recent">Most recent</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Job title</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14 }}>Loading applications...</div>
            ) : sorted.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14 }}>
                <p style={{ color: "#64748b", marginBottom: 14 }}>You haven't applied to any jobs yet.</p>
                <button onClick={() => router.push("/dashboard")} style={{ padding: "10px 22px", borderRadius: 9, backgroundColor: O, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Search jobs</button>
              </div>
            ) : sorted.map(app => {
              const meta = STATUS_META[app.status] || STATUS_META.applied;
              return (
                <div key={app.application_id} style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: O_LITE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, color: O }}>
                        {(app.job_title || "J").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{app.job_title}</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                          {app.department || "General"} {app.location ? `· ${app.location}` : ""} {app.job_type ? `· ${app.job_type}` : ""}
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Posted {timeAgo(app.applied_at)}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 13px", borderRadius: 999, backgroundColor: meta.bg, color: meta.fg }}>{meta.label}</span>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>Applied on {fmtDate(app.applied_at)}</div>
                    </div>
                  </div>

                  <StageTrack status={app.status} />

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                    <button
                      onClick={() => router.push(`/jobs/${app.job_id}`)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, border: `1.5px solid ${BORDER}`, backgroundColor: "#F8FAFC", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      View details <ChevronDown size={13} style={{ transform: "rotate(-90deg)" }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT — sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Application status donut */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Application status</div>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{
                  width: 96, height: 96, borderRadius: "50%", background: donutBg,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{counts.total}</span>
                    <span style={{ fontSize: 9, color: "#94a3b8" }}>Total</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  {donutRows.map(r => (
                    <div key={r.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: r.color }} /> {r.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{r.value} ({counts.total ? Math.round((r.value / counts.total) * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tips */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: O }}>Tips to improve your chances</div>
              {[
                { label: "Add more skills to your profile", cta: "Add skills", pct: profileSkillsCount, min: 5, href: "/candidate-profile/skills" },
                { label: "Add your experience details",     cta: "Add experience", done: !!profile?.job_role, href: "/candidate-profile/edit" },
                { label: "Verify your email",                cta: "Verified", done: true, href: null },
                { label: "Add education details",           cta: "Add education", done: !!profile?.highest_qualification, href: "/candidate-profile/edit" },
              ].map(tip => {
                const isDone = tip.done !== undefined ? tip.done : tip.pct >= tip.min;
                return (
                  <div key={tip.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #F8FAFC" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
                      <CheckCircle2 size={14} color={isDone ? "#3B6D11" : "#CBD5E1"} /> {tip.label}
                    </span>
                    {tip.href && !isDone ? (
                      <span onClick={() => router.push(tip.href)} style={{ fontSize: 12, fontWeight: 700, color: O, backgroundColor: O_LITE, padding: "4px 11px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap" }}>{tip.cta}</span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#3B6D11" }}>{isDone ? "✓" : tip.cta}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Looking for more jobs */}
            <div style={{ backgroundColor: O_LITE, border: `1.5px solid ${O_MID}`, borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#7A3600" }}>Looking for more jobs?</div>
              <p style={{ fontSize: 13, color: "#B35500", marginBottom: 14 }}>Update your preferences and get personalized job recommendations.</p>
              <button onClick={() => router.push("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, backgroundColor: O, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Search size={14} /> Search jobs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
