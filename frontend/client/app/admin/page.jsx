"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Users, Briefcase, UserCheck, LogOut, Trash2, Upload,
  ChevronDown, ChevronRight, X, Info, Megaphone, ShieldCheck,
  UserPlus, Zap, BarChart2, ArrowLeft, Home
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#E2E8F0";
const CARD = { backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "24px" };

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboardData, setDashboardData] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [referrers, setReferrers] = useState([]);
  const [pendingRecruiters, setPendingRecruiters] = useState([]);
  const [approvedRecruiters, setApprovedRecruiters] = useState([]);
  const [incentiveForm, setIncentiveForm] = useState({ referrerId: "", value: "" });
  const [loading, setLoading] = useState(true);
  const [uploadingJobs, setUploadingJobs] = useState(false);
  const [uploadingCandidates, setUploadingCandidates] = useState(false);
  const [editingReferrerId, setEditingReferrerId] = useState(null);
  const [editingIncentiveValue, setEditingIncentiveValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedRecruiterId, setExpandedRecruiterId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [bulkCandidates, setBulkCandidates] = useState([]);
  const [candidateStatusStats, setCandidateStatusStats] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedCard, setExpandedCard] = useState(null);
  const [resumeLinks, setResumeLinks] = useState("");
  const [parsingResumes, setParsingResumes] = useState(false);
  const [parseResults, setParseResults] = useState(null);

  // ── Keyboard shortcuts ──────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (!e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
    switch (e.key.toLowerCase()) {
      case "c": e.preventDefault(); setActiveTab("bulk-candidates"); break;
      case "j": e.preventDefault(); window.location.href = "/admin/post-job"; break;
      case "r": e.preventDefault(); setActiveTab("pending-recruiters"); fetchPendingRecruiters(); break;
      case "p": e.preventDefault(); setActiveTab("resume-parse"); break;
      case "v": e.preventDefault(); window.location.href = "/admin/bulk-candidates"; break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => { fetchDashboardData(); fetchJobs(); }, []);
  useEffect(() => {
    if (activeTab === "recruiters") fetchApprovedRecruiters();
    if (activeTab === "incentives") fetchReferrers();
    if (activeTab === "candidates") fetchDashboardData();
    if (activeTab === "jobs-list") fetchJobs();
    if (activeTab === "manage-status") { fetchBulkCandidates(); fetchCandidateStatusStats(); }
  }, [activeTab]);

  // ── Data fetchers ──────────────────────────────────────────
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      setDashboardData(r.data.dashboard);
      setCandidates(r.data.candidates);
      setPendingRecruiters(r.data.pendingRecruiters);
      setLoading(false);
    } catch { showError("Failed to load dashboard"); setLoading(false); }
  };
  const fetchReferrers = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/admin/referrers`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setReferrers(r.data);
    } catch { showError("Failed to load referrers"); }
  };
  const fetchApprovedRecruiters = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/admin/users/recruiter`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const list = Array.isArray(r.data) ? r.data : (r.data.data || r.data.users || []);
      setApprovedRecruiters(list.filter(x => x.is_recruiter_approved || x.is_recruiter_approved === "t"));
    } catch { showError("Failed to load recruiters"); }
  };
  const fetchJobs = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/jobs/admin/my-jobs`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setJobs(Array.isArray(r.data) ? r.data : []);
    } catch { showError("Failed to load jobs"); }
  };
  const fetchBulkCandidates = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/admin/bulk-candidates`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setBulkCandidates(r.data);
    } catch { showError("Failed to load candidates"); }
  };
  const fetchCandidateStatusStats = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/admin/candidate-status-stats`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setCandidateStatusStats(r.data);
    } catch { showError("Failed to load status stats"); }
  };
  const fetchPendingRecruiters = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setPendingRecruiters(r.data.pendingRecruiters || []);
    } catch { showError("Failed to load pending recruiters"); }
  };

  // ── Actions ────────────────────────────────────────────────
  const handleUpdateCandidateStatus = async (id, status) => {
    try {
      setUpdatingStatus(id);
      await axios.put(`${API_BASE_URL}/api/admin/bulk-candidates/${id}/status`, { candidate_status: status }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess(`Status updated to ${status}`);
      fetchBulkCandidates(); fetchCandidateStatusStats();
    } catch { showError("Failed to update status"); } finally { setUpdatingStatus(null); }
  };
  const handleSelectJob = (id) => {
    const n = new Set(selectedJobs);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelectedJobs(n);
    setSelectAll(n.size === jobs.length && jobs.length > 0);
  };
  const handleSelectAll = () => {
    if (selectAll) { setSelectedJobs(new Set()); setSelectAll(false); }
    else { setSelectedJobs(new Set(jobs.map(j => j.id))); setSelectAll(true); }
  };
  const handleDeleteSelectedJobs = async () => {
    if (!selectedJobs.size) { showError("No jobs selected"); return; }
    if (!confirm(`Delete ${selectedJobs.size} job(s)?`)) return;
    try {
      const r = await axios.post(`${API_BASE_URL}/api/jobs/admin/bulk-delete`, { jobIds: Array.from(selectedJobs) }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (!r.data.deletedCount) { showError(r.data.message || "No jobs deleted"); return; }
      showSuccess(`${r.data.deletedCount} job(s) deleted`);
      setSelectedJobs(new Set()); setSelectAll(false); fetchJobs();
    } catch { showError("Failed to delete jobs"); }
  };
  const handleJobStatusChange = async (id, status) => {
    try {
      await axios.put(`${API_BASE_URL}/api/jobs/${id}`, { status }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess(`Job updated to ${status}`); fetchJobs();
    } catch { showError("Failed to update job"); }
  };
  const handleApproveRecruiter = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/api/admin/recruiters/${id}/approve`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess("Recruiter approved"); fetchDashboardData();
    } catch { showError("Failed to approve"); }
  };
  const handleRejectRecruiter = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/api/admin/recruiters/${id}/reject`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess("Recruiter rejected"); fetchDashboardData();
    } catch { showError("Failed to reject"); }
  };
  const handleDeleteCandidate = async (id) => {
    if (!confirm("Remove this candidate? Cannot be undone.")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/candidates/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess("Candidate removed"); fetchDashboardData();
    } catch { showError("Failed to remove candidate"); }
  };
  const handleUpdateIncentive = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/api/admin/incentives/${incentiveForm.referrerId}`, { incentive_value: incentiveForm.value }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess("Incentive updated"); setIncentiveForm({ referrerId: "", value: "" });
      if (activeTab === "incentives") fetchReferrers();
    } catch { showError("Failed to update incentive"); }
  };
  const handleRevokeIncentive = async (id) => {
    if (!confirm("Revoke this incentive?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/incentives/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess("Incentive revoked"); fetchReferrers(); setEditingReferrerId(null);
    } catch { showError("Failed to revoke"); }
  };
  const handleQuickEditIncentive = async (id) => {
    if (!editingIncentiveValue) { showError("Enter incentive value"); return; }
    try {
      await axios.put(`${API_BASE_URL}/api/admin/incentives/${id}`, { incentive_value: editingIncentiveValue }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess("Incentive updated"); fetchReferrers(); setEditingReferrerId(null); setEditingIncentiveValue("");
    } catch { showError("Failed to update"); }
  };

  const parseCSV = (text) => {
    const lines = []; let cur = ""; let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (c === '"') { if (inQ && n === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === "\n" && !inQ) { if (cur.trim()) lines.push(cur); cur = ""; }
      else cur += c;
    }
    if (cur.trim()) lines.push(cur);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).map(line => {
      const vals = []; let v = ""; let iq = false;
      for (let j = 0; j < line.length; j++) {
        const c = line[j], n = line[j + 1];
        if (c === '"') { if (iq && n === '"') { v += '"'; j++; } else iq = !iq; }
        else if (c === "," && !iq) { vals.push(v.trim().replace(/^"|"$/g, "")); v = ""; }
        else v += c;
      }
      vals.push(v.trim().replace(/^"|"$/g, ""));
      const obj = {}; headers.forEach((h, i) => obj[h] = vals[i] || "");
      return Object.values(obj).some(x => x !== "") ? obj : null;
    }).filter(Boolean);
  };

  const handleBulkUploadJobs = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const jobs = parseCSV(await file.text());
      if (!jobs.length) { showError("No valid jobs in CSV"); return; }
      setUploadingJobs(true);
      const r = await axios.post(`${API_BASE_URL}/api/admin/bulk-upload/jobs`, { jobs }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess(`${r.data.createdCount} jobs created`);
      if (r.data.errors) showError("Some rows failed: " + r.data.errors.slice(0, 3).join(", "));
      e.target.value = ""; if (activeTab === "jobs-list") fetchJobs();
    } catch { showError("Failed to upload jobs"); } finally { setUploadingJobs(false); }
  };
  const handleBulkUploadCandidates = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.name.endsWith(".csv")) { showError("Please upload a CSV file"); return; }
    try {
      setUploadingCandidates(true);
      const fd = new FormData(); fd.append("csvFile", file);
      const r = await axios.post(`${API_BASE_URL}/api/admin/bulk-upload/csv`, fd, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "multipart/form-data" } });
      showSuccess(`${r.data.uploadedCount} candidates uploaded`);
      if (r.data.errors?.length) showError("Some rows had issues: " + r.data.errors.slice(0, 3).join("; "));
      e.target.value = ""; fetchDashboardData();
    } catch { showError("Failed to upload candidates"); } finally { setUploadingCandidates(false); }
  };
  const handleBulkParseResumes = async () => {
    const links = resumeLinks.split("\n").map(l => l.trim()).filter(l => l.startsWith("http"));
    if (!links.length) { showError("Enter at least one valid URL"); return; }
    if (links.length > 50) { showError("Max 50 links per batch"); return; }
    try {
      setParsingResumes(true); setParseResults(null);
      const r = await axios.post(`${API_BASE_URL}/api/admin/bulk-upload/resume-links`, { resume_links: links }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setParseResults(r.data);
      if (r.data.parsedCount > 0) showSuccess(`${r.data.parsedCount} resume(s) parsed`);
      if (r.data.errorCount > 0) showError(`${r.data.errorCount} resume(s) failed`);
    } catch { showError("Failed to parse resumes"); } finally { setParsingResumes(false); }
  };
  const handleLogout = () => { localStorage.removeItem("token"); window.location.href = "/signin"; };

  // ── Shared UI helpers ──────────────────────────────────────
  const BackBtn = ({ label = "Back to Overview", onClick }) => (
    <button
      onClick={onClick || (() => setActiveTab("overview"))}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", fontSize: 13, color: "#475569", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, marginBottom: 22 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = O; e.currentTarget.style.color = O; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#475569"; }}>
      <Home size={13} /> {label}
    </button>
  );

  const TabHeader = ({ title, subtitle }) => (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 3px", color: "#0f172a" }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{subtitle}</p>}
    </div>
  );

  // ── Loading ────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid ${O}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#64748b", fontWeight: 600 }}>Loading Dashboard…</p>
      </div>
    </div>
  );

  // ── Nav items ──────────────────────────────────────────────
  const NAV_ITEMS = [
    { id: "overview", label: "🏠 Overview" },
    { id: "candidates", label: "👥 Candidates" },
    { id: "manage-status", label: "📋 Candidate Status" },
    { id: "pending-recruiters", label: "⏳ Pending Recruiters" },
    { id: "recruiters", label: "✅ Approved Recruiters" },
    { id: "incentives", label: "💰 Incentives" },
    { id: "jobs-list", label: "💼 All Jobs" },
    { id: "jobs", label: "➕ Post Job" },
    { id: "bulk-jobs", label: "📤 Bulk Jobs" },
    { id: "bulk-candidates", label: "📂 Bulk Candidates" },
    { id: "resume-parse", label: "🤖 AI Resume Parser" },
    { id: "resume-views", label: "📊 Resume Analytics", isLink: "/admin/resume-views" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── NAVBAR ───────────────────────────────────────── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 200, backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 40px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <button onClick={() => setActiveTab("overview")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "0.03em", color: "#0f172a" }}>
            PICK<span style={{ color: O }}>YOUR</span>HIRE
            <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginLeft: 8, background: "#F1F5F9", padding: "3px 9px", borderRadius: 6 }}>Admin</span>
          </span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Menu dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", border: `1.5px solid ${O}`, borderRadius: 9, backgroundColor: "#fff", color: O, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Menu <ChevronDown size={14} style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {dropdownOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, minWidth: 230, boxShadow: "0 12px 32px rgba(0,0,0,0.12)", overflow: "hidden", zIndex: 1000 }}>
                {NAV_ITEMS.map(item => (
                  <button key={item.id}
                    onClick={() => {
                      if (item.isLink) { window.location.href = item.isLink; return; }
                      setActiveTab(item.id); setDropdownOpen(false);
                      if (item.id === "incentives") fetchReferrers();
                      if (item.id === "recruiters") fetchApprovedRecruiters();
                      if (item.id === "pending-recruiters") fetchPendingRecruiters();
                      if (item.id === "jobs-list") fetchJobs();
                      if (item.id === "manage-status") { fetchBulkCandidates(); fetchCandidateStatusStats(); }
                    }}
                    style={{ width: "100%", padding: "11px 18px", border: "none", borderLeft: `3px solid ${activeTab === item.id ? O : "transparent"}`, backgroundColor: activeTab === item.id ? O_LITE : "#fff", color: activeTab === item.id ? O : "#374151", textAlign: "left", cursor: "pointer", fontSize: 13, fontWeight: activeTab === item.id ? 700 : 400, fontFamily: "inherit", transition: "all 0.15s" }}
                    onMouseEnter={e => { if (activeTab !== item.id) e.currentTarget.style.backgroundColor = "#F8FAFC"; }}
                    onMouseLeave={e => { if (activeTab !== item.id) e.currentTarget.style.backgroundColor = "#fff"; }}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Logout */}
          <button onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", border: "none", borderRadius: 9, backgroundColor: O, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 2px 8px ${O}44` }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#d4671e"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = O}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 40px 64px" }}
        onClick={() => dropdownOpen && setDropdownOpen(false)}>

        {/* ── OVERVIEW ──────────────────────────────────── */}
        {activeTab === "overview" && dashboardData && (() => {
          const topReferrer = referrers.reduce((t, r) => (!t || (r.referral_count || 0) > (t.referral_count || 0)) ? r : t, null);
          const cards = [
            { id: "candidates", label: "Total Candidates", value: dashboardData.totalCandidates, change: "+20%", icon: Users, iconBg: "#EFF6FF", iconColor: "#1d4ed8", viewLabel: "View all candidates", viewHref: () => setActiveTab("candidates"), details: [{ label: "Active", value: candidates.filter(c => c.status !== "rejected").length }, { label: "New This Month", value: dashboardData.newCandidatesThisMonth ?? "—" }, { label: "Shortlisted", value: dashboardData.shortlistedCandidates ?? "—" }, { label: "Rejected", value: dashboardData.rejectedCandidates ?? "—" }], detailLinkLabel: "View all candidates", detailLinkHref: () => setActiveTab("candidates"), labelColor: "#1d4ed8" },
            { id: "referrers", label: "Total Referrers", value: dashboardData.totalReferrers, change: "+25%", icon: Users, iconBg: "#DCFCE7", iconColor: "#15803d", viewLabel: "View all referrers", viewHref: () => { window.location.href = "/admin/referrers"; }, details: [{ label: "Active Referrers", value: referrers.filter(r => (r.referral_count || 0) > 0).length || "—" }, { label: "New This Month", value: dashboardData.newReferrersThisMonth ?? "—" }, { label: "Inactive", value: referrers.filter(r => !(r.referral_count > 0)).length || "—" }, { label: "Top Referrer", value: topReferrer?.name?.split(" ")[0] || "—" }], detailLinkLabel: "View all referrers", detailLinkHref: () => { window.location.href = "/admin/referrers"; }, labelColor: "#15803d" },
            { id: "recruiters", label: "Recruiters (Approved)", value: dashboardData.approvedRecruiters, change: "+100%", icon: ShieldCheck, iconBg: "#F3E8FF", iconColor: "#7c3aed", viewLabel: "View all recruiters", viewHref: () => setActiveTab("recruiters"), details: [{ label: "Pending Approval", value: pendingRecruiters.length }, { label: "Approved", value: dashboardData.approvedRecruiters }, { label: "Rejected", value: dashboardData.rejectedRecruiters ?? "—" }, { label: "Total", value: (pendingRecruiters.length || 0) + (dashboardData.approvedRecruiters || 0) }], detailLinkLabel: "View all recruiters", detailLinkHref: () => setActiveTab("recruiters"), labelColor: "#7c3aed" },
            { id: "referrals", label: "Total Referrals", value: dashboardData.totalReferrals, change: "+30%", icon: Megaphone, iconBg: "#FFF7ED", iconColor: O, viewLabel: "View all referrals", viewHref: () => setActiveTab("candidates"), details: [{ label: "Successful", value: dashboardData.successfulReferrals ?? "—" }, { label: "Pending", value: dashboardData.pendingReferrals ?? "—" }, { label: "Expired", value: dashboardData.expiredReferrals ?? "—" }, { label: "Conversion Rate", value: dashboardData.conversionRate ? `${dashboardData.conversionRate}%` : "—" }], detailLinkLabel: "View all referrals", detailLinkHref: () => setActiveTab("candidates"), labelColor: O },
          ];
          return (
            <div>
              {/* Hero banner */}
              <div style={{ background: "linear-gradient(135deg, #f8fafc 0%, #fff7ed 100%)", border: `1.5px solid ${BORDER}`, borderRadius: 18, padding: "26px 32px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ fontSize: 23, fontWeight: 800, margin: "0 0 5px", color: "#0f172a" }}>Dashboard Overview</h2>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Manage your platform efficiently from this comprehensive dashboard</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {[["Alt+C", "Add Candidates"], ["Alt+J", "Post Job"], ["Alt+R", "Recruiters"], ["Alt+P", "AI Parser"], ["Alt+V", "CV Add"]].map(([k, l]) => (
                      <span key={k} style={{ fontSize: 11, padding: "3px 10px", backgroundColor: "#fff", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#64748b" }}>
                        <strong>{k}</strong> {l}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ width: 68, height: 68, borderRadius: 18, background: `linear-gradient(135deg, #fff 0%, ${O_LITE} 100%)`, border: `1.5px solid ${O_MID}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <BarChart2 size={30} color={O} />
                </div>
              </div>

              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                {cards.map(card => {
                  const Icon = card.icon;
                  const isOpen = expandedCard === card.id;
                  return (
                    <div key={card.id} style={{ backgroundColor: "#fff", border: `1.5px solid ${isOpen ? card.iconColor : BORDER}`, borderRadius: 16, overflow: "hidden", transition: "all 0.2s", boxShadow: isOpen ? `0 4px 24px ${card.iconColor}20` : "0 1px 4px rgba(0,0,0,0.04)" }}>
                      <div style={{ padding: "20px 20px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                          <div style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: card.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon size={21} color={card.iconColor} />
                          </div>
                          <button onClick={() => setExpandedCard(isOpen ? null : card.id)}
                            style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${BORDER}`, backgroundColor: isOpen ? card.iconBg : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                            <Info size={12} color={isOpen ? card.iconColor : "#94a3b8"} />
                          </button>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{card.label}</div>
                        <div style={{ fontSize: 34, fontWeight: 800, color: "#0f172a", lineHeight: 1, marginBottom: 8 }}>{card.value ?? "—"}</div>
                        <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, marginBottom: 14 }}>
                          ↑ {card.change} <span style={{ color: "#94a3b8", fontWeight: 400 }}>vs last 30 days</span>
                        </div>
                        <button onClick={card.viewHref}
                          style={{ fontSize: 13, fontWeight: 600, color: card.labelColor, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                          {card.viewLabel} <ChevronRight size={13} />
                        </button>
                      </div>
                      {isOpen && (
                        <div style={{ borderTop: `1.5px solid ${BORDER}`, padding: "14px 20px", backgroundColor: "#FAFBFC" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: card.labelColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</span>
                            <button onClick={() => setExpandedCard(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}><X size={13} /></button>
                          </div>
                          {card.details.map(d => (
                            <div key={d.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${BORDER}` }}>
                              <span style={{ fontSize: 13, color: "#475569" }}>{d.label}</span>
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{d.value}</span>
                            </div>
                          ))}
                          <button onClick={card.detailLinkHref}
                            style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: card.labelColor, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                            {card.detailLinkLabel} <ChevronRight size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Shortcuts */}
              <div style={{ ...CARD }}>
                <div style={{ marginBottom: 18 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 3px" }}>Quick Shortcuts</h3>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Frequently used actions — keyboard shortcuts active</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                  {[
                    { label: "Add Candidates", desc: "Add new candidates to the platform", icon: UserPlus, shortcut: "Alt + C", bg: "#EFF6FF", color: "#1d4ed8", action: () => setActiveTab("bulk-candidates") },
                    { label: "Post Jobs", desc: "Create and publish new job openings", icon: Briefcase, shortcut: "Alt + J", bg: "#DCFCE7", color: "#15803d", action: () => { window.location.href = "/admin/post-job"; } },
                    { label: "Recruiter", desc: "Manage recruiters and approvals", icon: UserCheck, shortcut: "Alt + R", bg: "#F3E8FF", color: "#7c3aed", action: () => { setActiveTab("pending-recruiters"); fetchPendingRecruiters(); } },
                    { label: "AI Resume Parser", desc: "Parse resumes using AI technology", icon: Zap, shortcut: "Alt + P", bg: "#FFF7ED", color: O, action: () => setActiveTab("resume-parse") },
                    { label: "CV Add", desc: "Upload and manage CVs", icon: Upload, shortcut: "Alt + V", bg: "#ECFDF5", color: "#059669", action: () => { window.location.href = "/admin/bulk-candidates"; } },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <button key={s.label} onClick={s.action}
                        style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "16px", border: `1.5px solid ${BORDER}`, borderRadius: 14, backgroundColor: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.backgroundColor = s.bg; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
                        <div style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: s.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                          <Icon size={17} color={s.color} />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 3, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          {s.label} <ChevronRight size={12} color="#94a3b8" />
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12, lineHeight: 1.5 }}>{s.desc}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: s.color, backgroundColor: s.bg, padding: "3px 9px", borderRadius: 5, border: `1px solid ${s.color}30` }}>{s.shortcut}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── CANDIDATES ────────────────────────────────── */}
        {activeTab === "candidates" && (
          <div>
            <BackBtn />
            <TabHeader title={`Candidates (${candidates.length})`} subtitle="All referral and registered candidates" />
            <div style={{ ...CARD }}>
              {candidates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>No candidates yet.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                  {candidates.map(c => (
                    <div key={c.id} onClick={() => window.location.href = `/admin/candidates/${c.id}`}
                      style={{ padding: "18px", backgroundColor: "#FAFBFC", border: `1.5px solid ${BORDER}`, borderRadius: 13, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = O; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = "none"; }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {(c.name || "C").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.email}</div>
                        </div>
                      </div>
                      <p style={{ margin: 0, color: "#475569", fontSize: 12 }}>{c.skills ? c.skills.split(",").slice(0, 3).join(", ") : "No skills listed"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PENDING RECRUITERS ────────────────────────── */}
        {activeTab === "pending-recruiters" && (
          <div>
            <BackBtn />
            <TabHeader title="Pending Recruiter Approvals" subtitle="Review and approve or reject recruiter registrations" />
            {pendingRecruiters.length === 0 ? (
              <div style={{ ...CARD, textAlign: "center", padding: "48px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                <p style={{ color: "#94a3b8", margin: 0, fontWeight: 600 }}>No pending approvals</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pendingRecruiters.map(r => (
                  <div key={r.id} style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderLeft: "4px solid #f59e0b", borderRadius: 14, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 46, height: 46, borderRadius: "50%", backgroundColor: "#FEF3C7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                      {(r.name || "R").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{r.name}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{r.email}{r.phone ? ` · ${r.phone}` : ""}</div>
                      {r.company_name && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>🏢 {r.company_name}{r.company_website ? ` · ${r.company_website}` : ""}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { handleApproveRecruiter(r.id); setTimeout(fetchPendingRecruiters, 800); }}
                        style={{ padding: "8px 20px", backgroundColor: "#15803d", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        ✓ Approve
                      </button>
                      <button onClick={() => { handleRejectRecruiter(r.id); setTimeout(fetchPendingRecruiters, 800); }}
                        style={{ padding: "8px 20px", backgroundColor: "#fff", color: "#dc2626", border: "1.5px solid #dc2626", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── APPROVED RECRUITERS ───────────────────────── */}
        {activeTab === "recruiters" && (
          <div>
            <BackBtn />
            <TabHeader title={`Approved Recruiters (${approvedRecruiters.length})`} subtitle="All recruiters with platform access" />
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              {approvedRecruiters.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>No approved recruiters yet. Approve from Pending Recruiters.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F8FAFC", borderBottom: `1.5px solid ${BORDER}` }}>
                      {["Name", "Email", "Phone", "Company", "Approved At"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "13px 20px", color: "#64748b", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {approvedRecruiters.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: i % 2 === 0 ? "#fff" : "#FAFBFC" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = O_LITE}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#fff" : "#FAFBFC"}>
                        <td style={{ padding: "14px 20px", fontWeight: 600, color: "#0f172a" }}>{r.name || "—"}</td>
                        <td style={{ padding: "14px 20px", color: "#475569", fontSize: 13 }}>{r.email || "—"}</td>
                        <td style={{ padding: "14px 20px", color: "#475569", fontSize: 13 }}>{r.phone || "—"}</td>
                        <td style={{ padding: "14px 20px", color: "#475569", fontSize: 13 }}>{r.company_name || r.company || "—"}</td>
                        <td style={{ padding: "14px 20px", color: "#94a3b8", fontSize: 13 }}>{r.recruiter_approved_at ? new Date(r.recruiter_approved_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── INCENTIVES ────────────────────────────────── */}
        {activeTab === "incentives" && (
          <div>
            <BackBtn />
            <TabHeader title="Referrer Incentives" subtitle="Manage referral rewards for each referrer" />
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
              {/* Set incentive form */}
              <div style={{ ...CARD, alignSelf: "start" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 18px" }}>Set Incentive</h3>
                <form onSubmit={handleUpdateIncentive} style={{ display: "grid", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Select Referrer</label>
                    <select value={incentiveForm.referrerId} onChange={e => setIncentiveForm({ ...incentiveForm, referrerId: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${BORDER}`, borderRadius: 9, fontSize: 13, color: "#0f172a", backgroundColor: "#FAFBFC", fontFamily: "inherit" }}>
                      <option value="">Choose referrer…</option>
                      {referrers.map(r => <option key={r.id} value={r.id}>{r.name} (₹{r.incentive_value})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Incentive Value (₹)</label>
                    <input type="number" value={incentiveForm.value} onChange={e => setIncentiveForm({ ...incentiveForm, value: e.target.value })} placeholder="500"
                      style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${BORDER}`, borderRadius: 9, fontSize: 13, color: "#0f172a", backgroundColor: "#FAFBFC", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <button type="submit"
                    style={{ padding: "11px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#d4671e"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = O}>
                    Update Incentive
                  </button>
                </form>
              </div>
              {/* Referrers table */}
              <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: `1.5px solid ${BORDER}` }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>All Referrers & Incentives</h3>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F8FAFC", borderBottom: `1.5px solid ${BORDER}` }}>
                      {["Name", "Email", "Company", "Incentive", "Actions"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "12px 18px", color: "#64748b", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {referrers.map(r => (
                      editingReferrerId === r.id ? (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: "#F8FAFC" }}>
                          <td style={{ padding: "12px 18px", fontWeight: 600 }}>{r.name}</td>
                          <td style={{ padding: "12px 18px", fontSize: 13, color: "#475569" }}>{r.email}</td>
                          <td style={{ padding: "12px 18px", fontSize: 13, color: "#475569" }}>{r.company || "—"}</td>
                          <td style={{ padding: "12px 18px" }}>
                            <input type="number" value={editingIncentiveValue} onChange={e => setEditingIncentiveValue(e.target.value)}
                              style={{ padding: "6px 10px", border: `1.5px solid ${O}`, borderRadius: 7, fontSize: 13, width: 100, color: "#0f172a", fontFamily: "inherit" }} />
                          </td>
                          <td style={{ padding: "12px 18px", display: "flex", gap: 6 }}>
                            <button onClick={() => handleQuickEditIncentive(r.id)} style={{ padding: "5px 12px", backgroundColor: "#15803d", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Save</button>
                            <button onClick={() => setEditingReferrerId(null)} style={{ padding: "5px 12px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = "#FAFBFC"}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = "#fff"}>
                          <td style={{ padding: "12px 18px", fontWeight: 600 }}>{r.name}</td>
                          <td style={{ padding: "12px 18px", fontSize: 13, color: "#475569" }}>{r.email}</td>
                          <td style={{ padding: "12px 18px", fontSize: 13, color: "#475569" }}>{r.company || "—"}</td>
                          <td style={{ padding: "12px 18px" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>₹{r.incentive_value}</span>
                          </td>
                          <td style={{ padding: "12px 18px", display: "flex", gap: 6 }}>
                            <button onClick={() => { setEditingReferrerId(r.id); setEditingIncentiveValue(r.incentive_value.toString()); }} style={{ padding: "5px 12px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
                            <button onClick={() => handleRevokeIncentive(r.id)} style={{ padding: "5px 12px", backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Revoke</button>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── BULK JOBS ─────────────────────────────────── */}
        {activeTab === "bulk-jobs" && (
          <div>
            <BackBtn />
            <TabHeader title="Bulk Upload Jobs" subtitle="Upload a CSV file with job listings" />
            <div style={{ ...CARD }}>
              <p style={{ color: "#475569", marginBottom: 20, fontSize: 14 }}>
                Upload a CSV file with job listings. Download the template <a href="/Job_Upload.csv" download style={{ color: O, fontWeight: 600 }}>here</a>.
              </p>
              <div style={{ border: `2px dashed ${BORDER}`, borderRadius: 14, padding: "40px", textAlign: "center", backgroundColor: "#FAFBFC" }}>
                <Upload size={36} color={O} style={{ display: "block", margin: "0 auto 12px" }} />
                <p style={{ color: "#475569", fontWeight: 600, marginBottom: 8 }}>Drag and drop your CSV or click to browse</p>
                <input type="file" accept=".csv" onChange={handleBulkUploadJobs} disabled={uploadingJobs}
                  style={{ display: "block", margin: "0 auto", cursor: uploadingJobs ? "not-allowed" : "pointer" }} />
                {uploadingJobs && <p style={{ color: O, marginTop: 14, fontWeight: 600 }}>Uploading…</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── BULK CANDIDATES ───────────────────────────── */}
        {activeTab === "bulk-candidates" && (
          <div>
            <BackBtn />
            <TabHeader title="Bulk Upload Candidates" subtitle="Upload a CSV file with candidate information" />
            <div style={{ ...CARD }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <button onClick={() => window.location.href = "/admin/bulk-candidates"}
                  style={{ padding: "9px 20px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#d4671e"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = O}>
                  View Bulk Candidates →
                </button>
              </div>
              <p style={{ color: "#475569", marginBottom: 20, fontSize: 14 }}>
                Download the template <a href="/Candidate_Upload.csv" download style={{ color: O, fontWeight: 600 }}>here</a>.
              </p>
              <div style={{ border: `2px dashed ${BORDER}`, borderRadius: 14, padding: "40px", textAlign: "center", backgroundColor: "#FAFBFC" }}>
                <Upload size={36} color="#10b981" style={{ display: "block", margin: "0 auto 12px" }} />
                <p style={{ color: "#475569", fontWeight: 600, marginBottom: 4 }}>Drag and drop your CSV or click to browse</p>
                <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 14 }}>Columns: name, email, phone, skills, experience…</p>
                <input type="file" accept=".csv" onChange={handleBulkUploadCandidates} disabled={uploadingCandidates}
                  style={{ display: "block", margin: "0 auto", cursor: uploadingCandidates ? "not-allowed" : "pointer" }} />
                {uploadingCandidates && <p style={{ color: "#10b981", marginTop: 14, fontWeight: 600 }}>Uploading…</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── JOBS LIST ─────────────────────────────────── */}
        {activeTab === "jobs-list" && (
          <div>
            <BackBtn />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <TabHeader title={`All Jobs (${jobs.length})`} subtitle="Manage and control job statuses" />
              {selectedJobs.size > 0 && (
                <button onClick={handleDeleteSelectedJobs}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", backgroundColor: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                  <Trash2 size={14} /> Delete ({selectedJobs.size})
                </button>
              )}
            </div>
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              {jobs.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>No jobs yet. Post or upload jobs to see them here.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#F8FAFC", borderBottom: `1.5px solid ${BORDER}` }}>
                        <th style={{ padding: "13px 16px", width: 44 }}>
                          <input type="checkbox" checked={selectAll} onChange={handleSelectAll} style={{ cursor: "pointer", width: 16, height: 16 }} />
                        </th>
                        {["Job Title", "Department", "Location", "Type", "Experience", "Salary", "Status"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "13px 16px", color: "#64748b", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job, i) => (
                        <tr key={job.id} onClick={() => window.location.href = `/admin/jobs/${job.id}`}
                          style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: selectedJobs.has(job.id) ? "#EFF6FF" : (i % 2 === 0 ? "#fff" : "#FAFBFC"), cursor: "pointer", transition: "background-color 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = selectedJobs.has(job.id) ? "#EFF6FF" : O_LITE}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedJobs.has(job.id) ? "#EFF6FF" : (i % 2 === 0 ? "#fff" : "#FAFBFC")}>
                          <td style={{ padding: "13px 16px" }} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedJobs.has(job.id)} onChange={() => handleSelectJob(job.id)} style={{ cursor: "pointer", width: 16, height: 16 }} />
                          </td>
                          <td style={{ padding: "13px 16px", fontWeight: 600, color: "#0f172a" }}>{job.job_title}</td>
                          <td style={{ padding: "13px 16px", color: "#475569", fontSize: 13 }}>{job.department}</td>
                          <td style={{ padding: "13px 16px", color: "#475569", fontSize: 13 }}>{job.location}</td>
                          <td style={{ padding: "13px 16px", color: "#475569", fontSize: 13 }}>{job.job_type}</td>
                          <td style={{ padding: "13px 16px", color: "#475569", fontSize: 13 }}>{job.experience_required || "—"}</td>
                          <td style={{ padding: "13px 16px", color: "#475569", fontSize: 13 }}>{job.salary_range || "—"}</td>
                          <td style={{ padding: "13px 16px" }} onClick={e => e.stopPropagation()}>
                            <select value={job.status || "active"} onChange={e => handleJobStatusChange(job.id, e.target.value)}
                              style={{ padding: "5px 10px", borderRadius: 7, border: `1.5px solid ${BORDER}`, fontSize: 12, color: job.status === "active" ? "#15803d" : "#64748b", backgroundColor: "#FAFBFC", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── POST JOB (redirect shortcut) ──────────────── */}
        {activeTab === "jobs" && (
          <div>
            <BackBtn />
            <TabHeader title="Post New Job" />
            <div style={{ ...CARD, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
              <p style={{ color: "#475569", fontSize: 14, margin: 0 }}>Create a new job posting on the platform.</p>
              <button onClick={() => window.location.href = "/admin/post-job"}
                style={{ padding: "11px 24px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", boxShadow: `0 4px 14px ${O}44` }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#d4671e"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = O}>
                Create New Job Posting →
              </button>
            </div>
          </div>
        )}

        {/* ── MANAGE STATUS ─────────────────────────────── */}
        {activeTab === "manage-status" && (
          <div>
            <BackBtn />
            <TabHeader title="Candidate Status Management" subtitle="Update and track candidate progress through hiring stages" />
            {candidateStatusStats && (
              <div style={{ ...CARD, marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", color: "#0f172a" }}>Distribution by Status</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                  <div style={{ padding: "14px", backgroundColor: "#F8FAFC", borderRadius: 10, textAlign: "center", border: `1.5px solid ${BORDER}` }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{candidateStatusStats.total}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, fontWeight: 600 }}>Total</div>
                  </div>
                  {candidateStatusStats.byStatus?.map((s, i) => (
                    <div key={i} onClick={() => setFilterStatus(s.candidate_status)}
                      style={{ padding: "14px", backgroundColor: filterStatus === s.candidate_status ? O_LITE : "#F8FAFC", borderRadius: 10, textAlign: "center", border: `1.5px solid ${filterStatus === s.candidate_status ? O : BORDER}`, cursor: "pointer", transition: "all 0.15s" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: filterStatus === s.candidate_status ? O : "#0f172a" }}>{s.count}</div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 3, fontWeight: 600 }}>{s.candidate_status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1.5px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  Candidates ({filterStatus === "all" ? bulkCandidates.length : bulkCandidates.filter(c => c.candidate_status === filterStatus).length})
                </span>
                {filterStatus !== "all" && (
                  <button onClick={() => setFilterStatus("all")} style={{ fontSize: 12, color: O, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                    <X size={12} /> Clear filter
                  </button>
                )}
              </div>
              {bulkCandidates.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>No candidates. Upload via Bulk Candidates first.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#F8FAFC", borderBottom: `1.5px solid ${BORDER}` }}>
                        {["Name", "Email", "Contact", "Current Status", "Update Status", "Updated At"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "12px 18px", color: "#64748b", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(filterStatus === "all" ? bulkCandidates : bulkCandidates.filter(c => c.candidate_status === filterStatus)).map((c, i) => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: i % 2 === 0 ? "#fff" : "#FAFBFC" }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = O_LITE}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#fff" : "#FAFBFC"}>
                          <td style={{ padding: "12px 18px", fontWeight: 600, color: "#0f172a" }}>{c.name}</td>
                          <td style={{ padding: "12px 18px", color: "#475569", fontSize: 13 }}>{c.email}</td>
                          <td style={{ padding: "12px 18px", color: "#475569", fontSize: 13 }}>{c.contact || "—"}</td>
                          <td style={{ padding: "12px 18px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, backgroundColor: "#EFF6FF", color: "#1d4ed8", border: "1px solid #BFDBFE" }}>
                              {c.candidate_status || "Contacted"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 18px" }}>
                            <select value={c.candidate_status || "Contacted"} onChange={e => handleUpdateCandidateStatus(c.id, e.target.value)} disabled={updatingStatus === c.id}
                              style={{ padding: "6px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12, backgroundColor: "#FAFBFC", color: "#0f172a", cursor: updatingStatus === c.id ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: updatingStatus === c.id ? 0.5 : 1 }}>
                              {["Contacted", "Interested", "Not Interested", "No Response", "Follow-up Required", "In Review", "Shortlisted", "Interview Scheduled", "Interview Cleared", "Offered", "Hired", "Rejected", "On Hold"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "12px 18px", color: "#94a3b8", fontSize: 12 }}>{c.status_updated_at ? new Date(c.status_updated_at).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AI RESUME PARSER ──────────────────────────── */}
        {activeTab === "resume-parse" && (
          <div>
            <BackBtn />
            <TabHeader title="AI Resume Parser" subtitle="Paste resume PDF links — Claude AI extracts name, email, phone, skills, experience automatically" />
            <div style={{ ...CARD, marginBottom: 20 }}>
              <div style={{ backgroundColor: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12, padding: "14px 18px", marginBottom: 22, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>🤖</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 4 }}>How it works</div>
                  <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.7 }}>
                    1. Paste one resume PDF URL per line &nbsp;·&nbsp; 2. Click Parse &nbsp;·&nbsp; Claude AI downloads each PDF and extracts: <strong>Name, Email, Phone, Location, Qualification, Experience, Company, Skills</strong> &nbsp;·&nbsp; 3. Candidates auto-added with a unique <strong>RES-YYYY-NNNNN</strong> ID.
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Resume PDF URLs <span style={{ fontWeight: 400, color: "#94a3b8" }}>(one per line, max 50)</span>
                </label>
                <textarea value={resumeLinks} onChange={e => setResumeLinks(e.target.value)} rows={7}
                  placeholder={"https://example.com/resume1.pdf\nhttps://drive.google.com/uc?id=...\nhttps://dropbox.com/s/.../resume.pdf"}
                  style={{ width: "100%", padding: "12px 14px", fontSize: 13, fontFamily: "monospace", border: `1.5px solid ${BORDER}`, borderRadius: 10, outline: "none", resize: "vertical", color: "#0f172a", backgroundColor: "#FAFBFC", boxSizing: "border-box", lineHeight: 1.7 }}
                  onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>
                  {resumeLinks.split("\n").filter(l => l.trim().startsWith("http")).length} valid URL(s) detected
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleBulkParseResumes} disabled={parsingResumes}
                  style={{ padding: "11px 26px", backgroundColor: parsingResumes ? "#FEF3C7" : O, color: parsingResumes ? "#c2410c" : "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: parsingResumes ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, boxShadow: parsingResumes ? "none" : `0 4px 14px ${O}44` }}>
                  {parsingResumes ? (<><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #c2410c", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Parsing…</>) : "🤖 Parse Resumes"}
                </button>
                {!parsingResumes && <button onClick={() => { setResumeLinks(""); setParseResults(null); }}
                  style={{ padding: "11px 20px", backgroundColor: "#fff", color: "#64748b", border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Clear
                </button>}
              </div>
              {parsingResumes && (
                <div style={{ marginTop: 18, padding: "12px 16px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, fontSize: 13, color: "#166534" }}>
                  ⏳ Downloading and parsing PDFs… this may take 30–60 seconds. Please wait.
                </div>
              )}
            </div>

            {parseResults && (
              <div style={{ ...CARD }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
                  {[{ label: "Total Links", value: parseResults.totalLinks, bg: "#F8FAFC", color: "#374151" }, { label: "✅ Parsed", value: parseResults.parsedCount, bg: "#f0fdf4", color: "#166534" }, { label: "❌ Failed", value: parseResults.errorCount, bg: "#fef2f2", color: "#dc2626" }].map(s => (
                    <div key={s.label} style={{ flex: "1 1 110px", backgroundColor: s.bg, borderRadius: 12, padding: "14px", textAlign: "center", border: `1.5px solid ${BORDER}` }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {parseResults.candidates?.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>✅ Successfully Parsed</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {parseResults.candidates.map((c, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", backgroundColor: "#FAFBFC", border: `1.5px solid ${BORDER}`, borderLeft: `4px solid ${O}`, borderRadius: 10 }}>
                          <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {(c.name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>{c.email} · {c.contact}</div>
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontWeight: 700, color: O, marginBottom: 2 }}>{c.candidate_id}</div>
                            <div>{c.current_location || "—"} · {c.experience ? `${c.experience} yrs` : "—"}</div>
                          </div>
                          <button onClick={() => window.open(`/admin/bulk-candidates/${c.id}`, "_blank")}
                            style={{ padding: "6px 14px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {parseResults.errors?.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#dc2626", marginBottom: 12 }}>❌ Failed</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {parseResults.errors.map((e, i) => (
                        <div key={i} style={{ padding: "10px 14px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13 }}>
                          <span style={{ fontWeight: 600, color: "#dc2626" }}>#{e.index}</span>
                          <span style={{ color: "#374151", marginLeft: 8, wordBreak: "break-all" }}>{e.url}</span>
                          <span style={{ color: "#dc2626", marginLeft: 8 }}>— {e.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => window.location.href = "/admin/bulk-candidates"}
                  style={{ marginTop: 20, padding: "10px 22px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  View All Bulk Candidates →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
