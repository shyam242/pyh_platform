"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus, Edit2, Bell, Settings, Bookmark, Eye,
  Filter, Clock, ShieldCheck, Briefcase, Send, Sparkles,
  ChevronRight, User, Trash2, LogOut, CheckCircle,
  TrendingUp, MapPin, Activity, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/utils/toast";

/* ── design tokens ────────────────────────────────────────────── */
const O      = "#E87722";
const O_LITE = "#FFF3E8";
const O_MID  = "#FBBF7A";
const BORDER = "#EBEBEB";

/* ── helpers ──────────────────────────────────────────────────── */
const getInitials = name =>
  !name ? "U" : name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

const calcCompletion = p => {
  if (!p) return 0;
  const fields = ["name","email","verified","skills","image_url","job_role","contact"];
  return Math.round(fields.filter(f => p[f]).length / fields.length * 100);
};

const parseSkills = raw => {
  if (!raw) return [];
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; }
  catch { return typeof raw === "string" ? raw.split(",").map(s => s.trim()).filter(Boolean) : []; }
};

const timeAgo = iso => {
  if (!iso) return "recently";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

/* ── Notification Bell ────────────────────────────────────────── */
function NotificationBell({ notifications, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: 44, height: 44, borderRadius: 10,
        border: `1.5px solid ${open ? O : BORDER}`,
        backgroundColor: open ? O_LITE : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: open ? O : "#64748b", position: "relative",
        transition: "all 0.15s",
      }}>
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 9, right: 9,
            width: 9, height: 9, borderRadius: "50%",
            backgroundColor: O, border: "2px solid #fff",
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          width: 340, backgroundColor: "#fff",
          border: `1.5px solid ${BORDER}`, borderRadius: 14,
          boxShadow: "0 12px 40px rgba(0,0,0,0.10)", zIndex: 400, overflow: "hidden",
        }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid #F1F5F9`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              Notifications {unread > 0 && <span style={{ color: O }}>({unread})</span>}
            </span>
            {notifications.length > 0 && (
              <button onClick={onClear} style={{ fontSize: 12, color: O, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: "36px 18px", textAlign: "center", fontSize: 14, color: "#94a3b8" }}>
              No notifications yet
            </div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {notifications.map(n => (
                <div key={n.id} style={{
                  padding: "14px 18px", borderBottom: `1px solid #F8FAFC`,
                  backgroundColor: n.read ? "#fff" : O_LITE,
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, backgroundColor: n.type === "job" ? O_LITE : "#EAF3DE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {n.type === "job" ? <Briefcase size={16} color={O} /> : <CheckCircle size={16} color="#3B6D11" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{n.title}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{n.body}</p>
                    <p style={{ margin: "5px 0 0", fontSize: 11, color: "#94a3b8" }}>{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: O, flexShrink: 0, marginTop: 5 }} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Settings Panel ───────────────────────────────────────────── */
function SettingsPanel({ onDeleteProfile }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setConfirmDelete(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: 44, height: 44, borderRadius: 10,
        border: `1.5px solid ${open ? O : BORDER}`,
        backgroundColor: open ? O_LITE : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: open ? O : "#64748b", transition: "all 0.15s",
      }}>
        <Settings size={18} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          width: 252, backgroundColor: "#fff",
          border: `1.5px solid ${BORDER}`, borderRadius: 14,
          boxShadow: "0 12px 40px rgba(0,0,0,0.10)", zIndex: 400, overflow: "hidden",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid #F1F5F9` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Account settings</span>
          </div>
          {[
            { label: "Edit profile", icon: <Edit2 size={15} />, href: "/candidate-profile/edit" },
            { label: "View profile", icon: <User size={15} />, href: "/candidate-profile" },
          ].map(item => (
            <a key={item.label} href={item.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", fontSize: 14, color: "#0f172a", textDecoration: "none", borderBottom: `1px solid #F1F5F9` }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = O_LITE)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span style={{ color: O }}>{item.icon}</span>{item.label}
            </a>
          ))}
          <button
            onClick={() => { localStorage.removeItem("token"); window.location.href = "/signin"; }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", fontSize: 14, color: "#64748b", background: "none", border: "none", cursor: "pointer", borderBottom: `1px solid #F1F5F9`, fontFamily: "inherit", textAlign: "left" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <LogOut size={15} /> Sign out
          </button>
          <div style={{ padding: "12px 14px" }}>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", fontSize: 13, color: "#ef4444", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                <Trash2 size={14} /> Delete account
              </button>
            ) : (
              <div>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
                  Permanently deletes your account. Cannot be undone.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setOpen(false); setConfirmDelete(false); onDeleteProfile(); }} style={{ flex: 1, padding: "8px", fontSize: 12, fontWeight: 700, backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}>
                    Confirm
                  </button>
                  <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: "8px", fontSize: 12, backgroundColor: "#F1F5F9", color: "#64748b", border: "none", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function CandidateDashboard() {
  const router = useRouter();
  const [jobs, setJobs]                     = useState([]);
  const [jobLoading, setJobLoading]         = useState(true);
  const [profile, setProfile]               = useState(null);
  const [imagePreview, setImagePreview]     = useState(null);
  const [appliedCount, setAppliedCount]     = useState(0);
  const [filterRole, setFilterRole]         = useState("");
  const [filterExp, setFilterExp]           = useState("");
  const [filterLoc, setFilterLoc]           = useState("");
  const [filterSal, setFilterSal]           = useState("");
  const [savedJobs, setSavedJobs]           = useState([]);
  const [showSavedOnly, setShowSavedOnly]   = useState(false);
  const [notifications, setNotifications]   = useState([]);
  const [prevJobIds, setPrevJobIds]         = useState(null);
  const [activity, setActivity]             = useState([]);

  /* ── boot ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/signin"; return; }
    try { const s = localStorage.getItem("pyh_saved_jobs"); if (s) setSavedJobs(JSON.parse(s)); } catch {}
    try { const a = localStorage.getItem("pyh_activity"); if (a) setActivity(JSON.parse(a)); } catch {}
    fetchAll(token);
  }, []);

  /* ── poll for new jobs every 30 s ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const id = setInterval(() => fetchJobsSilent(token), 30000);
    return () => clearInterval(id);
  }, [prevJobIds]);

  /* ── fetch helpers ── */
  const fetchAll = t => Promise.all([fetchJobs(t), fetchProfile(t), fetchApplied(t)]);

  const fetchJobs = async t => {
    setJobLoading(true);
    try {
      const r = await fetch("http://localhost:5000/api/jobs", { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) {
        const list = (await r.json()) || [];
        const data = Array.isArray(list) ? list : [];
        setJobs(data);
        setPrevJobIds(data.map(j => j.id || j._id));
      }
    } catch {}
    finally { setJobLoading(false); }
  };

  const fetchJobsSilent = async t => {
    try {
      const r = await fetch("http://localhost:5000/api/jobs", { headers: { Authorization: `Bearer ${t}` } });
      if (!r.ok) return;
      const data = Array.isArray(await r.json()) ? await r.json() : [];
      if (prevJobIds !== null) {
        const fresh = data.filter(j => !prevJobIds.includes(j.id || j._id));
        if (fresh.length) {
          setNotifications(p => [
            ...fresh.map(j => ({ id: `job-${j.id||j._id}-${Date.now()}`, type: "job", title: "New job posted", body: j.job_title || "A new opening is available", createdAt: new Date().toISOString(), read: false })),
            ...p,
          ]);
          setJobs(data);
          setPrevJobIds(data.map(j => j.id || j._id));
        }
      }
    } catch {}
  };

  const fetchProfile = async t => {
    try {
      const r = await fetch("http://localhost:5000/api/profile/user", { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) { const d = await r.json(); setProfile(d); setImagePreview(d.image_url || null); }
    } catch {}
  };

  const fetchApplied = async t => {
    try {
      const r = await fetch("http://localhost:5000/api/jobs/applied/count", { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) { const d = await r.json(); setAppliedCount(d.appliedCount || 0); }
    } catch {}
  };

  /* ── actions ── */
  const addActivity = (text, type = "action") => {
    const entry = { id: Date.now(), text, type, time: new Date().toISOString() };
    setActivity(p => { const next = [entry, ...p].slice(0, 12); localStorage.setItem("pyh_activity", JSON.stringify(next)); return next; });
  };

  const toggleSave = (id, title) => {
    setSavedJobs(p => {
      const isSaved = p.includes(id);
      const next = isSaved ? p.filter(x => x !== id) : [...p, id];
      localStorage.setItem("pyh_saved_jobs", JSON.stringify(next));
      if (!isSaved) addActivity(`Saved job: ${title}`, "save");
      return next;
    });
  };

  const deleteProfile = async () => {
    try {
      const t = localStorage.getItem("token");
      const r = await fetch("http://localhost:5000/api/profile/candidate", { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.error || "Failed to delete"); }
      localStorage.removeItem("token");
      showSuccess("Account deleted.");
      router.push("/signin");
    } catch (err) { showError(err.message || "Failed to delete"); }
  };

  /* ── derived ── */
  const profileSkills = parseSkills(profile?.skills);
  const completion    = calcCompletion(profile);
  const userName      = profile?.name || "Candidate";
  const userInit      = getInitials(userName);
  const hasFilters    = filterRole || filterExp || filterLoc || filterSal || showSavedOnly;

  const filteredJobs = jobs.filter(job => {
    const id = job.id || job._id;
    if (showSavedOnly && !savedJobs.includes(id)) return false;
    if (filterRole && !job.job_title?.toLowerCase().includes(filterRole.toLowerCase())) return false;
    if (filterExp  && !job.experience_required?.toLowerCase().includes(filterExp.toLowerCase())) return false;
    if (filterLoc  && !job.location?.toLowerCase().includes(filterLoc.toLowerCase())) return false;
    if (filterSal  && !(job.salary_range || "").toLowerCase().includes(filterSal.toLowerCase())) return false;
    return true;
  });

  const clearFilters = () => { setFilterRole(""); setFilterExp(""); setFilterLoc(""); setFilterSal(""); setShowSavedOnly(false); };

  const STAT_CARDS = [
    { label: "Total jobs",     value: jobs.length,                                    badge: `${Math.max(0,jobs.length-appliedCount)} new`, style: "primary", Icon: Briefcase },
    { label: "Applied",        value: appliedCount,                                   badge: "In review",                                   style: "light",   Icon: Send },
    { label: "Profile status", value: profile?.verified ? "Verified" : "Pending",     badge: profile?.verified ? "Active" : "Incomplete",   style: profile?.verified ? "green" : "warn", Icon: ShieldCheck },
    { label: "Skills added",   value: profileSkills.length,                           badge: "Manage",                                      style: "light",   Icon: Sparkles },
  ];

  /* ══ RENDER ══════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#0f172a", fontSize: 15 }}>

      {/* ── NAV (single, sticky, white) ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 200,
        backgroundColor: "#ffffff",
        borderBottom: `1.5px solid ${BORDER}`,
        padding: "0 48px", height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "0.04em", color: "#0f172a" }}>
          PICK<span style={{ color: O }}>YOUR</span>HIRE
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NotificationBell
            notifications={notifications}
            onClear={() => setNotifications(p => p.map(n => ({ ...n, read: true })))}
          />
          <SettingsPanel onDeleteProfile={deleteProfile} />

          {/* Clicking name opens profile page */}
          <div
            onClick={() => router.push("/candidate-profile")}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 18px 8px 8px",
              border: `1.5px solid ${BORDER}`, borderRadius: 999,
              cursor: "pointer", backgroundColor: "#fff",
              transition: "border-color 0.15s, background 0.15s",
              userSelect: "none",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = O_MID; e.currentTarget.style.backgroundColor = O_LITE; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.backgroundColor = "#fff"; }}
            title="View your profile"
          >
            {imagePreview
              ? <img src={imagePreview} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
              : <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{userInit}</div>
            }
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{userName}</span>
          </div>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <div style={{ padding: "36px 48px 64px", maxWidth: 1280, margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#0f172a" }}>Candidate dashboard</h1>
            <p style={{ fontSize: 15, color: "#64748b", marginTop: 6 }}>
              Welcome back, <strong style={{ color: "#0f172a" }}>{userName}</strong> — {filteredJobs.length} {showSavedOnly ? "saved" : "open"} job{filteredJobs.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 36 }}>
          {STAT_CARDS.map(({ label, value, badge, style, Icon }) => {
            const isPrimary = style === "primary";
            const isGreen   = style === "green";
            const bg  = isPrimary ? O          : isGreen ? "#EAF3DE" : O_LITE;
            const bdr = isPrimary ? "none"     : `1.5px solid ${isGreen ? "#97C459" : O_MID}`;
            const lc  = isPrimary ? "rgba(255,255,255,0.85)" : isGreen ? "#3B6D11" : "#B35500";
            const vc  = isPrimary ? "#fff"     : isGreen ? "#3B6D11" : "#7A3600";
            const bbc = isPrimary ? "rgba(255,255,255,0.28)" : isGreen ? "#C0DD97" : "#FFD9B0";
            return (
              <div key={label} style={{ borderRadius: 16, padding: "22px 24px", backgroundColor: bg, border: bdr, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 20, right: 20, opacity: 0.18, color: isPrimary ? "#fff" : O }}>
                  <Icon size={34} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: lc, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: typeof value === "string" && value.length > 5 ? 22 : 36, fontWeight: 700, color: vc, lineHeight: 1 }}>{value}</div>
                <span style={{ display: "inline-block", width: "fit-content", marginTop: 12, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 999, backgroundColor: bbc, color: isPrimary ? "#fff" : isGreen ? "#3B6D11" : "#7A3600" }}>{badge}</span>
              </div>
            );
          })}
        </div>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 28 }}>

          {/* LEFT — job list */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{showSavedOnly ? "Saved jobs" : "Open jobs"}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => setShowSavedOnly(v => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 9,
                    border: `1.5px solid ${showSavedOnly ? O_MID : BORDER}`,
                    backgroundColor: showSavedOnly ? O_LITE : "#fff",
                    fontSize: 14, fontWeight: 600, color: showSavedOnly ? "#B35500" : "#64748b", cursor: "pointer",
                  }}
                  onMouseEnter={e => { if (!showSavedOnly) { e.currentTarget.style.borderColor = O_MID; e.currentTarget.style.backgroundColor = O_LITE; } }}
                  onMouseLeave={e => { if (!showSavedOnly) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.backgroundColor = "#fff"; } }}
                >
                  <Bookmark size={15} fill={showSavedOnly ? O : "none"} stroke={showSavedOnly ? O : "#64748b"} />
                  Saved ({savedJobs.length})
                </button>
                <span style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>
                  {jobLoading ? "Loading..." : `${filteredJobs.length} of ${jobs.length} jobs`}
                </span>
              </div>
            </div>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 18 }}>
              {showSavedOnly ? "Jobs you have bookmarked." : "Browse the latest openings that match your skills."}
            </p>

            {/* Filter bar */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px", marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Filter size={15} color={O} /> Filter jobs
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                {[
                  { label: "Job role",     placeholder: "e.g. React Developer", value: filterRole, set: setFilterRole },
                  { label: "Experience",   placeholder: "e.g. 2-3 years",        value: filterExp,  set: setFilterExp  },
                  { label: "Location",     placeholder: "e.g. Remote",           value: filterLoc,  set: setFilterLoc  },
                  { label: "Salary range", placeholder: "e.g. 50L-75L",          value: filterSal,  set: setFilterSal  },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6, fontWeight: 600 }}>{f.label}</label>
                    <input
                      style={{ width: "100%", padding: "10px 13px", fontSize: 14, border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#FAFAFA", color: "#0f172a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                      placeholder={f.placeholder} value={f.value}
                      onChange={e => f.set(e.target.value)}
                      onFocus={e => (e.target.style.borderColor = O)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                ))}
              </div>
              {hasFilters && (
                <button onClick={clearFilters} style={{ marginTop: 14, padding: "8px 18px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#F8FAFC", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                  Clear filters x
                </button>
              )}
            </div>

            {/* Jobs */}
            {jobLoading ? (
              <div style={{ padding: "40px", backgroundColor: "#fff", borderRadius: 14, border: `1.5px solid ${BORDER}`, textAlign: "center", color: "#94a3b8", fontSize: 15 }}>
                Loading available jobs...
              </div>
            ) : filteredJobs.length === 0 ? (
              <div style={{ padding: "40px", backgroundColor: "#fff", borderRadius: 14, border: `1.5px solid ${BORDER}`, textAlign: "center", color: "#64748b", fontSize: 15 }}>
                {showSavedOnly ? "You have not saved any jobs yet. Click the bookmark on a job to save it." : jobs.length === 0 ? "No job openings right now. Check back soon." : "No jobs match your filters."}
              </div>
            ) : filteredJobs.map(job => {
              const id = job.id || job._id || job.job_title;
              const isSaved = savedJobs.includes(id);
              return (
                <div key={id} style={{
                  backgroundColor: "#fff", border: `1.5px solid ${BORDER}`,
                  borderLeft: `4px solid ${O}`, borderRadius: 14,
                  padding: "22px 24px", marginBottom: 16,
                }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{job.job_title || job.title || "Untitled role"}</div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 13px", borderRadius: 999, border: `1px solid ${BORDER}`, color: "#64748b", backgroundColor: "#F8FAFC" }}>{job.location || "Remote"}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 13px", borderRadius: 999, border: "1px solid #97C459", color: "#3B6D11", backgroundColor: "#EAF3DE" }}>{job.job_type || "Full-time"}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>{job.department || "General"}</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    {[["Experience", job.experience_required || "Not specified"], ["Salary", job.salary_range || "Not disclosed"]].map(([k, v]) => (
                      <div key={k} style={{ backgroundColor: "#F8FAFC", borderRadius: 10, padding: "12px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 5 }}>{k}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, marginBottom: 18 }}>
                    {(job.job_description || "No description available.").slice(0, 240)}
                    {(job.job_description || "").length > 240 ? "..." : ""}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={14} /> Posted {job.posted_at || "recently"}
                    </span>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => toggleSave(id, job.job_title)}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${isSaved ? O_MID : BORDER}`, backgroundColor: isSaved ? O_LITE : "#F8FAFC", color: isSaved ? "#B35500" : "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        <Bookmark size={15} fill={isSaved ? O : "none"} stroke={isSaved ? O : "#64748b"} />
                        {isSaved ? "Saved" : "Save"}
                      </button>
                      <button
                        onClick={() => { const jid = job.id || job._id; if (jid) { addActivity(`Viewed: ${job.job_title}`, "view"); router.push(`/jobs/${jid}`); } }}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", borderRadius: 9, backgroundColor: O, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 3px 10px rgba(232,119,34,0.25)" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#C0601A")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = O)}
                      >
                        <Eye size={15} /> View details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT — sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Profile strength */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={17} color={O} /> Profile strength
              </div>
              {[
                { label: "Completion",  value: `${completion}%`,                         pct: completion,                           hi: true  },
                { label: "Skills",      value: `${profileSkills.length} added`,           pct: Math.min(100, profileSkills.length * 20), hi: false },
                { label: "Experience",  value: profile?.job_role ? "Complete" : "Pending", pct: profile?.job_role ? 100 : 0,         hi: false },
                { label: "Verified",    value: profile?.verified ? "Yes" : "No",          pct: profile?.verified ? 100 : 0,          hi: false },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: "#64748b" }}>{row.label}</span>
                    <span style={{ color: row.hi ? O : "#64748b", fontWeight: row.hi ? 700 : 500 }}>{row.value}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, backgroundColor: "#F1F5F9" }}>
                    <div style={{ height: "100%", borderRadius: 999, backgroundColor: row.pct === 100 && !row.hi ? "#3B6D11" : O, width: `${row.pct}%`, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* My skills */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={17} color={O} /> My skills
              </div>
              {profileSkills.length === 0
                ? <p style={{ fontSize: 13, color: "#94a3b8" }}>No skills added yet.</p>
                : profileSkills.map(s => (
                  <span key={s} style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 600, padding: "5px 13px", borderRadius: 999, margin: "3px 3px", backgroundColor: O_LITE, color: "#B35500", border: `1px solid ${O_MID}` }}>
                    {s}
                  </span>
                ))
              }
              <span
                onClick={() => router.push("/candidate-profile/edit")}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "5px 13px", borderRadius: 999, margin: "3px 3px", backgroundColor: O_LITE, color: "#B35500", border: `1px solid ${O_MID}`, cursor: "pointer" }}
              >
                <Plus size={11} /> Add skill
              </span>
            </div>

            {/* Recent activity */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={17} color={O} /> Recent activity
              </div>
              {activity.length === 0 ? (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>No activity yet. Start browsing jobs.</p>
              ) : activity.slice(0, 6).map(act => (
                <div key={act.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid #F8FAFC` }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", marginTop: 4, flexShrink: 0, backgroundColor: act.type === "save" ? "#3B6D11" : O }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.text}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: "#94a3b8" }}>{timeAgo(act.time)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <ChevronRight size={17} color={O} /> Quick links
              </div>
              {[
                { label: "View my profile",  action: () => router.push("/candidate-profile") },
                { label: "Edit profile",     action: () => router.push("/candidate-profile/edit") },
                { label: "Saved jobs",       count: savedJobs.length, action: () => setShowSavedOnly(v => !v) },
              ].map(item => (
                <div
                  key={item.label}
                  onClick={item.action}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid #F8FAFC`, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#0f172a", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = O)}
                  onMouseLeave={e => (e.currentTarget.style.color = "#0f172a")}
                >
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span style={{ backgroundColor: O_LITE, color: "#B35500", fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 999 }}>{item.count}</span>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}