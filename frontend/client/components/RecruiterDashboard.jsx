"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Check, Pause, XCircle, Users, CheckCircle2,
  Search, Filter, X, LogOut, Building2, Briefcase,
  TrendingUp, Bell, ChevronRight, Eye, Clock,
  UserCheck, Star, BarChart2, FileText, Mail, Phone, Sparkles
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#EBEBEB";

const getInitials = name =>
  !name ? "R" : name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

const timeAgo = iso => {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const STATUS = {
  shortlist: { bg: "#EAF3DE", color: "#3B6D11", border: "#97C459", label: "Shortlisted" },
  hold:      { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA", label: "On Hold" },
  reject:    { bg: "#FEF2F2", color: "#dc2626", border: "#FECACA", label: "Rejected" },
  default:   { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1", label: "New" },
};

export default function RecruiterDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState([]);
  const [bulkCandidates, setBulkCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [referredFilter, setReferredFilter] = useState("all");
  const [notifOpen, setNotifOpen] = useState(false);
  const [projectQuery, setProjectQuery] = useState("");
  const [projectResults, setProjectResults] = useState(null);
  const [projectSearching, setProjectSearching] = useState(false);
  const notifRef = useRef(null);

  // Advanced filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    location: "", preferredLocation: "", skills: "", experience: "",
    position: "", noticePeriod: "", currentCompany: "", project: "",
    education: "", degree: "", institute: "", gender: "",
    candidateFreshness: "all", jobType: "", jobMode: "", industry: "",
  });

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters({ location: "", preferredLocation: "", skills: "", experience: "", position: "", noticePeriod: "", currentCompany: "", project: "", education: "", degree: "", institute: "", gender: "", candidateFreshness: "all", jobType: "", jobMode: "", industry: "" });
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && v !== "all").length;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/signin"; return; }
    fetchAll(token);
  }, []);

  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchAll = async token => {
    await Promise.all([fetchApprovalStatus(token), fetchUser(token), fetchData(token), fetchBulkCandidates(token)]);
    setLoading(false);
  };

  const fetchUser = async token => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setUser(await r.json());
    } catch {}
  };

  const fetchApprovalStatus = async token => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/recruiter/approval-status`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setIsApproved(d.is_recruiter_approved);
    } catch { setIsApproved(false); }
  };

  const fetchData = async token => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/recruiter/all`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setData(Array.isArray(d) ? d : (d.data || []));
    } catch { setData([]); }
  };

  const fetchBulkCandidates = async token => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/bulk-candidates`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setBulkCandidates(Array.isArray(d) ? d : (d.data || []));
    } catch { setBulkCandidates([]); }
  };

  const updateStatus = async (e, id, status) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(`${API_BASE_URL}/api/recruiter/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      if (!r.ok) throw new Error("Update failed");
      showSuccess(`Marked as ${STATUS[status]?.label || status}`);
      fetchData(token);
    } catch (err) { showError(err.message); }
  };

  const downloadCV = async (e, referralId, name) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(`${API_BASE_URL}/api/recruiter/${referralId}/cv/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Download failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${name}-resume.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      // Track the view
      fetch(`${API_BASE_URL}/api/recruiter/track-view`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidateId: referralId, candidateName: name, viewType: "referral_cv" }),
      }).catch(() => {});
      showSuccess("CV downloaded!");
    } catch (err) { showError(err.message); }
  };

  const searchProjects = async () => {
    if (!projectQuery.trim()) return showError("Enter a project keyword or technology");
    setProjectSearching(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/recruiter/projects/search?query=${encodeURIComponent(projectQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setProjectResults(data.candidates);
    } catch (err) { showError(err.message); }
    finally { setProjectSearching(false); }
  };


  const combined = [
    ...data.map(c => ({ ...c, is_bulk: false })),
    ...bulkCandidates.map(c => ({ ...c, is_bulk: true })),
  ];

  const stats = {
    total: combined.length,
    shortlisted: combined.filter(c => c.status === "shortlist").length,
    onHold: combined.filter(c => c.status === "hold").length,
    rejected: combined.filter(c => c.status === "reject").length,
  };

  const filtered = combined.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (referredFilter === "referred" && !c.referrer_name) return false;
    if (referredFilter === "not_referred" && c.referrer_name) return false;
    if (searchTerm && ![c.name, c.email, c.skills, c.company, c.referrer_name].filter(Boolean).join(" ").toLowerCase().includes(searchTerm.toLowerCase())) return false;
    // Advanced filters
    const f = filters;
    const ilike = (field, val) => !val || (field || "").toLowerCase().includes(val.toLowerCase());
    if (!ilike(c.current_location, f.location)) return false;
    if (!ilike(c.preferred_location, f.preferredLocation)) return false;
    if (!ilike(c.skills, f.skills)) return false;
    if (!ilike(c.current_company_name || c.company, f.currentCompany)) return false;
    if (!ilike(c.notice_period, f.noticePeriod)) return false;
    if (!ilike(c.role || c.current_role, f.position)) return false;
    if (!ilike(c.qualification || c.highest_qualification, f.education)) return false;
    if (!ilike(c.qualification || c.highest_qualification, f.degree)) return false;
    if (f.experience) {
      const exp = parseFloat(c.experience);
      const [min, max] = f.experience.split("-").map(Number);
      if (!isNaN(exp) && !isNaN(min)) {
        if (max ? (exp < min || exp > max) : exp < min) return false;
      }
    }
    if (f.gender && c.gender && c.gender.toLowerCase() !== f.gender.toLowerCase()) return false;
    if (f.institute && !ilike(c.institute || c.college, f.institute)) return false;
    if (f.jobType && !ilike(c.job_type || c.employment_type, f.jobType)) return false;
    if (f.jobMode && !ilike(c.work_mode || c.job_mode, f.jobMode)) return false;
    if (f.industry && !ilike(c.industry, f.industry)) return false;
    if (f.project) {
      const projects = c.parsed_projects || [];
      const pArr = typeof projects === "string" ? JSON.parse(projects) : projects;
      const match = pArr.some(p =>
        [p.title, p.description, ...(p.technologies || [])].join(" ").toLowerCase().includes(f.project.toLowerCase())
      );
      if (!match) return false;
    }
    return true;
  });

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart2 },
    { id: "candidates", label: "Candidates", icon: Users },
    { id: "shortlisted", label: "Shortlisted", icon: Star },
    { id: "project-search", label: "Search by Project", icon: Search },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>

      {/* NAV */}
      <nav style={{ backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 48px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200 }}>
        <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "0.04em" }}>PICK<span style={{ color: O }}>YOUR</span>HIRE</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", backgroundColor: O_LITE, borderRadius: 999, border: `1px solid ${O_MID}` }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                {getInitials(user.name)}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</span>
            </div>
          )}
          <button onClick={() => { localStorage.removeItem("token"); window.location.href = "/signin"; }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", fontSize: 14, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 48px 64px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 28 }}>

        {/* SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Profile card */}
          {user && (
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 16px", textAlign: "center", marginBottom: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, margin: "0 auto 10px" }}>
                {getInitials(user.name)}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{user.company_name || "Recruiter"}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 10px", borderRadius: 999,
                backgroundColor: isApproved ? "#EAF3DE" : "#FFF7ED",
                color: isApproved ? "#3B6D11" : "#C2410C",
                border: `1px solid ${isApproved ? "#97C459" : "#FED7AA"}` }}>
                {isApproved ? <><UserCheck size={11} /> Approved</> : <><Clock size={11} /> Pending</>}
              </div>
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 12, display: "flex", flexDirection: "column", gap: 7, textAlign: "left" }}>
                {user.email && <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#475569" }}><Mail size={12} color={O} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span></div>}
                {user.phone && <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#475569" }}><Phone size={12} color={O} />{user.phone}</div>}
                {user.company_website && <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#475569" }}><Building2 size={12} color={O} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.company_website}</span></div>}
              </div>
            </div>
          )}

          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "none", backgroundColor: tab === id ? O_LITE : "transparent", color: tab === id ? O : "#475569", fontSize: 13, fontWeight: tab === id ? 700 : 500, cursor: "pointer", fontFamily: "inherit", borderLeft: `3px solid ${tab === id ? O : "transparent"}` }}>
              <Icon size={15} /> {label}
              {id === "shortlisted" && stats.shortlisted > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 11, backgroundColor: O, color: "#fff", borderRadius: 999, padding: "1px 7px", fontWeight: 700 }}>{stats.shortlisted}</span>
              )}
            </button>
          ))}

          {/* JD-CV Match — link to dedicated page */}
          <a href="/jd-match" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, textDecoration: "none", backgroundColor: "transparent", color: "#475569", fontSize: 13, fontWeight: 500, fontFamily: "inherit", borderLeft: "3px solid transparent", border: `1.5px dashed ${O_MID}`, marginTop: 4 }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = O_LITE; e.currentTarget.style.color = O; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#475569"; }}>
            <Sparkles size={15} /> JD ↔ CV Match <span style={{ marginLeft: "auto", fontSize: 9, backgroundColor: O, color: "#fff", borderRadius: 999, padding: "1px 6px", fontWeight: 700 }}>AI</span>
          </a>
        </div>

        {/* MAIN */}
        <div>
          {/* Pending approval banner */}
          {isApproved === false && (
            <div style={{ backgroundColor: "#FFF7ED", border: `1.5px solid #FED7AA`, borderLeft: `4px solid ${O}`, borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <Clock size={20} color={O} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#C2410C", marginBottom: 4 }}>Awaiting Admin Approval</div>
                <div style={{ fontSize: 13, color: "#92400e" }}>Your recruiter profile is under review. You'll receive an email once approved and will have full access to candidate data.</div>
              </div>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {tab === "dashboard" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Welcome back, {user?.name?.split(" ")[0] || "Recruiter"} 👋</h1>
                <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>Here's your hiring activity overview</p>
              </div>

              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                {[
                  { label: "Total Candidates", value: stats.total, icon: Users, color: "#1d4ed8", bg: "#EFF6FF" },
                  { label: "Shortlisted", value: stats.shortlisted, icon: CheckCircle2, color: "#3B6D11", bg: "#EAF3DE" },
                  { label: "On Hold", value: stats.onHold, icon: Pause, color: "#C2410C", bg: "#FFF7ED" },
                  { label: "Rejected", value: stats.rejected, icon: XCircle, color: "#dc2626", bg: "#FEF2F2" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                      <Icon size={18} color={color} />
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{loading ? "—" : value}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Recent candidates */}
              <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "16px 22px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={16} color={O} />
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Recent Candidates</span>
                  </div>
                  <button onClick={() => setTab("candidates")} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: O, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                    View all <ChevronRight size={14} />
                  </button>
                </div>
                {combined.slice(0, 5).map(c => {
                  const sc = STATUS[c.status] || STATUS.default;
                  return (
                    <div key={c.id} onClick={() => router.push(c.is_bulk ? `/bulk-candidates/${c.id}` : `/candidate-details/${c.id}`)}
                      style={{ padding: "14px 22px", borderBottom: `1px solid #F8FAFC`, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F8FAFC"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(c.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.email}</div>
                      </div>
                      {c.referrer_name && <span style={{ fontSize: 11, color: O, fontWeight: 600, backgroundColor: O_LITE, padding: "2px 9px", borderRadius: 6, border: `1px solid ${O_MID}` }}>Referred</span>}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>{sc.label}</span>
                      <ChevronRight size={14} color="#94a3b8" />
                    </div>
                  );
                })}
                {combined.length === 0 && !loading && (
                  <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    <Users size={36} color="#E5E7EB" style={{ display: "block", margin: "0 auto 10px" }} />
                    No candidates yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CANDIDATES TAB */}
          {(tab === "candidates" || tab === "shortlisted") && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{tab === "shortlisted" ? "Shortlisted Candidates" : "All Candidates"}</h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{filtered.length} candidates</p>
              </div>

              {/* Search + Filter Bar */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>
                  <Search size={15} color="#94a3b8" />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name, skills, referrer..."
                    style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", background: "transparent" }} />
                  {searchTerm && <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={14} /></button>}
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  style={{ padding: "10px 12px", border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: "#0f172a", fontFamily: "inherit", backgroundColor: "#fff", cursor: "pointer", minWidth: 150 }}>
                  <option value="all">All statuses</option>
                  <option value="shortlist">Shortlisted</option>
                  <option value="hold">On Hold</option>
                  <option value="reject">Rejected</option>
                </select>
                <select value={referredFilter} onChange={e => setReferredFilter(e.target.value)}
                  style={{ padding: "10px 12px", border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: "#0f172a", fontFamily: "inherit", backgroundColor: "#fff", cursor: "pointer", minWidth: 150 }}>
                  <option value="all">All candidates</option>
                  <option value="referred">Referred only</option>
                  <option value="not_referred">Not referred</option>
                </select>
                <button onClick={() => setShowFilters(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", border: `1.5px solid ${showFilters ? O : BORDER}`, borderRadius: 10, backgroundColor: showFilters ? O_LITE : "#fff", color: showFilters ? O : "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", position: "relative" }}>
                  <Filter size={15} /> Filters
                  {activeFilterCount > 0 && <span style={{ backgroundColor: O, color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, padding: "1px 6px", marginLeft: 2 }}>{activeFilterCount}</span>}
                </button>
              </div>

              {/* Advanced Filter Panel */}
              {showFilters && (() => {
                const Sel = ({ label, val, onChange, opts }) => (
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>{label}</label>
                    <select value={val} onChange={e => onChange(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: "#0f172a", fontFamily: "inherit", backgroundColor: "#fff", cursor: "pointer" }}>
                      <option value="">All</option>
                      {opts.map(o => <option key={o.v || o} value={o.v || o}>{o.l || o}</option>)}
                    </select>
                  </div>
                );
                const Inp = ({ label, val, onChange, ph }) => (
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>{label}</label>
                    <input value={val} onChange={e => onChange(e.target.value)} placeholder={ph || ""}
                      style={{ width: "100%", padding: "8px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                  </div>
                );
                return (
                  <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "20px 24px", marginBottom: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Advanced Filters</span>
                      {activeFilterCount > 0 && <button onClick={clearFilters} style={{ fontSize: 12, color: O, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear all ({activeFilterCount})</button>}
                    </div>

                    {/* Row 1: Location */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
                      <Inp label="Current Location" val={filters.location} onChange={v => setFilter("location", v)} ph="e.g. Delhi, Mumbai..." />
                      <Inp label="Preferred Location" val={filters.preferredLocation} onChange={v => setFilter("preferredLocation", v)} ph="e.g. Bangalore..." />
                      <Inp label="Skills" val={filters.skills} onChange={v => setFilter("skills", v)} ph="e.g. React, Python..." />
                    </div>

                    {/* Row 2: Experience, Position, Notice */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
                      <Sel label="Experience" val={filters.experience} onChange={v => setFilter("experience", v)}
                        opts={[{v:"0-1",l:"0–1 yr (Fresher)"},{v:"1-3",l:"1–3 yrs"},{v:"3-5",l:"3–5 yrs"},{v:"5-8",l:"5–8 yrs"},{v:"8-12",l:"8–12 yrs"},{v:"12",l:"12+ yrs"}]} />
                      <Inp label="Position / Role" val={filters.position} onChange={v => setFilter("position", v)} ph="e.g. Software Engineer..." />
                      <Sel label="Notice Period" val={filters.noticePeriod} onChange={v => setFilter("noticePeriod", v)}
                        opts={["Immediate","15 days","1 month","2 months","3 months","More than 3 months"]} />
                    </div>

                    {/* Row 3: Company, Project, Gender */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
                      <Inp label="Current Company" val={filters.currentCompany} onChange={v => setFilter("currentCompany", v)} ph="e.g. Infosys, TCS..." />
                      <Inp label="Project / Technology" val={filters.project} onChange={v => setFilter("project", v)} ph="e.g. React Native, ML..." />
                      <Sel label="Gender" val={filters.gender} onChange={v => setFilter("gender", v)} opts={["Male","Female","Other"]} />
                    </div>

                    {/* Row 4: Education */}
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginBottom: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>Highest Education</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                        <Sel label="Level" val={filters.education} onChange={v => setFilter("education", v)}
                          opts={["Graduation","Post Graduation","Diploma","10th","12th","PhD","Certificate"]} />
                        <Sel label="Degree" val={filters.degree} onChange={v => setFilter("degree", v)}
                          opts={["BBA","BCom","BTech","BE","MBA","BA","MA","MTech","MSc","BSc","MCA","BCA","LLB","BPharm","MBBS","BDS","CA","CS","CFA"]} />
                        <Sel label="Institute" val={filters.institute} onChange={v => setFilter("institute", v)}
                          opts={["University of Lucknow","Delhi University","SRCC","BIT Mesra","AKTU","IIM Ahmedabad","IIM Bangalore","IIM Calcutta","IIT Bombay","IIT Delhi","IIT Kanpur","IIT Kharagpur","NMIMS","SIBM","Jaypee Institute of Information Technology","Calcutta University","MAKAUT West Bengal","Jadavpur University","SRM University","Shri Ram Swaroop Memorial University","BBD University","NIT Trichy","NIT Warangal","VIT Vellore","Amity University","BITS Pilani","Symbiosis","Christ University"]} />
                      </div>
                    </div>

                    {/* Row 5: Job Preferences */}
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginBottom: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>Job Preferences</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                        <Sel label="Job Type" val={filters.jobType} onChange={v => setFilter("jobType", v)}
                          opts={["Full Time","Part Time","Temporary","Contract","Internship","Freelance","Other"]} />
                        <Sel label="Work Mode" val={filters.jobMode} onChange={v => setFilter("jobMode", v)}
                          opts={["On-site","Remote","Hybrid"]} />
                        <Sel label="Industry" val={filters.industry} onChange={v => setFilter("industry", v)}
                          opts={["IT Services & IT Consulting","Software Development","Human Resource Services","Banking & Finance","E-commerce","Healthcare","EdTech","Manufacturing","Marketing & Advertising","Legal Services","Real Estate","Logistics","Retail","Media & Entertainment","Telecom","Automotive","Government / PSU"]} />
                      </div>
                    </div>

                    {/* Row 6: Candidates Freshness */}
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>Candidate Freshness</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[{v:"all",l:"All"},{v:"new",l:"New"},{v:"week",l:"This week"},{v:"month",l:"This month"}].map(opt => (
                          <button key={opt.v} onClick={() => setFilter("candidateFreshness", opt.v)}
                            style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${filters.candidateFreshness === opt.v ? O : BORDER}`, backgroundColor: filters.candidateFreshness === opt.v ? O_LITE : "#fff", color: filters.candidateFreshness === opt.v ? O : "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* List */}
              {loading ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8", backgroundColor: "#fff", borderRadius: 14, border: `1.5px solid ${BORDER}` }}>Loading...</div>
              ) : (tab === "shortlisted" ? combined.filter(c => c.status === "shortlist") : filtered).length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", backgroundColor: "#fff", borderRadius: 14, border: `1.5px solid ${BORDER}` }}>
                  <Users size={36} color="#E5E7EB" style={{ display: "block", margin: "0 auto 10px" }} />
                  <p style={{ color: "#94a3b8", margin: 0 }}>No candidates found</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(tab === "shortlisted" ? combined.filter(c => c.status === "shortlist") : filtered).map(c => {
                    const sc = STATUS[c.status] || STATUS.default;
                    return (
                      <div key={c.id} onClick={() => router.push(c.is_bulk ? `/bulk-candidates/${c.id}` : `/candidate-details/${c.id}`)}
                        style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderLeft: `4px solid ${sc.color}`, borderRadius: 14, padding: "16px 20px", cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = O; e.currentTarget.style.boxShadow = "0 4px 16px rgba(232,119,34,0.10)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderLeftColor = sc.color; }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                            <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                              {getInitials(c.name)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{c.name}</div>
                              <div style={{ fontSize: 12, color: "#64748b" }}>{c.email}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 999, backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, flexShrink: 0 }}>{sc.label}</span>
                        </div>

                        {c.skills && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                            {c.skills.split(",").slice(0, 4).map((s, i) => (
                              <span key={i} style={{ fontSize: 11, backgroundColor: "#EFF6FF", color: "#1d4ed8", padding: "2px 9px", borderRadius: 6 }}>{s.trim()}</span>
                            ))}
                            {c.skills.split(",").length > 4 && <span style={{ fontSize: 11, color: "#94a3b8" }}>+{c.skills.split(",").length - 4}</span>}
                          </div>
                        )}

                        {c.referrer_name && (
                          <div style={{ marginTop: 10, fontSize: 12, color: "#C2410C", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ backgroundColor: O_LITE, padding: "2px 9px", borderRadius: 6 }}>Referred by {c.referrer_name}{c.referrer_company ? ` · ${c.referrer_company}` : ""}</span>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                          {[
                            { status: "shortlist", label: "Shortlist", color: "#1d4ed8", activeBg: "#EFF6FF" },
                            { status: "hold", label: "Hold", color: "#C2410C", activeBg: "#FFF7ED" },
                            { status: "reject", label: "Reject", color: "#dc2626", activeBg: "#FEF2F2" },
                          ].map(btn => (
                            <button key={btn.status} onClick={e => updateStatus(e, c.id, btn.status)}
                              style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${btn.color}`, backgroundColor: c.status === btn.status ? btn.activeBg : "#fff", color: btn.color, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                              {btn.label}
                            </button>
                          ))}
                          {!c.is_bulk && (
                            <button onClick={e => downloadCV(e, c.id, c.name)}
                              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${BORDER}`, backgroundColor: "#fff", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                              <Download size={13} /> CV
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PROJECT SEARCH TAB */}
          {tab === "project-search" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Search Candidates by Project</h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Find candidates based on AI-parsed projects from their resumes</p>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>
                  <Search size={16} color="#94a3b8" />
                  <input value={projectQuery} onChange={e => setProjectQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchProjects()}
                    placeholder="e.g. e-commerce, recommendation system, React Native, fintech..."
                    style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "inherit", background: "transparent" }} />
                </div>
                <button onClick={searchProjects} disabled={projectSearching}
                  style={{ padding: "12px 28px", backgroundColor: projectSearching ? O_LITE : O, color: projectSearching ? O : "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: projectSearching ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={15} /> {projectSearching ? "Searching..." : "Search"}
                </button>
              </div>

              {projectResults === null && (
                <div style={{ padding: "48px", textAlign: "center", backgroundColor: "#fff", borderRadius: 14, border: `1.5px solid ${BORDER}` }}>
                  <Sparkles size={36} color="#E5E7EB" style={{ display: "block", margin: "0 auto 10px" }} />
                  <p style={{ color: "#94a3b8", margin: 0 }}>Search candidates by what they've actually built — e.g. "payment gateway", "chatbot", "ML model"</p>
                </div>
              )}

              {projectResults?.length === 0 && (
                <div style={{ padding: "48px", textAlign: "center", backgroundColor: "#fff", borderRadius: 14, border: `1.5px solid ${BORDER}` }}>
                  <p style={{ color: "#94a3b8", margin: 0 }}>No candidates found with projects matching "{projectQuery}"</p>
                </div>
              )}

              {projectResults?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {projectResults.map(c => (
                    <div key={c.id} onClick={() => router.push(c.source_type === 'user' ? `/candidate-details/${c.id}?source_type=user` : `/candidate-details/${c.id}`)}
                      style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "16px 20px", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = O} onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.email} {c.experience ? `· ${c.experience} yrs` : ""}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {c.parsed_projects?.filter(p =>
                          [p.title, p.description, ...(p.technologies || [])].join(" ").toLowerCase().includes(projectQuery.toLowerCase())
                        ).map((p, i) => (
                          <div key={i} style={{ backgroundColor: "#F8FAFC", borderRadius: 9, padding: "8px 12px" }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>{p.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
