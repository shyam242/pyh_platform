"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, Users, Star, CalendarCheck, Award, TrendingUp, TrendingDown,
  ChevronRight, UploadCloud, FileEdit, Search, Sparkles, ShieldCheck, Clock,
} from "lucide-react";
import RecruiterSidebarLayout, { O, O_LITE, O_MID, BORDER } from "@/components/recruiter/RecruiterSidebarLayout";
import { API_BASE_URL } from "@/utils/api";

const getInitials = name =>
  !name ? "?" : name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

const timeAgo = iso => {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const AVATAR_COLORS = [
  ["#EFF6FF", "#1d4ed8"], ["#F3E8FF", "#7c3aed"], ["#DCFCE7", "#15803d"],
  ["#FFF7ED", "#C2410C"], ["#FDF2F8", "#DB2777"],
];
const avatarColor = name => AVATAR_COLORS[(name || "?").charCodeAt(0) % AVATAR_COLORS.length];

const STATUS_STYLE = {
  "Shortlisted":  { bg: "#EFF6FF", color: "#1d4ed8" },
  "In Process":   { bg: "#F3E8FF", color: "#7c3aed" },
  "On Hold":      { bg: "#FFF7ED", color: "#C2410C" },
  "Offer Given":  { bg: "#DCFCE7", color: "#15803d" },
};

export default function RecruiterHomePage() {
  const router = useRouter();
  const [referrals, setReferrals] = useState([]);
  const [bulkCandidates, setBulkCandidates] = useState([]);
  const [statuses, setStatuses] = useState([]); // [{source, candidate_id, status, updated_at}]
  const [jobs, setJobs] = useState([]);
  const [user, setUser] = useState(null);
  const [isApproved, setIsApproved] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/signin"; return; }

    (async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const [uRes, aRes, rRes, bRes, sRes, jRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/profile/user`, { headers }),
        fetch(`${API_BASE_URL}/api/recruiter/approval-status`, { headers }),
        fetch(`${API_BASE_URL}/api/recruiter/all`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/bulk-candidates`, { headers }),
        fetch(`${API_BASE_URL}/api/recruiter/candidate-statuses`, { headers }),
        fetch(`${API_BASE_URL}/api/jobs`),
      ]);

      if (uRes.status === "fulfilled" && uRes.value.ok) setUser(await uRes.value.json());
      if (aRes.status === "fulfilled" && aRes.value.ok) {
        const d = await aRes.value.json();
        setIsApproved(!!d.is_recruiter_approved);
      } else setIsApproved(false);
      if (rRes.status === "fulfilled" && rRes.value.ok) {
        const d = await rRes.value.json();
        setReferrals(Array.isArray(d) ? d : (d.data || []));
      }
      if (bRes.status === "fulfilled" && bRes.value.ok) {
        const d = await bRes.value.json();
        setBulkCandidates(Array.isArray(d) ? d : (d.data || []));
      }
      if (sRes.status === "fulfilled" && sRes.value.ok) {
        const d = await sRes.value.json();
        setStatuses(d.statuses || []);
      }
      if (jRes.status === "fulfilled" && jRes.value.ok) {
        setJobs(await jRes.value.json());
      }
      setLoading(false);
    })();
  }, []);

  /* ── derived data ── */
  const statusMap = useMemo(() => {
    const map = {};
    statuses.forEach(s => { map[`${s.source}:${s.candidate_id}`] = s; });
    return map;
  }, [statuses]);

  const combined = useMemo(() => [
    ...referrals.map(c => ({ ...c, source: "referred" })),
    ...bulkCandidates.map(c => ({ ...c, source: "bulk" })),
  ], [referrals, bulkCandidates]);

  const withStatus = useMemo(() => combined.map(c => ({
    ...c,
    myStatus: statusMap[`${c.source}:${c.id}`]?.status || null,
  })), [combined, statusMap]);

  const counts = useMemo(() => ({
    total: withStatus.length,
    shortlisted: withStatus.filter(c => c.myStatus === "Shortlisted").length,
    inProcess: withStatus.filter(c => c.myStatus === "In Process").length,
    onHold: withStatus.filter(c => c.myStatus === "On Hold").length,
    offers: withStatus.filter(c => c.myStatus === "Offer Given").length,
  }), [withStatus]);

  const conversionRate = counts.total ? ((counts.offers / counts.total) * 100).toFixed(1) : "0.0";

  const recentCandidates = useMemo(() => {
    return [...withStatus]
      .sort((a, b) => new Date(b.created_at || b.upload_date || 0) - new Date(a.created_at || a.upload_date || 0))
      .slice(0, 4);
  }, [withStatus]);

  const topSkills = useMemo(() => {
    const freq = {};
    withStatus.forEach(c => {
      (c.skills || "").split(",").map(s => s.trim()).filter(Boolean).forEach(s => {
        freq[s] = (freq[s] || 0) + 1;
      });
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([skill, count]) => ({ skill, count, pct: Math.round((count / max) * 100) }));
  }, [withStatus]);

  const activityFeed = useMemo(() => {
    const nameFor = (source, id) => combined.find(c => c.source === source && String(c.id) === String(id))?.name || "A candidate";
    return [...statuses]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 6)
      .map(s => ({
        text: `You marked ${nameFor(s.source, s.candidate_id)} as "${s.status}"`,
        time: s.updated_at,
      }));
  }, [statuses, combined]);

  const statCards = [
    { key: "jobs",     label: "Open Jobs",         value: jobs.length,       Icon: Briefcase,    accent: "#4F46E5", lite: "#EEF2FF", onClick: () => router.push("/recruiter/jobs") },
    { key: "total",    label: "Total Candidates",   value: counts.total,      Icon: Users,        accent: "#2563EB", lite: "#EFF6FF", onClick: () => router.push("/recruiter/candidates") },
    { key: "short",    label: "Shortlisted",        value: counts.shortlisted,Icon: Star,         accent: "#D97706", lite: "#FFFBEB", onClick: () => router.push("/recruiter/shortlisted") },
    { key: "process",  label: "In Process",         value: counts.inProcess, Icon: CalendarCheck,accent: "#7C3AED", lite: "#F5F3FF", onClick: () => router.push("/recruiter/interviews") },
    { key: "offers",   label: "Offers Made",        value: counts.offers,    Icon: Award,         accent: "#DB2777", lite: "#FDF2F8", onClick: () => router.push("/recruiter/on-hold") },
  ];

  const funnelStages = [
    { label: "Total Candidates", value: counts.total,       color: "#4F46E5" },
    { label: "Shortlisted",      value: counts.shortlisted, color: "#2563EB" },
    { label: "In Process",       value: counts.inProcess,   color: "#7C3AED" },
    { label: "Offer Given",      value: counts.offers,      color: "#DB2777" },
  ];
  const maxFunnel = Math.max(1, ...funnelStages.map(f => f.value));

  const userName = user?.name?.split(" ")[0] || "Recruiter";

  return (
    <RecruiterSidebarLayout active="dashboard">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>

        {/* ── LEFT / MAIN ── */}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>Welcome back, {userName}! 👋</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>Here's your hiring overview. Upload a JD to find the best matching candidates.</p>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 22 }}>
            {statCards.map(c => (
              <button
                key={c.key}
                onClick={c.onClick}
                style={{
                  textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  borderRadius: 14, padding: "16px 16px", backgroundColor: "#fff",
                  border: `1.5px solid ${BORDER}`, borderTop: `3px solid ${c.accent}`,
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: c.lite, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <c.Icon size={16} color={c.accent} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", lineHeight: 1, marginBottom: 5 }}>
                  {loading ? "—" : c.value}
                </div>
                <div style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 600 }}>{c.label}</div>
              </button>
            ))}
          </div>

          {/* Recent candidates + Hiring funnel */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Recent candidates */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a" }}>Recent Candidates</span>
                <span onClick={() => router.push("/recruiter/candidates")} style={{ fontSize: 12, fontWeight: 700, color: O, cursor: "pointer" }}>View all</span>
              </div>
              {loading ? (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>Loading…</p>
              ) : recentCandidates.length === 0 ? (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>No candidates yet.</p>
              ) : recentCandidates.map(c => {
                const [bg, fg] = avatarColor(c.name);
                const st = c.myStatus ? STATUS_STYLE[c.myStatus] : null;
                return (
                  <div key={`${c.source}:${c.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid #F8FAFC` }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(c.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.role || c.job_role || c.position || "—"} {c.skills ? `· ${c.skills.split(",").slice(0, 2).join(", ")}` : ""}
                      </div>
                    </div>
                    {st && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, backgroundColor: st.bg, color: st.color, flexShrink: 0 }}>{c.myStatus}</span>
                    )}
                    <span style={{ fontSize: 10.5, color: "#cbd5e1", flexShrink: 0 }}>{timeAgo(c.created_at || c.upload_date)}</span>
                    <ChevronRight size={14} color="#cbd5e1" style={{ flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>

            {/* Hiring funnel */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Hiring Funnel</div>
              {funnelStages.map(f => (
                <div key={f.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: "#64748b" }}>{f.label}</span>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>{loading ? "—" : f.value}</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, backgroundColor: "#F1F5F9" }}>
                    <div style={{ height: "100%", borderRadius: 999, backgroundColor: f.color, width: `${loading ? 0 : Math.max(4, (f.value / maxFunnel) * 100)}%`, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid #F1F5F9`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Conversion rate</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: O }}>{conversionRate}%</span>
              </div>
            </div>
          </div>

          {/* Top skills */}
          <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Top Skills in Demand</div>
            {loading ? (
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Loading…</p>
            ) : topSkills.length === 0 ? (
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Not enough candidate data yet.</p>
            ) : topSkills.map(s => (
              <div key={s.skill} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#334155", fontWeight: 600 }}>{s.skill}</span>
                  <span style={{ color: "#94a3b8" }}>{s.count}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, backgroundColor: "#F1F5F9" }}>
                  <div style={{ height: "100%", borderRadius: 999, backgroundColor: O, width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Quick actions */}
          <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Quick Actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Upload JD",         Icon: UploadCloud, accent: "#4F46E5", lite: "#EEF2FF", onClick: () => router.push("/jd-match") },
                { label: "AI JD → CV Match",  Icon: Sparkles,    accent: "#7C3AED", lite: "#F5F3FF", onClick: () => router.push("/jd-match") },
                { label: "Search Candidates", Icon: Search,      accent: "#D97706", lite: "#FFFBEB", onClick: () => router.push("/recruiter/search-by-project") },
                { label: "Experience Check",  Icon: ShieldCheck, accent: "#16A34A", lite: "#F0FDF4", onClick: () => router.push("/fake-experience-check") },
                { label: "Generate Report",   Icon: FileEdit,    accent: "#2563EB", lite: "#EFF6FF", onClick: () => router.push("/candidate-reports") },
              ].map(a => (
                <button key={a.label} onClick={a.onClick} style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, textAlign: "left",
                  padding: "12px", borderRadius: 12, border: `1.5px solid ${BORDER}`, backgroundColor: "#fff",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: a.lite, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <a.Icon size={15} color={a.accent} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", lineHeight: 1.3 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Activity Feed</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: O, cursor: "pointer" }}>View all</span>
            </div>
            {loading ? (
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Loading…</p>
            ) : activityFeed.length === 0 ? (
              <p style={{ fontSize: 13, color: "#94a3b8" }}>No recent activity yet.</p>
            ) : activityFeed.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 11, paddingBottom: 11, borderBottom: i < activityFeed.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0, backgroundColor: O }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.4 }}>{a.text}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 10.5, color: "#94a3b8" }}>{timeAgo(a.time)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Profile verification */}
          <div style={{
            backgroundColor: isApproved ? "#F0FDF4" : "#FFFBEB",
            border: `1.5px solid ${isApproved ? "#BBF7D0" : O_MID}`,
            borderRadius: 16, padding: "18px 20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {isApproved
                ? <ShieldCheck size={16} color="#16A34A" />
                : <Clock size={16} color={O} />}
              <span style={{ fontSize: 13.5, fontWeight: 700, color: isApproved ? "#15803d" : "#92400e" }}>
                {isApproved === null ? "Checking verification…" : isApproved ? "Profile Verification" : "Approval pending"}
              </span>
            </div>
            <p style={{ fontSize: 12, color: isApproved ? "#166534" : "#92400e", margin: "0 0 8px", lineHeight: 1.5 }}>
              {isApproved
                ? "Your company profile is verified."
                : "Your recruiter profile is awaiting admin review."}
            </p>
            <span onClick={() => router.push("/profile")} style={{ fontSize: 12, fontWeight: 700, color: isApproved ? "#16A34A" : O, cursor: "pointer" }}>
              View Profile →
            </span>
          </div>
        </div>
      </div>
    </RecruiterSidebarLayout>
  );
}
