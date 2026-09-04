"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Star, CalendarCheck, Award, TrendingUp, TrendingDown,
  ChevronRight, UploadCloud, FileEdit, Search, Sparkles, ShieldCheck, Clock, Flame,
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

// Curated list of technology / tool keywords used to surface an actual "tech stack"
// signal from free-text candidate skills, instead of any comma-separated word.
const TECH_KEYWORDS = new Set([
  "javascript","typescript","react","react.js","reactjs","react native","angular","vue","vue.js",
  "node","node.js","nodejs","next.js","nextjs","express","express.js","python","java","c++","c#",
  "php","ruby","go","golang","rust","swift","kotlin","scala","sql","mysql","postgresql","postgres",
  "mongodb","nosql","aws","azure","gcp","google cloud","docker","kubernetes","git","html","css",
  "html5","css3","django","flask","fastapi","spring","spring boot",".net","dotnet","redux","graphql",
  "rest api","rest","machine learning","ml","deep learning","data science","tensorflow","pytorch",
  "devops","ci/cd","jenkins","terraform","ansible","linux","android","ios","flutter","redis","kafka",
  "elasticsearch","tableau","power bi","salesforce","sap","selenium","microservices","blockchain",
  "solidity","firebase","laravel","bootstrap","tailwind","tailwindcss","jquery","webpack","vite",
  "cybersecurity","r","sas","hadoop","spark","airflow","jira","figma",
]);

// Animated daily-activity bar strip for the "Hiring Momentum" widget — each bar
// is a day's worth of new candidates, tallest bar and today both called out.
function MomentumBars({ days, loading }) {
  const max = Math.max(1, ...days.map(d => d.count));
  const todayKey = days[days.length - 1]?.key;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 92 }}>
      {days.map(d => {
        const h = loading ? 6 : Math.max(6, Math.round((d.count / max) * 76));
        const isToday = d.key === todayKey;
        return (
          <div key={d.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: d.count ? "#0f172a" : "#cbd5e1", minHeight: 14 }}>
              {loading ? "" : d.count || ""}
            </span>
            <div
              title={`${d.count} candidate${d.count === 1 ? "" : "s"} added`}
              style={{
                width: "100%", height: h, borderRadius: 6,
                background: loading ? "#F1F5F9" : isToday ? `linear-gradient(180deg, #FDBA74, ${O})` : "#E0E7FF",
                transition: "height 0.4s ease",
              }}
            />
            <span style={{ fontSize: 10.5, fontWeight: isToday ? 700 : 600, color: isToday ? O : "#94a3b8" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function RecruiterHomePage() {
  const router = useRouter();
  const [referrals, setReferrals] = useState([]);
  const [bulkCandidates, setBulkCandidates] = useState([]);
  const [statuses, setStatuses] = useState([]); // [{source, candidate_id, status, updated_at}]
  const [user, setUser] = useState(null);
  const [isApproved, setIsApproved] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/signin"; return; }

    (async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const [uRes, aRes, rRes, bRes, sRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/profile/user`, { headers }),
        fetch(`${API_BASE_URL}/api/recruiter/approval-status`, { headers }),
        fetch(`${API_BASE_URL}/api/recruiter/all`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/bulk-candidates`, { headers }),
        fetch(`${API_BASE_URL}/api/recruiter/candidate-statuses`, { headers }),
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

  const techStack = useMemo(() => {
    const freq = {};
    withStatus.forEach(c => {
      (c.skills || "").split(",").map(s => s.trim()).filter(Boolean).forEach(s => {
        if (TECH_KEYWORDS.has(s.toLowerCase())) freq[s] = (freq[s] || 0) + 1;
      });
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([skill, count]) => ({ skill, count, pct: Math.round((count / max) * 100) }));
  }, [withStatus]);

  // Notice period spread — lets a recruiter see at a glance how many candidates
  // in the pool can join quickly vs. need a longer runway.
  const noticePeriodBreakdown = useMemo(() => {
    const buckets = { "Immediate": 0, "≤ 15 Days": 0, "≤ 30 Days": 0, "30+ Days": 0, "Not Specified": 0 };
    withStatus.forEach(c => {
      const np = (c.notice_period || "").toString().toLowerCase().trim();
      if (!np) { buckets["Not Specified"]++; return; }
      if (np.includes("immediate")) { buckets["Immediate"]++; return; }
      const num = parseInt(np.replace(/[^0-9]/g, ""), 10);
      if (isNaN(num)) { buckets["Not Specified"]++; }
      else if (num === 0) buckets["Immediate"]++;
      else if (num <= 15) buckets["≤ 15 Days"]++;
      else if (num <= 30) buckets["≤ 30 Days"]++;
      else buckets["30+ Days"]++;
    });
    const max = Math.max(1, ...Object.values(buckets));
    return Object.entries(buckets)
      .map(([label, count]) => ({ label, count, pct: Math.round((count / max) * 100) }))
      .filter(b => b.count > 0);
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

  // ── Weekly hiring momentum: candidates added per day, last 7 vs previous 7 days ──
  const momentum = useMemo(() => {
    const DAY = 24 * 60 * 60 * 1000;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dayKey = d => new Date(d).toISOString().slice(0, 10);

    const buckets = {};
    for (let i = 6; i >= 0; i--) buckets[dayKey(today.getTime() - i * DAY)] = 0;

    let thisWeek = 0, lastWeek = 0;
    withStatus.forEach(c => {
      const raw = c.created_at || c.upload_date;
      if (!raw) return;
      const t = new Date(raw).getTime();
      const daysAgo = Math.floor((today.getTime() - new Date(dayKey(t)).getTime()) / DAY);
      if (daysAgo >= 0 && daysAgo <= 6) { thisWeek++; const k = dayKey(t); if (k in buckets) buckets[k]++; }
      else if (daysAgo >= 7 && daysAgo <= 13) lastWeek++;
    });

    const days = Object.entries(buckets).map(([k, count]) => ({
      key: k, count,
      label: new Date(k + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
    }));
    const trendPct = lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    const busiest = days.reduce((a, b) => (b.count > a.count ? b : a), days[0]);

    return { days, thisWeek, lastWeek, trendPct, busiest };
  }, [withStatus]);

  const statCards = [
    { key: "total",    label: "Total Candidates",   value: counts.total,      Icon: Users,        accent: "#2563EB", lite: "#EFF6FF", onClick: () => router.push("/recruiter/candidates") },
    { key: "short",    label: "Shortlisted",        value: counts.shortlisted,Icon: Star,         accent: "#D97706", lite: "#FFFBEB", onClick: () => router.push("/recruiter/shortlisted") },
    { key: "process",  label: "In Process",         value: counts.inProcess, Icon: CalendarCheck,accent: "#7C3AED", lite: "#F5F3FF", onClick: () => router.push("/recruiter/interviews") },
    { key: "offers",   label: "Offers Made",        value: counts.offers,    Icon: Award,         accent: "#DB2777", lite: "#FDF2F8", onClick: () => router.push("/recruiter/on-hold") },
  ];

  const userName = user?.name?.split(" ")[0] || "Recruiter";

  return (
    <RecruiterSidebarLayout active="dashboard">
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 300px)", gap: 24, alignItems: "start" }}>

        {/* ── LEFT / MAIN ── */}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 23, fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>Welcome back, {userName}! 👋</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>Here's your hiring overview. Upload a JD to find the best matching candidates.</p>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
            {statCards.map(c => (
              <button
                key={c.key}
                onClick={c.onClick}
                style={{
                  textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  borderRadius: 14, padding: "18px 18px", backgroundColor: "#fff",
                  border: `1.5px solid ${BORDER}`, borderTop: `3px solid ${c.accent}`,
                  transition: "box-shadow 0.15s, transform 0.15s", minWidth: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: c.lite, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <c.Icon size={17} color={c.accent} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", lineHeight: 1, marginBottom: 6 }}>
                  {loading ? "—" : c.value}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{c.label}</div>
              </button>
            ))}
          </div>

          {/* Recent candidates + Hiring momentum */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1.2fr) minmax(280px, 1fr)", gap: 16, marginBottom: 16 }}>
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

            {/* Hiring momentum — dynamic weekly activity, not a static funnel */}
            <div style={{
              backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                  <Flame size={15} color={O} /> Hiring Momentum
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: "#0f172a" }}>{loading ? "—" : momentum.thisWeek}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>candidates this week</span>
                {!loading && (
                  <span style={{
                    marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, fontSize: 11.5, fontWeight: 700,
                    color: momentum.trendPct >= 0 ? "#16A34A" : "#DC2626",
                    backgroundColor: momentum.trendPct >= 0 ? "#F0FDF4" : "#FEF2F2",
                    padding: "3px 8px", borderRadius: 999,
                  }}>
                    {momentum.trendPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(momentum.trendPct)}% vs last week
                  </span>
                )}
              </div>

              <MomentumBars days={momentum.days} loading={loading} />

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid #F1F5F9`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.5 }}>
                  {!loading && momentum.busiest?.count > 0
                    ? <>🔥 Busiest day: <strong style={{ color: "#0f172a" }}>{momentum.busiest.label}</strong> ({momentum.busiest.count} added)</>
                    : "No new candidates added this week yet."}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: O, whiteSpace: "nowrap" }}>{conversionRate}% → offers</span>
              </div>
            </div>
          </div>

          {/* Tech stack + notice period */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Top Tech Stack in Demand</div>
              {loading ? (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>Loading…</p>
              ) : techStack.length === 0 ? (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>No recognizable tech-stack data in the candidate pool yet.</p>
              ) : techStack.map(s => (
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

            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Notice Period Spread</div>
              {loading ? (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>Loading…</p>
              ) : noticePeriodBreakdown.length === 0 ? (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>No candidate data yet.</p>
              ) : noticePeriodBreakdown.map(b => (
                <div key={b.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "#334155", fontWeight: 600 }}>{b.label}</span>
                    <span style={{ color: "#94a3b8" }}>{b.count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, backgroundColor: "#F1F5F9" }}>
                    <div style={{ height: "100%", borderRadius: 999, backgroundColor: "#7C3AED", width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "10px 0 0", lineHeight: 1.5 }}>
                Handy for spotting who can join quickly when a role needs to be filled urgently.
              </p>
            </div>
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
