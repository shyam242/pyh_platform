"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Users, Briefcase, UserCheck, LogOut, Trash2, Upload,
  ChevronDown, ChevronRight, ChevronLeft, X, Info, Megaphone, ShieldCheck,
  UserPlus, Zap, BarChart2, Home, Search, Filter, Eye,
  Mail, Phone, Building2, Calendar, Award, MoreVertical,
  Download, Clock, Gift, CheckCircle2, XCircle, RotateCcw,
  TrendingUp, FileCheck, AlertTriangle, Sparkles, ClipboardList
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#E2E8F0";
const CARD = { backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "24px" };
const CANDIDATE_STATUSES = ["New","Contacted","Interested","Not Interested","No Response","Follow-up Required","In Review","Shortlisted","Interview Scheduled","Interview Cleared","Offered","Hired","Rejected","On Hold"];

const initials = (name) => (name || "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
const avatarColor = (name) => {
  const colors = [["#EFF6FF","#1d4ed8"],["#DCFCE7","#15803d"],["#F3E8FF","#7c3aed"],["#FFF7ED",O],["#FEF2F2","#dc2626"],["#F0FDF4","#059669"]];
  return colors[(name || "").charCodeAt(0) % colors.length];
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboardData, setDashboardData] = useState(null);
  const [candidates, setCandidates] = useState([]);          // portal-registered (users table)
  const [referredCandidates, setReferredCandidates] = useState([]); // referrals table
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
  // Candidate tab sub-filter: "all" | "referred" | "bulk"
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null); // detail modal
  const clickTimers = useRef({});

  // ── Unified Candidate Status Management (Portal + Bulk) ──────
  const [statusList, setStatusList] = useState([]);
  const [statusOverview, setStatusOverview] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusFilterOptions, setStatusFilterOptions] = useState({ locations: [], skills: [], statuses: [] });
  const [statusFilters, setStatusFilters] = useState({ search: "", status: "all", source: "all", location: "all", skill: "all", page: 1, limit: 10 });
  const [statusPagination, setStatusPagination] = useState({ total: 0, totalPages: 1, portalCount: 0, bulkCount: 0 });
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [exportingStatusCSV, setExportingStatusCSV] = useState(false);

  // ── Recruiter Approval Center ─────────────────────────────────
  const [recruiterCenter, setRecruiterCenter] = useState({ recruiters: [], stats: {}, companies: [], activity: [] });
  const [recruiterCenterLoading, setRecruiterCenterLoading] = useState(false);
  const [recruiterFilters, setRecruiterFilters] = useState({ search: "", status: "pending", company: "all", registeredOn: "all" });
  const [rejectModal, setRejectModal] = useState(null); // { id, name }
  const [rejectReason, setRejectReason] = useState("");
  const [exportingRecruitersCSV, setExportingRecruitersCSV] = useState(false);

  // ── Keyboard shortcuts ──────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (!e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (["INPUT","TEXTAREA","SELECT"].includes(tag)) return;
    switch (e.key.toLowerCase()) {
      case "c": e.preventDefault(); setActiveTab("candidates"); break;
      case "j": e.preventDefault(); window.location.href = "/admin/post-job"; break;
      case "r": e.preventDefault(); setActiveTab("pending-recruiters"); fetchRecruiterCenter(); break;
      case "p": e.preventDefault(); setActiveTab("resume-parse"); break;
      case "v": e.preventDefault(); window.location.href = "/admin/bulk-candidates"; break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => { fetchDashboardData(); fetchJobs(); fetchReferredCandidates(); }, []);
  useEffect(() => {
    if (activeTab === "recruiters") fetchApprovedRecruiters();
    if (activeTab === "incentives") fetchReferrers();
    if (activeTab === "candidates") { fetchDashboardData(); fetchReferredCandidates(); }
    if (activeTab === "referred-candidates") fetchReferredCandidates();
    if (activeTab === "jobs-list") fetchJobs();
    if (activeTab === "manage-status") { fetchStatusList(); fetchStatusOverview(); }
    if (activeTab === "pending-recruiters") fetchRecruiterCenter();
  }, [activeTab]);

  // ── Fetchers ───────────────────────────────────────────────
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      setDashboardData(r.data.dashboard);
      // Only portal-registered candidates (role=candidate, not referred)
      setCandidates(r.data.candidates || []);
      setPendingRecruiters(r.data.pendingRecruiters || []);
      setLoading(false);
    } catch { showError("Failed to load dashboard"); setLoading(false); }
  };
  const fetchReferredCandidates = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/admin/referrals`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setReferredCandidates(Array.isArray(r.data) ? r.data : (r.data.referrals || []));
    } catch { /* silently fail — endpoint may not exist yet */ }
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
    } catch { showError("Failed to load stats"); }
  };
  const fetchPendingRecruiters = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setPendingRecruiters(r.data.pendingRecruiters || []);
    } catch { showError("Failed to load pending recruiters"); }
  };

  // ── Unified Candidate Status Management fetchers ──────────────
  const fetchStatusOverview = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/admin/candidate-status/overview`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setStatusOverview(r.data);
    } catch { showError("Failed to load status overview"); }
  };
  const fetchStatusList = async (overrides = {}) => {
    try {
      setStatusLoading(true);
      const f = { ...statusFilters, ...overrides };
      const r = await axios.get(`${API_BASE_URL}/api/admin/candidate-status/list`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: f,
      });
      setStatusList(r.data.candidates || []);
      setStatusPagination({ total: r.data.total, totalPages: r.data.totalPages, portalCount: r.data.portalCount, bulkCount: r.data.bulkCount });
      setStatusFilterOptions(r.data.filters || { locations: [], skills: [], statuses: [] });
    } catch { showError("Failed to load candidates"); } finally { setStatusLoading(false); }
  };
  const updateStatusFilter = (patch) => {
    const next = { ...statusFilters, ...patch, page: patch.page ?? 1 };
    setStatusFilters(next);
    fetchStatusList(next);
  };
  const handleUpdateUnifiedStatus = async (source, id, status) => {
    try {
      setStatusUpdating(`${source}-${id}`);
      await axios.put(`${API_BASE_URL}/api/admin/candidate-status/${source}/${id}`, { candidate_status: status }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess("Status updated");
      fetchStatusList(); fetchStatusOverview();
    } catch { showError("Failed to update status"); } finally { setStatusUpdating(null); }
  };
  const handleExportStatusCSV = async () => {
    try {
      setExportingStatusCSV(true);
      const r = await axios.get(`${API_BASE_URL}/api/admin/candidate-status/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { search: statusFilters.search, status: statusFilters.status, source: statusFilters.source },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a"); a.href = url; a.download = `candidate-status-${Date.now()}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      showSuccess("CSV exported");
    } catch { showError("Failed to export CSV"); } finally { setExportingStatusCSV(false); }
  };

  // ── Recruiter Approval Center fetchers ────────────────────────
  const fetchRecruiterCenter = async (overrides = {}) => {
    try {
      setRecruiterCenterLoading(true);
      const f = { ...recruiterFilters, ...overrides };
      const r = await axios.get(`${API_BASE_URL}/api/admin/recruiters/approval-center`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: f,
      });
      setRecruiterCenter(r.data);
    } catch { showError("Failed to load recruiter approval data"); } finally { setRecruiterCenterLoading(false); }
  };
  const updateRecruiterFilter = (patch) => {
    const next = { ...recruiterFilters, ...patch };
    setRecruiterFilters(next);
    fetchRecruiterCenter(next);
  };
  const handleApproveRecruiterV2 = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/api/admin/recruiters/${id}/approve`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess("Recruiter approved"); fetchRecruiterCenter(); fetchDashboardData();
    } catch { showError("Failed to approve recruiter"); }
  };
  const submitRejectRecruiter = async () => {
    if (!rejectModal) return;
    try {
      await axios.put(`${API_BASE_URL}/api/admin/recruiters/${rejectModal.id}/reject`, { reason: rejectReason }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess("Recruiter rejected"); setRejectModal(null); setRejectReason(""); fetchRecruiterCenter(); fetchDashboardData();
    } catch { showError("Failed to reject recruiter"); }
  };
  const handleReconsiderRecruiter = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/api/admin/recruiters/${id}/reconsider`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess("Moved back to pending review"); fetchRecruiterCenter();
    } catch { showError("Failed to update recruiter"); }
  };
  const handleExportRecruitersCSV = async () => {
    try {
      setExportingRecruitersCSV(true);
      const r = await axios.get(`${API_BASE_URL}/api/admin/recruiters/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { status: recruiterFilters.status },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a"); a.href = url; a.download = `recruiters-${Date.now()}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      showSuccess("CSV exported");
    } catch { showError("Failed to export CSV"); } finally { setExportingRecruitersCSV(false); }
  };

  // ── Actions ────────────────────────────────────────────────
  const handleUpdateCandidateStatus = async (id, status) => {
    try {
      setUpdatingStatus(id);
      await axios.put(`${API_BASE_URL}/api/admin/bulk-candidates/${id}/status`, { candidate_status: status }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess(`Status updated`); fetchBulkCandidates(); fetchCandidateStatusStats();
    } catch { showError("Failed to update status"); } finally { setUpdatingStatus(null); }
  };
  const handleSelectJob = (id) => { const n = new Set(selectedJobs); n.has(id) ? n.delete(id) : n.add(id); setSelectedJobs(n); setSelectAll(n.size === jobs.length && jobs.length > 0); };
  const handleSelectAll = () => { if (selectAll) { setSelectedJobs(new Set()); setSelectAll(false); } else { setSelectedJobs(new Set(jobs.map(j => j.id))); setSelectAll(true); } };
  const handleDeleteSelectedJobs = async () => {
    if (!selectedJobs.size) { showError("No jobs selected"); return; }
    if (!confirm(`Delete ${selectedJobs.size} job(s)?`)) return;
    try {
      const r = await axios.post(`${API_BASE_URL}/api/jobs/admin/bulk-delete`, { jobIds: Array.from(selectedJobs) }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (!r.data.deletedCount) { showError(r.data.message || "No jobs deleted"); return; }
      showSuccess(`${r.data.deletedCount} job(s) deleted`); setSelectedJobs(new Set()); setSelectAll(false); fetchJobs();
    } catch { showError("Failed to delete jobs"); }
  };
  const handleJobStatusChange = async (id, status) => {
    try { await axios.put(`${API_BASE_URL}/api/jobs/${id}`, { status }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); showSuccess(`Job updated`); fetchJobs(); }
    catch { showError("Failed to update job"); }
  };
  const handleApproveRecruiter = async (id) => { try { await axios.put(`${API_BASE_URL}/api/admin/recruiters/${id}/approve`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); showSuccess("Approved"); fetchDashboardData(); } catch { showError("Failed"); } };
  const handleRejectRecruiter = async (id) => { try { await axios.put(`${API_BASE_URL}/api/admin/recruiters/${id}/reject`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); showSuccess("Rejected"); fetchDashboardData(); } catch { showError("Failed"); } };
  const handleUpdateIncentive = async (e) => {
    e.preventDefault();
    try { await axios.put(`${API_BASE_URL}/api/admin/incentives/${incentiveForm.referrerId}`, { incentive_value: incentiveForm.value }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); showSuccess("Incentive updated"); setIncentiveForm({ referrerId: "", value: "" }); if (activeTab === "incentives") fetchReferrers(); }
    catch { showError("Failed to update incentive"); }
  };
  const handleRevokeIncentive = async (id) => { if (!confirm("Revoke?")) return; try { await axios.delete(`${API_BASE_URL}/api/admin/incentives/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); showSuccess("Revoked"); fetchReferrers(); setEditingReferrerId(null); } catch { showError("Failed"); } };
  const handleQuickEditIncentive = async (id) => { if (!editingIncentiveValue) { showError("Enter value"); return; } try { await axios.put(`${API_BASE_URL}/api/admin/incentives/${id}`, { incentive_value: editingIncentiveValue }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); showSuccess("Updated"); fetchReferrers(); setEditingReferrerId(null); setEditingIncentiveValue(""); } catch { showError("Failed"); } };
  const handleLogout = () => { localStorage.removeItem("token"); window.location.href = "/signin"; };

  const parseCSV = (text) => {
    const lines = []; let cur = ""; let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i+1];
      if (c==='"') { if(inQ&&n==='"'){cur+='"';i++;}else inQ=!inQ; }
      else if (c==="\n"&&!inQ) { if(cur.trim())lines.push(cur); cur=""; }
      else cur+=c;
    }
    if(cur.trim())lines.push(cur);
    if(lines.length<2)return[];
    const headers=lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,"").toLowerCase().replace(/\s+/g,"_"));
    return lines.slice(1).map(line=>{
      const vals=[];let v="";let iq=false;
      for(let j=0;j<line.length;j++){const c=line[j],n=line[j+1];if(c==='"'){if(iq&&n==='"'){v+='"';j++;}else iq=!iq;}else if(c===","&&!iq){vals.push(v.trim().replace(/^"|"$/g,""));v="";}else v+=c;}
      vals.push(v.trim().replace(/^"|"$/g,""));
      const obj={};headers.forEach((h,i)=>obj[h]=vals[i]||"");
      return Object.values(obj).some(x=>x!=="") ? obj : null;
    }).filter(Boolean);
  };

  const handleBulkUploadJobs = async (e) => {
    const file = e.target.files?.[0]; if(!file)return;
    try { const j=parseCSV(await file.text()); if(!j.length){showError("No valid jobs");return;} setUploadingJobs(true); const r=await axios.post(`${API_BASE_URL}/api/admin/bulk-upload/jobs`,{jobs:j},{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}}); showSuccess(`${r.data.createdCount} jobs created`); e.target.value=""; if(activeTab==="jobs-list")fetchJobs(); }
    catch { showError("Failed"); } finally { setUploadingJobs(false); }
  };
  const handleBulkUploadCandidates = async (e) => {
    const file=e.target.files?.[0]; if(!file)return; if(!file.name.endsWith(".csv")){showError("CSV only");return;}
    try { setUploadingCandidates(true); const fd=new FormData(); fd.append("csvFile",file); const r=await axios.post(`${API_BASE_URL}/api/admin/bulk-upload/csv`,fd,{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`,"Content-Type":"multipart/form-data"}}); showSuccess(`${r.data.uploadedCount} uploaded`); e.target.value=""; fetchDashboardData(); }
    catch { showError("Failed"); } finally { setUploadingCandidates(false); }
  };
  const handleBulkParseResumes = async () => {
    const links=resumeLinks.split("\n").map(l=>l.trim()).filter(l=>l.startsWith("http"));
    if(!links.length){showError("Enter valid URLs");return;} if(links.length>50){showError("Max 50");return;}
    try { setParsingResumes(true); setParseResults(null); const r=await axios.post(`${API_BASE_URL}/api/admin/bulk-upload/resume-links`,{resume_links:links},{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}}); setParseResults(r.data); if(r.data.parsedCount>0)showSuccess(`${r.data.parsedCount} parsed`); if(r.data.errorCount>0)showError(`${r.data.errorCount} failed`); }
    catch { showError("Failed to parse"); } finally { setParsingResumes(false); }
  };

  // ── Card single/double click: single=expand, double=collapse ──
  const handleCardClick = (id) => {
    if (clickTimers.current[id]) {
      clearTimeout(clickTimers.current[id]);
      delete clickTimers.current[id];
      setExpandedCard(null); // double-click = retract
    } else {
      clickTimers.current[id] = setTimeout(() => {
        delete clickTimers.current[id];
        setExpandedCard(prev => prev === id ? null : id); // single = expand/toggle
      }, 250);
    }
  };

  // ── Shared UI ──────────────────────────────────────────────
  const BackBtn = ({ label="Back to Overview", onClick }) => (
    <button onClick={onClick||(() => setActiveTab("overview"))}
      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 16px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#fff", fontSize:13, color:"#475569", cursor:"pointer", fontFamily:"inherit", fontWeight:600, marginBottom:22, transition:"all 0.15s" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=O;e.currentTarget.style.color=O;}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.color="#475569";}}>
      <Home size={13}/> {label}
    </button>
  );
  const TabHeader = ({ title, subtitle }) => (
    <div style={{ marginBottom:20 }}>
      <h2 style={{ fontSize:20, fontWeight:700, margin:"0 0 3px", color:"#0f172a" }}>{title}</h2>
      {subtitle && <p style={{ fontSize:13, color:"#64748b", margin:0 }}>{subtitle}</p>}
    </div>
  );
  const Badge = ({ label, color="#1d4ed8", bg="#EFF6FF", border="#BFDBFE" }) => (
    <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:999, backgroundColor:bg, color, border:`1px solid ${border}` }}>{label}</span>
  );

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:"#F8FAFC" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, border:`3px solid ${O}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }}/>
        <p style={{ color:"#64748b", fontWeight:600 }}>Loading Dashboard…</p>
      </div>
    </div>
  );

  const NAV_ITEMS = [
    { id:"overview", label:"🏠 Overview" },
    { id:"candidates", label:"👥 Candidates" },
    { id:"referred-candidates", label:"🔗 Referred Candidates" },
    { id:"manage-status", label:"📋 Candidate Status" },
    { id:"pending-recruiters", label:"⏳ Pending Recruiters" },
    { id:"recruiters", label:"✅ Approved Recruiters" },
    { id:"incentives", label:"💰 Incentives" },
    { id:"jobs-list", label:"💼 All Jobs" },
    { id:"jobs", label:"➕ Post Job" },
    { id:"bulk-jobs", label:"📤 Bulk Jobs" },
    { id:"bulk-candidates", label:"📂 Bulk Candidates" },
    { id:"resume-parse", label:"🤖 AI Resume Parser" },
    { id:"resume-views", label:"📊 Resume Analytics", isLink:"/admin/resume-views" },
  ];

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", backgroundColor:"#F8FAFC", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:"#0f172a" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* ── NAVBAR ─────────────────────────────────────── */}
      <nav style={{ position:"sticky", top:0, zIndex:300, backgroundColor:"#fff", borderBottom:`1.5px solid ${BORDER}`, padding:"0 40px", height:68, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 8px rgba(0,0,0,0.05)" }}>
        <button onClick={()=>setActiveTab("overview")} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
          <span style={{ fontSize:19, fontWeight:800, letterSpacing:"0.03em", color:"#0f172a" }}>
            PICK<span style={{ color:O }}>YOUR</span>HIRE
            <span style={{ fontSize:11, fontWeight:600, color:"#64748b", marginLeft:8, background:"#F1F5F9", padding:"3px 9px", borderRadius:6 }}>Admin</span>
          </span>
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ position:"relative" }}>
            <button onClick={()=>setDropdownOpen(!dropdownOpen)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px", border:`1.5px solid ${O}`, borderRadius:9, backgroundColor:"#fff", color:O, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Menu <ChevronDown size={14} style={{ transform:dropdownOpen?"rotate(180deg)":"none", transition:"transform 0.2s" }}/>
            </button>
            {dropdownOpen && (
              <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, minWidth:240, boxShadow:"0 16px 40px rgba(0,0,0,0.14)", overflow:"hidden", zIndex:1000, animation:"slideDown 0.15s ease" }}>
                {NAV_ITEMS.map(item=>(
                  <button key={item.id} onClick={()=>{
                    if(item.isLink){window.location.href=item.isLink;return;}
                    setActiveTab(item.id); setDropdownOpen(false);
                    if(item.id==="incentives")fetchReferrers();
                    if(item.id==="recruiters")fetchApprovedRecruiters();
                    if(item.id==="pending-recruiters")fetchRecruiterCenter();
                    if(item.id==="jobs-list")fetchJobs();
                    if(item.id==="referred-candidates")fetchReferredCandidates();
                    if(item.id==="manage-status"){fetchStatusList();fetchStatusOverview();}
                  }}
                    style={{ width:"100%", padding:"11px 20px", border:"none", borderLeft:`3px solid ${activeTab===item.id?O:"transparent"}`, backgroundColor:activeTab===item.id?O_LITE:"#fff", color:activeTab===item.id?O:"#374151", textAlign:"left", cursor:"pointer", fontSize:13, fontWeight:activeTab===item.id?700:400, fontFamily:"inherit", transition:"all 0.1s" }}
                    onMouseEnter={e=>{if(activeTab!==item.id)e.currentTarget.style.backgroundColor="#F8FAFC";}}
                    onMouseLeave={e=>{if(activeTab!==item.id)e.currentTarget.style.backgroundColor="#fff";}}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleLogout}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px", border:"none", borderRadius:9, backgroundColor:O, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 2px 8px ${O}44` }}
            onMouseEnter={e=>e.currentTarget.style.backgroundColor="#d4671e"}
            onMouseLeave={e=>e.currentTarget.style.backgroundColor=O}>
            <LogOut size={14}/> Logout
          </button>
        </div>
      </nav>

      {/* ── CONTENT ────────────────────────────────────── */}
      <div style={{ maxWidth:1360, margin:"0 auto", padding:"32px 40px 64px" }}
        onClick={()=>dropdownOpen&&setDropdownOpen(false)}>

        {/* ═══════════════════════════════════════════════ */}
        {/* OVERVIEW                                        */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="overview" && dashboardData && (() => {
          const topRef = referrers.reduce((t,r)=>(!t||(r.referral_count||0)>(t.referral_count||0))?r:t,null);
          const cards = [
            { id:"candidates", label:"Total Candidates", value:dashboardData.totalCandidates, change:"+20%", icon:Users, iconBg:"#EFF6FF", iconColor:"#1d4ed8", viewLabel:"View all candidates", viewHref:()=>setActiveTab("candidates"), details:[{label:"Active",value:candidates.filter(c=>c.status!=="rejected").length},{label:"New This Month",value:dashboardData.newCandidatesThisMonth??"—"},{label:"Shortlisted",value:dashboardData.shortlistedCandidates??"—"},{label:"Rejected",value:dashboardData.rejectedCandidates??"—"}], labelColor:"#1d4ed8" },
            { id:"referrers", label:"Total Referrers", value:dashboardData.totalReferrers, change:"+25%", icon:Users, iconBg:"#DCFCE7", iconColor:"#15803d", viewLabel:"View all referrers", viewHref:()=>{window.location.href="/admin/referrers";}, details:[{label:"Active Referrers",value:referrers.filter(r=>(r.referral_count||0)>0).length||"—"},{label:"New This Month",value:dashboardData.newReferrersThisMonth??"—"},{label:"Inactive",value:referrers.filter(r=>!(r.referral_count>0)).length||"—"},{label:"Top Referrer",value:topRef?.name?.split(" ")[0]||"—"}], labelColor:"#15803d" },
            { id:"recruiters", label:"Recruiters (Approved)", value:dashboardData.approvedRecruiters, change:"+100%", icon:ShieldCheck, iconBg:"#F3E8FF", iconColor:"#7c3aed", viewLabel:"View all recruiters", viewHref:()=>setActiveTab("recruiters"), details:[{label:"Pending Approval",value:pendingRecruiters.length},{label:"Approved",value:dashboardData.approvedRecruiters},{label:"Rejected",value:dashboardData.rejectedRecruiters??"—"},{label:"Total",value:(pendingRecruiters.length||0)+(dashboardData.approvedRecruiters||0)}], labelColor:"#7c3aed" },
            { id:"referrals", label:"Total Referrals", value:dashboardData.totalReferrals, change:"+30%", icon:Megaphone, iconBg:"#FFF7ED", iconColor:O, viewLabel:"View referred candidates", viewHref:()=>setActiveTab("referred-candidates"), details:[{label:"Successful",value:dashboardData.successfulReferrals??"—"},{label:"Pending",value:dashboardData.pendingReferrals??"—"},{label:"Expired",value:dashboardData.expiredReferrals??"—"},{label:"Conversion Rate",value:dashboardData.conversionRate?`${dashboardData.conversionRate}%`:"—"}], labelColor:O },
          ];
          return (
            <div>
              {/* Banner */}
              <div style={{ background:"linear-gradient(135deg,#f8fafc 0%,#fff7ed 100%)", border:`1.5px solid ${BORDER}`, borderRadius:18, padding:"26px 32px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <h2 style={{ fontSize:23, fontWeight:800, margin:"0 0 4px" }}>Dashboard Overview</h2>
                  <p style={{ fontSize:13, color:"#64748b", margin:"0 0 14px" }}>Manage your platform efficiently from this comprehensive dashboard</p>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {[["Alt+C","Candidates"],["Alt+J","Post Job"],["Alt+R","Recruiters"],["Alt+P","AI Parser"],["Alt+V","CV Add"]].map(([k,l])=>(
                      <span key={k} style={{ fontSize:11, padding:"3px 10px", backgroundColor:"#fff", border:`1px solid ${BORDER}`, borderRadius:6, color:"#64748b" }}>
                        <strong>{k}</strong> {l}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ width:68, height:68, borderRadius:18, background:`linear-gradient(135deg,#fff 0%,${O_LITE} 100%)`, border:`1.5px solid ${O_MID}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <BarChart2 size={30} color={O}/>
                </div>
              </div>

              {/* Stat cards — single click expands, double click retracts */}
              <p style={{ fontSize:12, color:"#94a3b8", textAlign:"right", margin:"0 0 10px" }}>Click card for details · Double-click to close</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
                {cards.map(card=>{
                  const Icon=card.icon; const isOpen=expandedCard===card.id;
                  return (
                    <div key={card.id}
                      style={{ backgroundColor:"#fff", border:`1.5px solid ${isOpen?card.iconColor:BORDER}`, borderRadius:16, overflow:"hidden", transition:"all 0.2s", boxShadow:isOpen?`0 4px 24px ${card.iconColor}22`:"0 1px 4px rgba(0,0,0,0.04)", cursor:"pointer" }}
                      onClick={()=>handleCardClick(card.id)}>
                      <div style={{ padding:"20px 20px 16px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                          <div style={{ width:46, height:46, borderRadius:13, backgroundColor:card.iconBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Icon size={21} color={card.iconColor}/>
                          </div>
                          <div style={{ width:26, height:26, borderRadius:"50%", border:`1.5px solid ${BORDER}`, backgroundColor:isOpen?card.iconBg:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Info size={12} color={isOpen?card.iconColor:"#94a3b8"}/>
                          </div>
                        </div>
                        <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:3, textTransform:"uppercase", letterSpacing:"0.05em" }}>{card.label}</div>
                        <div style={{ fontSize:36, fontWeight:800, color:"#0f172a", lineHeight:1, marginBottom:8 }}>{card.value??"—"}</div>
                        <div style={{ fontSize:12, color:"#16a34a", fontWeight:600, marginBottom:14 }}>↑ {card.change} <span style={{ color:"#94a3b8", fontWeight:400 }}>vs last 30 days</span></div>
                        <div onClick={e=>{e.stopPropagation();card.viewHref();}}
                          style={{ fontSize:13, fontWeight:600, color:card.labelColor, display:"inline-flex", alignItems:"center", gap:4, cursor:"pointer" }}
                          onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"}
                          onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>
                          {card.viewLabel} <ChevronRight size={13}/>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ borderTop:`1.5px solid ${BORDER}`, padding:"16px 20px", backgroundColor:"#FAFBFC", animation:"slideDown 0.15s ease" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:card.labelColor, textTransform:"uppercase", letterSpacing:"0.05em" }}>{card.label}</span>
                            <span style={{ fontSize:10, color:"#94a3b8" }}>Double-click to close</span>
                          </div>
                          {card.details.map(d=>(
                            <div key={d.label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${BORDER}` }}>
                              <span style={{ fontSize:13, color:"#475569" }}>{d.label}</span>
                              <span style={{ fontSize:13, fontWeight:700 }}>{d.value}</span>
                            </div>
                          ))}
                          <div onClick={e=>{e.stopPropagation();card.viewHref();}}
                            style={{ marginTop:12, fontSize:12, fontWeight:600, color:card.labelColor, display:"inline-flex", alignItems:"center", gap:4, cursor:"pointer" }}
                            onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"}
                            onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>
                            {card.viewLabel} <ChevronRight size={11}/>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Shortcuts */}
              <div style={{ ...CARD }}>
                <div style={{ marginBottom:18 }}>
                  <h3 style={{ fontSize:17, fontWeight:700, margin:"0 0 3px" }}>Quick Shortcuts</h3>
                  <p style={{ fontSize:12, color:"#94a3b8", margin:0 }}>Frequently used actions — keyboard shortcuts active</p>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
                  {[
                    { label:"Add Candidates", desc:"Add new candidates to the platform", icon:UserPlus, shortcut:"Alt + C", bg:"#EFF6FF", color:"#1d4ed8", action:()=>setActiveTab("candidates") },
                    { label:"Post Jobs", desc:"Create and publish new job openings", icon:Briefcase, shortcut:"Alt + J", bg:"#DCFCE7", color:"#15803d", action:()=>{window.location.href="/admin/post-job";} },
                    { label:"Recruiter", desc:"Manage recruiters and approvals", icon:UserCheck, shortcut:"Alt + R", bg:"#F3E8FF", color:"#7c3aed", action:()=>{setActiveTab("pending-recruiters");fetchRecruiterCenter();} },
                    { label:"AI Resume Parser", desc:"Parse resumes using AI technology", icon:Zap, shortcut:"Alt + P", bg:"#FFF7ED", color:O, action:()=>setActiveTab("resume-parse") },
                    { label:"CV Add", desc:"Upload and manage CVs", icon:Upload, shortcut:"Alt + V", bg:"#ECFDF5", color:"#059669", action:()=>{window.location.href="/admin/bulk-candidates";} },
                  ].map(s=>{
                    const Icon=s.icon;
                    return (
                      <button key={s.label} onClick={s.action}
                        style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", padding:"16px", border:`1.5px solid ${BORDER}`, borderRadius:14, backgroundColor:"#fff", cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all 0.15s", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=s.color;e.currentTarget.style.backgroundColor=s.bg;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.08)";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.backgroundColor="#fff";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";}}>
                        <div style={{ width:38, height:38, borderRadius:11, backgroundColor:s.bg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                          <Icon size={17} color={s.color}/>
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", marginBottom:3, display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%" }}>
                          {s.label} <ChevronRight size={12} color="#94a3b8"/>
                        </div>
                        <div style={{ fontSize:11, color:"#94a3b8", marginBottom:12, lineHeight:1.5 }}>{s.desc}</div>
                        <span style={{ fontSize:10, fontWeight:700, color:s.color, backgroundColor:s.bg, padding:"3px 9px", borderRadius:5, border:`1px solid ${s.color}30` }}>{s.shortcut}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════ */}
        {/* CANDIDATES (portal-registered only)             */}
        {/* Image-2 style layout with filter tabs           */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="candidates" && (() => {
          const portalOnly = candidates; // from users table, role=candidate
          const allBulk = bulkCandidates;
          const combined = candidateFilter==="referred" ? referredCandidates
            : candidateFilter==="bulk" ? allBulk
            : portalOnly;
          const searched = combined.filter(c =>
            !candidateSearch || [c.name,c.email,c.skills,c.department].filter(Boolean).join(" ").toLowerCase().includes(candidateSearch.toLowerCase())
          );
          return (
            <div>
              <BackBtn/>
              {/* Top stat banner */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
                {[
                  { icon:Users, iconBg:"#EFF6FF", iconColor:"#1d4ed8", value:portalOnly.length, label:"Total Candidates", sub:"All candidates in your platform" },
                  { icon:Megaphone, iconBg:"#DCFCE7", iconColor:"#15803d", value:referredCandidates.length, label:"Referred Candidates", sub:"Candidates referred through your platform" },
                  { icon:"⏳", value:dashboardData?.pendingReferrals??"0", label:"Pending Review", sub:"Candidates under review" },
                  { icon:Award, iconBg:"#FFF7ED", iconColor:O, value:dashboardData?.successfulReferrals??"0", label:"Hired Candidates", sub:"Successfully hired" },
                ].map((s,i)=>{
                  const Icon=s.icon;
                  return (
                    <div key={i} style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"18px 20px", display:"flex", alignItems:"center", gap:14 }}>
                      {typeof Icon==="string" ? (
                        <div style={{ width:44, height:44, borderRadius:12, backgroundColor:"#FFF7ED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{Icon}</div>
                      ) : (
                        <div style={{ width:44, height:44, borderRadius:12, backgroundColor:s.iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Icon size={20} color={s.iconColor}/>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize:22, fontWeight:800, color:"#0f172a" }}>{s.value}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{s.label}</div>
                        <div style={{ fontSize:11, color:"#94a3b8" }}>{s.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Filter tabs + search */}
              <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:16, overflow:"hidden" }}>
                <div style={{ padding:"18px 24px", borderBottom:`1.5px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <h3 style={{ fontSize:16, fontWeight:700, margin:"0 0 2px" }}>
                      {candidateFilter==="referred"?"Referred Candidates":candidateFilter==="bulk"?"Bulk Upload Candidates":"Portal Candidates"}
                    </h3>
                    <p style={{ fontSize:12, color:"#64748b", margin:0 }}>
                      {candidateFilter==="referred"?"Candidates referred through your platform":candidateFilter==="bulk"?"Candidates uploaded via CSV/resume":"Candidates who registered directly on the platform"}
                    </p>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    {/* Search */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#F8FAFC" }}>
                      <Search size={14} color="#94a3b8"/>
                      <input value={candidateSearch} onChange={e=>setCandidateSearch(e.target.value)} placeholder="Search candidates..."
                        style={{ border:"none", outline:"none", fontSize:13, background:"transparent", fontFamily:"inherit", width:160 }}/>
                      {candidateSearch && <button onClick={()=>setCandidateSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}><X size={13}/></button>}
                    </div>
                    {/* Filter pill buttons */}
                    {[
                      { id:"all", label:"Portal" },
                      { id:"referred", label:"Referred" },
                      { id:"bulk", label:"Bulk Upload" },
                    ].map(f=>(
                      <button key={f.id}
                        onClick={()=>{ if(candidateFilter===f.id){setCandidateFilter("all");}else{setCandidateFilter(f.id); if(f.id==="bulk")fetchBulkCandidates();} }}
                        style={{ padding:"7px 16px", border:`1.5px solid ${candidateFilter===f.id?O:BORDER}`, borderRadius:9, backgroundColor:candidateFilter===f.id?O_LITE:"#fff", color:candidateFilter===f.id?O:"#475569", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
                        {f.label}
                        {candidateFilter===f.id && <span style={{ marginLeft:6, fontSize:10, color:O }}>✕</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table header */}
                <div style={{ display:"grid", gridTemplateColumns:"2.5fr 2fr 2fr 1.5fr 1fr 1fr", gap:8, padding:"10px 24px", backgroundColor:"#F8FAFC", borderBottom:`1px solid ${BORDER}`, fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  <span>Candidate</span><span>Email</span><span>Skills</span>
                  <span>{candidateFilter==="referred"?"Referred On":"Joined On"}</span>
                  <span>Status</span><span>Actions</span>
                </div>

                {searched.length===0 ? (
                  <div style={{ padding:"60px", textAlign:"center" }}>
                    <Users size={40} color="#E5E7EB" style={{ display:"block", margin:"0 auto 12px" }}/>
                    <p style={{ color:"#94a3b8", margin:0 }}>No candidates found</p>
                  </div>
                ) : (
                  searched.map((c,i)=>{
                    const [abg, afg] = avatarColor(c.name);
                    const isReferred = candidateFilter==="referred";
                    return (
                      <div key={c.id}
                        style={{ display:"grid", gridTemplateColumns:"2.5fr 2fr 2fr 1.5fr 1fr 1fr", gap:8, padding:"14px 24px", borderBottom:`1px solid #F8FAFC`, alignItems:"center", transition:"background 0.12s", cursor:"pointer" }}
                        onMouseEnter={e=>e.currentTarget.style.backgroundColor=O_LITE}
                        onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:38, height:38, borderRadius:"50%", backgroundColor:abg, color:afg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                            {initials(c.name)}
                          </div>
                          <div style={{ fontSize:14, fontWeight:600, color:"#0f172a" }}>{c.name||"—"}</div>
                        </div>
                        <div style={{ fontSize:13, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.email||"—"}</div>
                        <div style={{ fontSize:12, color:"#64748b" }}>{c.skills ? c.skills.split(",").slice(0,2).join(", ") : "No skills listed"}</div>
                        <div style={{ fontSize:12, color:"#64748b", display:"flex", alignItems:"center", gap:5 }}>
                          <Calendar size={12}/> {fmtDate(c.created_at||c.referred_at)}
                        </div>
                        <div>
                          {isReferred
                            ? <Badge label={c.status||"Referred"} color="#15803d" bg="#DCFCE7" border="#86efac"/>
                            : <Badge label={c.status||"Active"} color="#1d4ed8" bg="#EFF6FF" border="#BFDBFE"/>
                          }
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <button
                            onClick={()=>setSelectedCandidate({ ...c, _type: isReferred?"referred":candidateFilter==="bulk"?"bulk":"portal" })}
                            style={{ padding:"6px 14px", border:`1.5px solid ${O}`, borderRadius:7, backgroundColor:"#fff", color:O, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {searched.length>0 && (
                  <div style={{ padding:"12px 24px", borderTop:`1px solid ${BORDER}`, fontSize:12, color:"#64748b" }}>
                    Showing 1 to {searched.length} of {searched.length} candidates
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════ */}
        {/* REFERRED CANDIDATES (dedicated page)            */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="referred-candidates" && (() => {
          const searched = referredCandidates.filter(c =>
            !candidateSearch || [c.name,c.email,c.skills,c.department,c.company].filter(Boolean).join(" ").toLowerCase().includes(candidateSearch.toLowerCase())
          );
          return (
            <div>
              <BackBtn/>
              <TabHeader title={`Referred Candidates (${referredCandidates.length})`} subtitle="Candidates referred through the platform by referrers"/>
              <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:16, overflow:"hidden" }}>
                <div style={{ padding:"16px 24px", borderBottom:`1.5px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Megaphone size={16} color={O}/>
                    <span style={{ fontWeight:700, fontSize:15 }}>Referred Candidates Directory</span>
                    <span style={{ fontSize:12, color:"#94a3b8", marginLeft:4 }}>{searched.length} shown</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#F8FAFC" }}>
                    <Search size={14} color="#94a3b8"/>
                    <input value={candidateSearch} onChange={e=>setCandidateSearch(e.target.value)} placeholder="Search..."
                      style={{ border:"none", outline:"none", fontSize:13, background:"transparent", fontFamily:"inherit", width:160 }}/>
                    {candidateSearch && <button onClick={()=>setCandidateSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}><X size={13}/></button>}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 2fr 1.5fr 1fr 1.5fr", gap:8, padding:"10px 24px", backgroundColor:"#F8FAFC", borderBottom:`1px solid ${BORDER}`, fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  <span>Candidate</span><span>Email</span><span>Skills</span><span>Referred On</span><span>Status</span><span>Actions</span>
                </div>
                {searched.length===0 ? (
                  <div style={{ padding:"60px", textAlign:"center" }}>
                    <Megaphone size={40} color="#E5E7EB" style={{ display:"block", margin:"0 auto 12px" }}/>
                    <p style={{ color:"#94a3b8", margin:0 }}>No referred candidates yet</p>
                  </div>
                ) : searched.map((c,i)=>{
                  const [abg,afg]=avatarColor(c.name);
                  return (
                    <div key={c.id}
                      style={{ display:"grid", gridTemplateColumns:"2fr 2fr 2fr 1.5fr 1fr 1.5fr", gap:8, padding:"14px 24px", borderBottom:`1px solid #F8FAFC`, alignItems:"center" }}
                      onMouseEnter={e=>e.currentTarget.style.backgroundColor=O_LITE}
                      onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:38, height:38, borderRadius:"50%", backgroundColor:abg, color:afg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {initials(c.name)}
                        </div>
                        <div style={{ fontSize:14, fontWeight:600 }}>{c.name||"—"}</div>
                      </div>
                      <div style={{ fontSize:13, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.email||"—"}</div>
                      <div style={{ fontSize:12, color:"#64748b" }}>{c.skills ? c.skills.split(",").slice(0,2).join(", ") : "No skills listed"}</div>
                      <div style={{ fontSize:12, color:"#64748b", display:"flex", alignItems:"center", gap:5 }}>
                        <Calendar size={12}/> {fmtDate(c.created_at)}
                      </div>
                      <div><Badge label={c.status||"Referred"} color="#15803d" bg="#DCFCE7" border="#86efac"/></div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>setSelectedCandidate({...c,_type:"referred"})}
                          style={{ padding:"6px 14px", border:`1.5px solid ${O}`, borderRadius:7, backgroundColor:"#fff", color:O, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
                {searched.length>0 && (
                  <div style={{ padding:"12px 24px", borderTop:`1px solid ${BORDER}`, fontSize:12, color:"#64748b" }}>
                    Showing {searched.length} of {referredCandidates.length} referred candidates
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════ */}
        {/* PENDING RECRUITERS                              */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="pending-recruiters" && (() => {
          const rc = recruiterCenter;
          const stats = rc.stats || {};
          const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";
          const activityIcon = (action) => action==="approved" ? { Icon:CheckCircle2, color:"#15803d" } : action==="rejected" ? { Icon:XCircle, color:"#dc2626" } : { Icon:RotateCcw, color:"#d97706" };
          const docBadge = (status) => {
            if (status==="Complete") return <Badge label="✓ Complete" color="#15803d" bg="#DCFCE7" border="#86efac"/>;
            if (status==="Partial") return <Badge label="◐ Partial" color="#d97706" bg="#FEF3C7" border="#FDE68A"/>;
            return <Badge label="✕ Missing" color="#dc2626" bg="#FEF2F2" border="#FECACA"/>;
          };
          return (
          <div>
            <BackBtn/>
            {/* Hero banner */}
            <div style={{ background:"linear-gradient(135deg,#f8fafc 0%,#F3E8FF 100%)", border:`1.5px solid ${BORDER}`, borderRadius:18, padding:"26px 32px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <h2 style={{ fontSize:23, fontWeight:800, margin:"0 0 4px" }}>Recruiter Approval Center</h2>
                <p style={{ fontSize:13, color:"#64748b", margin:0 }}>Review new recruiter registrations, verify company information, and approve trusted recruiting partners.</p>
              </div>
              <div style={{ width:68, height:68, borderRadius:18, background:"linear-gradient(135deg,#fff 0%,#F3E8FF 100%)", border:"1.5px solid #d8b4fe", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <ShieldCheck size={30} color="#7c3aed"/>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"2.4fr 1fr", gap:20, alignItems:"start" }}>
              {/* LEFT: filters + table */}
              <div>
                <div style={{ ...CARD, padding:0, overflow:"hidden", marginBottom:20 }}>
                  <div style={{ padding:"16px 20px", borderBottom:`1.5px solid ${BORDER}`, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#F8FAFC", flex:"1 1 200px" }}>
                      <Search size={14} color="#94a3b8"/>
                      <input value={recruiterFilters.search} onChange={e=>setRecruiterFilters({...recruiterFilters,search:e.target.value})}
                        onKeyDown={e=>e.key==="Enter"&&updateRecruiterFilter({search:recruiterFilters.search})}
                        placeholder="Search recruiters by name, email or company..."
                        style={{ border:"none", outline:"none", fontSize:13, background:"transparent", fontFamily:"inherit", width:"100%" }}/>
                      {recruiterFilters.search && <button onClick={()=>updateRecruiterFilter({search:""})} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}><X size={13}/></button>}
                    </div>
                    <select value={recruiterFilters.status} onChange={e=>updateRecruiterFilter({status:e.target.value})}
                      style={{ padding:"8px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, backgroundColor:"#FAFBFC", fontFamily:"inherit", color:"#374151" }}>
                      <option value="pending">Status: Pending</option>
                      <option value="approved">Status: Approved</option>
                      <option value="rejected">Status: Rejected</option>
                      <option value="all">Status: All</option>
                    </select>
                    <select value={recruiterFilters.company} onChange={e=>updateRecruiterFilter({company:e.target.value})}
                      style={{ padding:"8px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, backgroundColor:"#FAFBFC", fontFamily:"inherit", color:"#374151" }}>
                      <option value="all">Company: All</option>
                      {rc.companies?.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={recruiterFilters.registeredOn} onChange={e=>updateRecruiterFilter({registeredOn:e.target.value})}
                      style={{ padding:"8px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, backgroundColor:"#FAFBFC", fontFamily:"inherit", color:"#374151" }}>
                      <option value="all">Registered: Any time</option>
                      <option value="today">Registered: Today</option>
                      <option value="week">Registered: Last 7 days</option>
                      <option value="month">Registered: Last 30 days</option>
                    </select>
                    <button onClick={()=>fetchRecruiterCenter()}
                      style={{ padding:"8px 14px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#fff", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
                      <Filter size={13}/> Refresh
                    </button>
                  </div>

                  <div style={{ padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${BORDER}`, backgroundColor:"#FAFBFC" }}>
                    <span style={{ fontWeight:700, fontSize:14 }}>
                      {recruiterFilters.status==="pending"?"Pending Recruiter Approvals":recruiterFilters.status==="approved"?"Approved Recruiters":recruiterFilters.status==="rejected"?"Rejected Recruiters":"All Recruiters"}
                      <span style={{ marginLeft:8, fontSize:12, fontWeight:700, color:"#7c3aed", backgroundColor:"#F3E8FF", padding:"2px 9px", borderRadius:999 }}>{rc.recruiters?.length||0} {recruiterFilters.status==="pending"?"Pending":""}</span>
                    </span>
                    <button onClick={handleExportRecruitersCSV} disabled={exportingRecruitersCSV}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", border:`1.5px solid ${BORDER}`, borderRadius:8, backgroundColor:"#fff", color:"#475569", fontSize:12, fontWeight:700, cursor:exportingRecruitersCSV?"not-allowed":"pointer", fontFamily:"inherit" }}>
                      <Download size={13}/> {exportingRecruitersCSV?"Exporting…":"Export"}
                    </button>
                  </div>

                  {recruiterCenterLoading ? (
                    <div style={{ padding:"60px", textAlign:"center", color:"#94a3b8" }}>Loading…</div>
                  ) : !rc.recruiters || rc.recruiters.length===0 ? (
                    <div style={{ padding:"56px 24px", textAlign:"center" }}>
                      <div style={{ fontSize:44, marginBottom:10 }}>🎉</div>
                      <p style={{ fontWeight:700, margin:"0 0 4px" }}>You're all caught up!</p>
                      <p style={{ color:"#94a3b8", margin:0, fontSize:13 }}>There are currently no recruiter approvals waiting for review.</p>
                    </div>
                  ) : (
                    <div>
                      {rc.recruiters.map(r=>(
                        <div key={r.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px", borderBottom:`1px solid ${BORDER}` }}
                          onMouseEnter={e=>e.currentTarget.style.backgroundColor="#FAFBFC"}
                          onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                          <div style={{ width:42, height:42, borderRadius:"50%", backgroundColor:"#F3E8FF", color:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, flexShrink:0 }}>
                            {initials(r.name)}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:14 }}>{r.name}</div>
                            <div style={{ fontSize:12, color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.email}{r.phone?` · ${r.phone}`:""}</div>
                          </div>
                          <div style={{ width:150, fontSize:12, color:"#374151", fontWeight:600 }}>{r.company_name||"—"}</div>
                          <div style={{ width:110, fontSize:12, color:"#94a3b8" }}>{fmtDate(r.created_at)}</div>
                          <div style={{ width:100 }}>{docBadge(r.documents_status)}</div>
                          <div style={{ width:110 }}>
                            {r.recruiter_status==="approved" && <Badge label="Approved" color="#15803d" bg="#DCFCE7" border="#86efac"/>}
                            {r.recruiter_status==="rejected" && <Badge label="Rejected" color="#dc2626" bg="#FEF2F2" border="#FECACA"/>}
                            {r.recruiter_status==="pending" && <Badge label="Pending" color="#d97706" bg="#FEF3C7" border="#FDE68A"/>}
                          </div>
                          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                            {r.recruiter_status==="pending" && (<>
                              <button onClick={()=>handleApproveRecruiterV2(r.id)}
                                style={{ padding:"7px 16px", backgroundColor:"#15803d", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Approve</button>
                              <button onClick={()=>{setRejectModal({id:r.id,name:r.name});setRejectReason("");}}
                                style={{ padding:"7px 16px", backgroundColor:"#fff", color:"#dc2626", border:"1.5px solid #dc2626", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Reject</button>
                            </>)}
                            {r.recruiter_status==="rejected" && (
                              <button onClick={()=>handleReconsiderRecruiter(r.id)}
                                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", backgroundColor:"#fff", color:"#d97706", border:"1.5px solid #FDE68A", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                                <RotateCcw size={12}/> Reconsider
                              </button>
                            )}
                            {r.recruiter_status==="approved" && <span style={{ fontSize:11, color:"#94a3b8" }}>Approved {fmtDate(r.recruiter_approved_at)}</span>}
                          </div>
                        </div>
                      ))}
                      {/* rejection reason row, shown inline when present */}
                      {rc.recruiters.filter(r=>r.recruiter_status==="rejected" && r.rejection_reason).map(r=>(
                        <div key={`reason-${r.id}`} style={{ padding:"8px 20px 14px 76px", fontSize:12, color:"#dc2626", backgroundColor:"#FEF2F2", borderBottom:`1px solid ${BORDER}` }}>
                          <strong>{r.name}</strong> — rejection note: {r.rejection_reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Recent Activity */}
              <div>
                <div style={{ ...CARD, marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                    <h3 style={{ fontSize:14, fontWeight:700, margin:0 }}>Recent Activity</h3>
                  </div>
                  {(!rc.activity || rc.activity.length===0) ? (
                    <p style={{ fontSize:12, color:"#94a3b8", margin:0 }}>No recent activity yet.</p>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                      {rc.activity.map(a=>{
                        const { Icon, color } = activityIcon(a.action);
                        return (
                          <div key={a.id} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                            <div style={{ width:28, height:28, borderRadius:"50%", backgroundColor:`${color}1A`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <Icon size={13} color={color}/>
                            </div>
                            <div>
                              <div style={{ fontSize:12.5, fontWeight:600, lineHeight:1.4 }}>
                                {a.recruiter_name} {a.action==="approved"?"approved":a.action==="rejected"?"rejected":"reconsidered"}
                                {a.company_name?` · ${a.company_name}`:""}
                              </div>
                              <div style={{ fontSize:11, color:"#94a3b8" }}>{fmtDateTime(a.created_at)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BOTTOM ROW: workflow, notifications, quick actions */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginTop:20 }}>
              <div style={CARD}>
                <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 16px" }}>Approval Workflow</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {[
                    { n:1, label:"Registration", desc:"Recruiter submits registration", icon:UserPlus },
                    { n:2, label:"Company Documents", desc:"Verify company & legal documents", icon:FileCheck },
                    { n:3, label:"Admin Review", desc:"Review information submitted", icon:Eye },
                    { n:4, label:"Approval", desc:"Approve or reject recruiter", icon:CheckCircle2 },
                  ].map((s,i)=>{
                    const Icon=s.icon;
                    return (
                      <div key={s.n} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                        <div style={{ width:30, height:30, borderRadius:"50%", backgroundColor:O_LITE, color:O, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0 }}>{s.n}</div>
                        <div>
                          <div style={{ fontSize:12.5, fontWeight:700 }}>{s.label}</div>
                          <div style={{ fontSize:11, color:"#94a3b8" }}>{s.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:16, paddingTop:14, borderTop:`1px solid ${BORDER}` }}>
                  <div style={{ textAlign:"center" }}><div style={{ fontSize:18, fontWeight:800, color:"#d97706" }}>{stats.pending??0}</div><div style={{ fontSize:10, color:"#94a3b8" }}>Pending</div></div>
                  <div style={{ textAlign:"center" }}><div style={{ fontSize:18, fontWeight:800, color:"#15803d" }}>{stats.approved??0}</div><div style={{ fontSize:10, color:"#94a3b8" }}>Approved</div></div>
                  <div style={{ textAlign:"center" }}><div style={{ fontSize:18, fontWeight:800, color:"#dc2626" }}>{stats.rejected??0}</div><div style={{ fontSize:10, color:"#94a3b8" }}>Rejected</div></div>
                </div>
              </div>

              <div style={CARD}>
                <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 16px" }}>Notifications</h3>
                {(!rc.activity || rc.activity.length===0) ? (
                  <p style={{ fontSize:12, color:"#94a3b8", margin:0 }}>Nothing new to report.</p>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {rc.activity.slice(0,5).map(a=>(
                      <div key={a.id} style={{ fontSize:12, color:"#374151", display:"flex", gap:8, alignItems:"flex-start" }}>
                        <AlertTriangle size={12} color={O} style={{ marginTop:2, flexShrink:0 }}/>
                        <span>{a.recruiter_name} {a.action} {a.company_name?`(${a.company_name})`:""} — <span style={{ color:"#94a3b8" }}>{fmtDate(a.created_at)}</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={CARD}>
                <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 16px" }}>Quick Actions</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[
                    { label:"View Approved Recruiters", icon:UserCheck, action:()=>updateRecruiterFilter({status:"approved"}) },
                    { label:"View Rejected Recruiters", icon:XCircle, action:()=>updateRecruiterFilter({status:"rejected"}) },
                    { label:"Export Recruiter List", icon:Download, action:handleExportRecruitersCSV },
                    { label:"Refresh Data", icon:RotateCcw, action:()=>fetchRecruiterCenter() },
                  ].map(qa=>{
                    const Icon=qa.icon;
                    return (
                      <button key={qa.label} onClick={qa.action}
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:12.5, fontWeight:600, color:"#374151", textAlign:"left" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=O;e.currentTarget.style.color=O;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.color="#374151";}}>
                        <Icon size={14}/> {qa.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Reject modal */}
            {rejectModal && (
              <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.5)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
                onClick={e=>{ if(e.target===e.currentTarget) setRejectModal(null); }}>
                <div style={{ backgroundColor:"#fff", borderRadius:16, padding:24, width:"100%", maxWidth:420 }}>
                  <h3 style={{ fontSize:16, fontWeight:700, margin:"0 0 4px" }}>Reject {rejectModal.name}?</h3>
                  <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px" }}>Optionally add a reason — this is included in the rejection email and kept in the activity log.</p>
                  <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} rows={3} placeholder="e.g. Company details could not be verified"
                    style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
                  <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"flex-end" }}>
                    <button onClick={()=>setRejectModal(null)} style={{ padding:"9px 18px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#fff", color:"#475569", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                    <button onClick={submitRejectRecruiter} style={{ padding:"9px 18px", border:"none", borderRadius:9, backgroundColor:"#dc2626", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Reject Recruiter</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════ */}
        {/* APPROVED RECRUITERS                             */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="recruiters" && (
          <div>
            <BackBtn/>
            <TabHeader title={`Approved Recruiters (${approvedRecruiters.length})`} subtitle="All recruiters with platform access"/>
            <div style={{ ...CARD, padding:0, overflow:"hidden" }}>
              {approvedRecruiters.length===0 ? (
                <div style={{ padding:"48px", textAlign:"center", color:"#94a3b8" }}>No approved recruiters yet.</div>
              ) : (
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor:"#F8FAFC", borderBottom:`1.5px solid ${BORDER}` }}>
                      {["Name","Email","Phone","Company","Approved At"].map(h=>(
                        <th key={h} style={{ textAlign:"left", padding:"13px 20px", color:"#64748b", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {approvedRecruiters.map((r,i)=>(
                      <tr key={r.id} style={{ borderBottom:`1px solid ${BORDER}`, backgroundColor:i%2===0?"#fff":"#FAFBFC" }}
                        onMouseEnter={e=>e.currentTarget.style.backgroundColor=O_LITE}
                        onMouseLeave={e=>e.currentTarget.style.backgroundColor=i%2===0?"#fff":"#FAFBFC"}>
                        <td style={{ padding:"14px 20px", fontWeight:600 }}>{r.name||"—"}</td>
                        <td style={{ padding:"14px 20px", color:"#475569", fontSize:13 }}>{r.email||"—"}</td>
                        <td style={{ padding:"14px 20px", color:"#475569", fontSize:13 }}>{r.phone||"—"}</td>
                        <td style={{ padding:"14px 20px", color:"#475569", fontSize:13 }}>{r.company_name||r.company||"—"}</td>
                        <td style={{ padding:"14px 20px", color:"#94a3b8", fontSize:13 }}>{r.recruiter_approved_at?new Date(r.recruiter_approved_at).toLocaleDateString():"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* INCENTIVES                                      */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="incentives" && (
          <div>
            <BackBtn/>
            <TabHeader title="Referrer Incentives" subtitle="Manage referral rewards for each referrer"/>
            <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:20 }}>
              <div style={{ ...CARD, alignSelf:"start" }}>
                <h3 style={{ fontSize:15, fontWeight:700, margin:"0 0 18px" }}>Set Incentive</h3>
                <form onSubmit={handleUpdateIncentive} style={{ display:"grid", gap:14 }}>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#475569", marginBottom:6 }}>Select Referrer</label>
                    <select value={incentiveForm.referrerId} onChange={e=>setIncentiveForm({...incentiveForm,referrerId:e.target.value})}
                      style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, color:"#0f172a", backgroundColor:"#FAFBFC", fontFamily:"inherit" }}>
                      <option value="">Choose referrer…</option>
                      {referrers.map(r=><option key={r.id} value={r.id}>{r.name} (₹{r.incentive_value})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#475569", marginBottom:6 }}>Incentive Value (₹)</label>
                    <input type="number" value={incentiveForm.value} onChange={e=>setIncentiveForm({...incentiveForm,value:e.target.value})} placeholder="500"
                      style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, color:"#0f172a", backgroundColor:"#FAFBFC", fontFamily:"inherit", boxSizing:"border-box" }}/>
                  </div>
                  <button type="submit"
                    style={{ padding:"11px", backgroundColor:O, color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}
                    onMouseEnter={e=>e.currentTarget.style.backgroundColor="#d4671e"}
                    onMouseLeave={e=>e.currentTarget.style.backgroundColor=O}>
                    Update Incentive
                  </button>
                </form>
              </div>
              <div style={{ ...CARD, padding:0, overflow:"hidden" }}>
                <div style={{ padding:"16px 20px", borderBottom:`1.5px solid ${BORDER}` }}>
                  <h3 style={{ fontSize:15, fontWeight:700, margin:0 }}>All Referrers & Incentives</h3>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor:"#F8FAFC", borderBottom:`1.5px solid ${BORDER}` }}>
                      {["Name","Email","Company","Incentive","Actions"].map(h=>(
                        <th key={h} style={{ textAlign:"left", padding:"12px 18px", color:"#64748b", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {referrers.map(r=>(
                      editingReferrerId===r.id ? (
                        <tr key={r.id} style={{ borderBottom:`1px solid ${BORDER}`, backgroundColor:"#F8FAFC" }}>
                          <td style={{ padding:"12px 18px", fontWeight:600 }}>{r.name}</td>
                          <td style={{ padding:"12px 18px", fontSize:13, color:"#475569" }}>{r.email}</td>
                          <td style={{ padding:"12px 18px", fontSize:13, color:"#475569" }}>{r.company||"—"}</td>
                          <td style={{ padding:"12px 18px" }}><input type="number" value={editingIncentiveValue} onChange={e=>setEditingIncentiveValue(e.target.value)} style={{ padding:"6px 10px", border:`1.5px solid ${O}`, borderRadius:7, fontSize:13, width:100, fontFamily:"inherit" }}/></td>
                          <td style={{ padding:"12px 18px", display:"flex", gap:6 }}>
                            <button onClick={()=>handleQuickEditIncentive(r.id)} style={{ padding:"5px 12px", backgroundColor:"#15803d", color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600 }}>Save</button>
                            <button onClick={()=>setEditingReferrerId(null)} style={{ padding:"5px 12px", backgroundColor:"#f1f5f9", color:"#475569", border:"none", borderRadius:7, cursor:"pointer", fontSize:12 }}>Cancel</button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={r.id} style={{ borderBottom:`1px solid ${BORDER}` }}
                          onMouseEnter={e=>e.currentTarget.style.backgroundColor="#FAFBFC"}
                          onMouseLeave={e=>e.currentTarget.style.backgroundColor="#fff"}>
                          <td style={{ padding:"12px 18px", fontWeight:600 }}>{r.name}</td>
                          <td style={{ padding:"12px 18px", fontSize:13, color:"#475569" }}>{r.email}</td>
                          <td style={{ padding:"12px 18px", fontSize:13, color:"#475569" }}>{r.company||"—"}</td>
                          <td style={{ padding:"12px 18px" }}><span style={{ fontSize:14, fontWeight:700, color:"#15803d" }}>₹{r.incentive_value}</span></td>
                          <td style={{ padding:"12px 18px", display:"flex", gap:6 }}>
                            <button onClick={()=>{setEditingReferrerId(r.id);setEditingIncentiveValue(r.incentive_value.toString());}} style={{ padding:"5px 12px", backgroundColor:"#3b82f6", color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600 }}>Edit</button>
                            <button onClick={()=>handleRevokeIncentive(r.id)} style={{ padding:"5px 12px", backgroundColor:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600 }}>Revoke</button>
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

        {/* ═══════════════════════════════════════════════ */}
        {/* JOBS LIST                                       */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="jobs-list" && (
          <div>
            <BackBtn/>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <TabHeader title={`All Jobs (${jobs.length})`} subtitle="Manage and control job statuses"/>
              {selectedJobs.size>0 && (
                <button onClick={handleDeleteSelectedJobs} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", backgroundColor:"#fef2f2", color:"#dc2626", border:"1.5px solid #fecaca", borderRadius:9, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                  <Trash2 size={14}/> Delete ({selectedJobs.size})
                </button>
              )}
            </div>
            <div style={{ ...CARD, padding:0, overflow:"hidden" }}>
              {jobs.length===0 ? (
                <div style={{ padding:"48px", textAlign:"center", color:"#94a3b8" }}>No jobs yet.</div>
              ) : (
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor:"#F8FAFC", borderBottom:`1.5px solid ${BORDER}` }}>
                        <th style={{ padding:"13px 16px", width:44 }}>
                          <input type="checkbox" checked={selectAll} onChange={handleSelectAll} style={{ cursor:"pointer", width:16, height:16 }}/>
                        </th>
                        {["Job Title","Department","Location","Type","Experience","Salary","Status"].map(h=>(
                          <th key={h} style={{ textAlign:"left", padding:"13px 16px", color:"#64748b", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job,i)=>(
                        <tr key={job.id} onClick={()=>window.location.href=`/admin/jobs/${job.id}`}
                          style={{ borderBottom:`1px solid ${BORDER}`, backgroundColor:selectedJobs.has(job.id)?"#EFF6FF":i%2===0?"#fff":"#FAFBFC", cursor:"pointer" }}
                          onMouseEnter={e=>e.currentTarget.style.backgroundColor=O_LITE}
                          onMouseLeave={e=>e.currentTarget.style.backgroundColor=selectedJobs.has(job.id)?"#EFF6FF":i%2===0?"#fff":"#FAFBFC"}>
                          <td style={{ padding:"13px 16px" }} onClick={e=>e.stopPropagation()}>
                            <input type="checkbox" checked={selectedJobs.has(job.id)} onChange={()=>handleSelectJob(job.id)} style={{ cursor:"pointer", width:16, height:16 }}/>
                          </td>
                          <td style={{ padding:"13px 16px", fontWeight:600 }}>{job.job_title}</td>
                          <td style={{ padding:"13px 16px", color:"#475569", fontSize:13 }}>{job.department}</td>
                          <td style={{ padding:"13px 16px", color:"#475569", fontSize:13 }}>{job.location}</td>
                          <td style={{ padding:"13px 16px", color:"#475569", fontSize:13 }}>{job.job_type}</td>
                          <td style={{ padding:"13px 16px", color:"#475569", fontSize:13 }}>{job.experience_required||"—"}</td>
                          <td style={{ padding:"13px 16px", color:"#475569", fontSize:13 }}>{job.salary_range||"—"}</td>
                          <td style={{ padding:"13px 16px" }} onClick={e=>e.stopPropagation()}>
                            <select value={job.status||"active"} onChange={e=>handleJobStatusChange(job.id,e.target.value)}
                              style={{ padding:"5px 10px", borderRadius:7, border:`1.5px solid ${BORDER}`, fontSize:12, color:job.status==="active"?"#15803d":"#64748b", backgroundColor:"#FAFBFC", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
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

        {/* ═══════════════════════════════════════════════ */}
        {/* BULK JOBS                                       */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="bulk-jobs" && (
          <div>
            <BackBtn/>
            <TabHeader title="Bulk Upload Jobs" subtitle="Upload a CSV file with job listings"/>
            <div style={{ ...CARD }}>
              <p style={{ color:"#475569", marginBottom:20, fontSize:14 }}>Download template: <a href="/Job_Upload.csv" download style={{ color:O, fontWeight:600 }}>Job_Upload.csv</a></p>
              <div style={{ border:`2px dashed ${BORDER}`, borderRadius:14, padding:"40px", textAlign:"center", backgroundColor:"#FAFBFC" }}>
                <Upload size={36} color={O} style={{ display:"block", margin:"0 auto 12px" }}/>
                <p style={{ color:"#475569", fontWeight:600, marginBottom:8 }}>Click to browse CSV</p>
                <input type="file" accept=".csv" onChange={handleBulkUploadJobs} disabled={uploadingJobs} style={{ display:"block", margin:"0 auto", cursor:uploadingJobs?"not-allowed":"pointer" }}/>
                {uploadingJobs && <p style={{ color:O, marginTop:14, fontWeight:600 }}>Uploading…</p>}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* BULK CANDIDATES                                 */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="bulk-candidates" && (
          <div>
            <BackBtn/>
            <TabHeader title="Bulk Upload Candidates" subtitle="Upload a CSV file with candidate information"/>
            <div style={{ ...CARD }}>
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20 }}>
                <button onClick={()=>window.location.href="/admin/bulk-candidates"}
                  style={{ padding:"9px 20px", backgroundColor:O, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                  View Bulk Candidates →
                </button>
              </div>
              <p style={{ color:"#475569", marginBottom:20, fontSize:14 }}>Download template: <a href="/Candidate_Upload.csv" download style={{ color:O, fontWeight:600 }}>Candidate_Upload.csv</a></p>
              <div style={{ border:`2px dashed ${BORDER}`, borderRadius:14, padding:"40px", textAlign:"center", backgroundColor:"#FAFBFC" }}>
                <Upload size={36} color="#10b981" style={{ display:"block", margin:"0 auto 12px" }}/>
                <p style={{ color:"#475569", fontWeight:600, marginBottom:4 }}>Click to browse CSV</p>
                <input type="file" accept=".csv" onChange={handleBulkUploadCandidates} disabled={uploadingCandidates} style={{ display:"block", margin:"0 auto", cursor:uploadingCandidates?"not-allowed":"pointer" }}/>
                {uploadingCandidates && <p style={{ color:"#10b981", marginTop:14, fontWeight:600 }}>Uploading…</p>}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* POST JOB                                        */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="jobs" && (
          <div>
            <BackBtn/>
            <TabHeader title="Post New Job"/>
            <div style={{ ...CARD }}>
              <p style={{ color:"#475569", fontSize:14, marginBottom:16 }}>Create a new job posting on the platform.</p>
              <button onClick={()=>window.location.href="/admin/post-job"}
                style={{ padding:"11px 24px", backgroundColor:O, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"inherit" }}>
                Create New Job Posting →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* MANAGE STATUS                                   */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="manage-status" && (() => {
          const ov = statusOverview;
          const overviewCards = ov ? [
            { key:"all", label:"Total Candidates", value:ov.total, icon:Users, color:"#1d4ed8", bg:"#EFF6FF" },
            { key:"Contacted", label:"Contacted", value:ov.counts?.Contacted??0, icon:Phone, color:"#0891b2", bg:"#ECFEFF" },
            { key:"Interview Scheduled", label:"Interview Scheduled", value:ov.counts?.["Interview Scheduled"]??0, icon:Calendar, color:O, bg:O_LITE },
            { key:"Offered", label:"Offered", value:ov.counts?.Offered??0, icon:Gift, color:"#7c3aed", bg:"#F3E8FF" },
            { key:"Hired", label:"Hired", value:ov.counts?.Hired??0, icon:CheckCircle2, color:"#15803d", bg:"#DCFCE7" },
            { key:"Rejected", label:"Rejected", value:ov.counts?.Rejected??0, icon:XCircle, color:"#dc2626", bg:"#FEF2F2" },
            { key:"On Hold", label:"On Hold", value:ov.counts?.["On Hold"]??0, icon:Clock, color:"#d97706", bg:"#FEF3C7" },
          ] : [];

          const scoreColor = (score) => score===null||score===undefined ? "#94a3b8" : score>=85?"#15803d":score>=70?"#16a34a":score>=55?"#0891b2":score>=40?"#d97706":"#dc2626";

          const SourceTag = ({ source }) => (
            <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:999, letterSpacing:"0.03em",
              backgroundColor:source==="portal"?"#EFF6FF":"#FFF7ED", color:source==="portal"?"#1d4ed8":O, border:`1px solid ${source==="portal"?"#BFDBFE":O_MID}` }}>
              {source==="portal"?"PORTAL":"BULK"}
            </span>
          );

          return (
          <div>
            <BackBtn/>
            {/* Hero banner */}
            <div style={{ background:"linear-gradient(135deg,#f8fafc 0%,#fff7ed 100%)", border:`1.5px solid ${BORDER}`, borderRadius:18, padding:"26px 32px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <h2 style={{ fontSize:23, fontWeight:800, margin:"0 0 4px" }}>Candidate Status Management</h2>
                <p style={{ fontSize:13, color:"#64748b", margin:0 }}>Track candidate progress, evaluate suitability, and make data-driven hiring decisions across portal and bulk-uploaded candidates.</p>
              </div>
              <div style={{ width:68, height:68, borderRadius:18, background:`linear-gradient(135deg,#fff 0%,${O_LITE} 100%)`, border:`1.5px solid ${O_MID}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Sparkles size={30} color={O}/>
              </div>
            </div>

            {/* Overview stat strip */}
            <div style={{ ...CARD, marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <h3 style={{ fontSize:14, fontWeight:700, margin:0 }}>Overview</h3>
                <span style={{ fontSize:11, color:"#94a3b8" }}>Click a card to filter the table below</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:`repeat(${overviewCards.length||7},1fr)`, gap:10 }}>
                {overviewCards.map(c=>{
                  const Icon=c.icon;
                  const active = c.key==="all" ? statusFilters.status==="all" : statusFilters.status===c.key;
                  return (
                    <div key={c.key} onClick={()=>updateStatusFilter({status:c.key})}
                      style={{ padding:"14px 10px", backgroundColor:active?c.bg:"#F8FAFC", borderRadius:12, textAlign:"center", border:`1.5px solid ${active?c.color:BORDER}`, cursor:"pointer", transition:"all 0.15s" }}>
                      <div style={{ width:30, height:30, borderRadius:9, backgroundColor:c.bg, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px" }}>
                        <Icon size={14} color={c.color}/>
                      </div>
                      <div style={{ fontSize:20, fontWeight:800, color:c.color }}>{c.value}</div>
                      <div style={{ fontSize:10.5, color:"#64748b", fontWeight:600 }}>{c.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter bar */}
            <div style={{ ...CARD, padding:"16px 20px", marginBottom:0, borderRadius:"16px 16px 0 0", borderBottom:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#F8FAFC", flex:"1 1 220px" }}>
                  <Search size={14} color="#94a3b8"/>
                  <input value={statusFilters.search} onChange={e=>setStatusFilters({...statusFilters,search:e.target.value})}
                    onKeyDown={e=>e.key==="Enter"&&updateStatusFilter({search:statusFilters.search})}
                    placeholder="Search by name, email, phone or skills..."
                    style={{ border:"none", outline:"none", fontSize:13, background:"transparent", fontFamily:"inherit", width:"100%" }}/>
                  {statusFilters.search && <button onClick={()=>updateStatusFilter({search:""})} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}><X size={13}/></button>}
                </div>

                {/* Source tag filter pills — Portal vs Bulk, as requested */}
                <div style={{ display:"flex", gap:6, padding:4, backgroundColor:"#F8FAFC", border:`1.5px solid ${BORDER}`, borderRadius:9 }}>
                  {[["all","All Sources"],["portal","Portal"],["bulk","Bulk"]].map(([id,label])=>(
                    <button key={id} onClick={()=>updateStatusFilter({source:id})}
                      style={{ padding:"6px 13px", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                        backgroundColor:statusFilters.source===id?O:"transparent", color:statusFilters.source===id?"#fff":"#64748b" }}>
                      {label}
                    </button>
                  ))}
                </div>

                <select value={statusFilters.status} onChange={e=>updateStatusFilter({status:e.target.value})}
                  style={{ padding:"8px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, backgroundColor:"#FAFBFC", fontFamily:"inherit", color:"#374151" }}>
                  <option value="all">All Status</option>
                  {(statusFilterOptions.statuses||[]).map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <select value={statusFilters.location} onChange={e=>updateStatusFilter({location:e.target.value})}
                  style={{ padding:"8px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, backgroundColor:"#FAFBFC", fontFamily:"inherit", color:"#374151" }}>
                  <option value="all">All Locations</option>
                  {(statusFilterOptions.locations||[]).map(l=><option key={l} value={l}>{l}</option>)}
                </select>
                <select value={statusFilters.skill} onChange={e=>updateStatusFilter({skill:e.target.value})}
                  style={{ padding:"8px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, backgroundColor:"#FAFBFC", fontFamily:"inherit", color:"#374151", maxWidth:160 }}>
                  <option value="all">All Skills</option>
                  {(statusFilterOptions.skills||[]).slice(0,60).map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={handleExportStatusCSV} disabled={exportingStatusCSV}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#fff", color:"#475569", fontSize:12, fontWeight:700, cursor:exportingStatusCSV?"not-allowed":"pointer", fontFamily:"inherit" }}>
                  <Download size={13}/> {exportingStatusCSV?"Exporting…":"Export"}
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ ...CARD, padding:0, overflow:"hidden", borderRadius:"0 0 16px 16px" }}>
              <div style={{ padding:"12px 20px", borderBottom:`1.5px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-between", backgroundColor:"#FAFBFC" }}>
                <span style={{ fontWeight:700, fontSize:13, color:"#374151" }}>
                  {statusPagination.total} candidate{statusPagination.total===1?"":"s"} found
                  <span style={{ marginLeft:10, fontSize:11, color:"#94a3b8", fontWeight:500 }}>
                    ({statusPagination.portalCount} portal · {statusPagination.bulkCount} bulk)
                  </span>
                </span>
              </div>

              {statusLoading ? (
                <div style={{ padding:"60px", textAlign:"center", color:"#94a3b8" }}>Loading…</div>
              ) : statusList.length===0 ? (
                <div style={{ padding:"56px", textAlign:"center", color:"#94a3b8" }}>No candidates match these filters.</div>
              ) : (
                <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:1100 }}>
                  <thead>
                    <tr style={{ backgroundColor:"#F8FAFC", borderBottom:`1.5px solid ${BORDER}` }}>
                      {["Candidate","Contact","Location","Role","AI Suitability Score","Current Status","Update Status","Updated At","Actions"].map(h=>(
                        <th key={h} style={{ textAlign:"left", padding:"12px 16px", color:"#64748b", fontWeight:700, fontSize:10.5, textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statusList.map((c,i)=>{
                      const [abg,afg]=avatarColor(c.name);
                      const key = `${c._source}-${c.id}`;
                      return (
                        <tr key={key} style={{ borderBottom:`1px solid ${BORDER}`, backgroundColor:i%2===0?"#fff":"#FAFBFC" }}
                          onMouseEnter={e=>e.currentTarget.style.backgroundColor=O_LITE}
                          onMouseLeave={e=>e.currentTarget.style.backgroundColor=i%2===0?"#fff":"#FAFBFC"}>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:36, height:36, borderRadius:"50%", backgroundColor:abg, color:afg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                                {initials(c.name)}
                              </div>
                              <div>
                                <div style={{ fontSize:13, fontWeight:700 }}>{c.name||"—"}</div>
                                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                                  <SourceTag source={c._source}/>
                                  <span style={{ fontSize:11, color:"#94a3b8" }}>{c.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px", fontSize:12, color:"#475569" }}>{c.contact||"—"}</td>
                          <td style={{ padding:"12px 16px", fontSize:12, color:"#475569" }}>{c.current_location||"—"}</td>
                          <td style={{ padding:"12px 16px", fontSize:12, color:"#475569" }}>
                            {c.job_role||"—"}{c.experience?<div style={{ fontSize:11, color:"#94a3b8" }}>{c.experience} yrs exp</div>:null}
                          </td>
                          <td style={{ padding:"12px 16px" }}>
                            {c.ai_suitability_score===null||c.ai_suitability_score===undefined ? (
                              <span style={{ fontSize:11, color:"#94a3b8", fontStyle:"italic" }}>Not scored</span>
                            ) : (
                              <div title={c.ai_score_breakdown?.matchedJob ? `Best match: ${c.ai_score_breakdown.matchedJob}` : ""}>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                  <div style={{ width:46, height:6, borderRadius:4, backgroundColor:"#F1F5F9", overflow:"hidden" }}>
                                    <div style={{ width:`${c.ai_suitability_score}%`, height:"100%", backgroundColor:scoreColor(c.ai_suitability_score) }}/>
                                  </div>
                                  <span style={{ fontSize:12, fontWeight:800, color:scoreColor(c.ai_suitability_score) }}>{c.ai_suitability_score}%</span>
                                </div>
                                <div style={{ fontSize:10.5, color:scoreColor(c.ai_suitability_score), fontWeight:600, marginTop:2 }}>{c.ai_score_label}</div>
                              </div>
                            )}
                          </td>
                          <td style={{ padding:"12px 16px" }}><Badge label={c.candidate_status||"New"}/></td>
                          <td style={{ padding:"12px 16px" }}>
                            <select value={c.candidate_status||"New"} onChange={e=>handleUpdateUnifiedStatus(c._source,c.id,e.target.value)} disabled={statusUpdating===key}
                              style={{ padding:"6px 10px", border:`1.5px solid ${BORDER}`, borderRadius:8, fontSize:12, backgroundColor:"#FAFBFC", color:"#0f172a", cursor:statusUpdating===key?"not-allowed":"pointer", fontFamily:"inherit", opacity:statusUpdating===key?0.5:1 }}>
                              {CANDIDATE_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td style={{ padding:"12px 16px", color:"#94a3b8", fontSize:11.5, whiteSpace:"nowrap" }}>{fmtDate(c.status_updated_at||c.created_at)}</td>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>setSelectedCandidate({...c,_type:c._source})}
                                title="View profile"
                                style={{ padding:"6px 10px", border:`1.5px solid ${BORDER}`, borderRadius:7, backgroundColor:"#fff", color:"#475569", cursor:"pointer", display:"flex", alignItems:"center" }}>
                                <Eye size={13}/>
                              </button>
                              {(c.resume_link) && (
                                <a href={c.resume_link} target="_blank" rel="noreferrer" title="View CV"
                                  style={{ padding:"6px 10px", border:`1.5px solid ${O_MID}`, borderRadius:7, backgroundColor:O_LITE, color:O, cursor:"pointer", display:"flex", alignItems:"center", textDecoration:"none" }}>
                                  <FileCheck size={13}/>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}

              {/* Pagination */}
              {statusPagination.total>0 && (
                <div style={{ padding:"14px 20px", borderTop:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                  <span style={{ fontSize:12, color:"#64748b" }}>
                    Showing {((statusFilters.page-1)*statusFilters.limit)+1} to {Math.min(statusFilters.page*statusFilters.limit,statusPagination.total)} of {statusPagination.total} candidates
                  </span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <select value={statusFilters.limit} onChange={e=>updateStatusFilter({limit:parseInt(e.target.value),page:1})}
                      style={{ padding:"5px 8px", border:`1.5px solid ${BORDER}`, borderRadius:7, fontSize:12, backgroundColor:"#fff", fontFamily:"inherit" }}>
                      {[10,25,50,100].map(n=><option key={n} value={n}>{n} / page</option>)}
                    </select>
                    <button onClick={()=>updateStatusFilter({page:Math.max(1,statusFilters.page-1)})} disabled={statusFilters.page<=1}
                      style={{ width:30, height:30, borderRadius:7, border:`1.5px solid ${BORDER}`, backgroundColor:"#fff", cursor:statusFilters.page<=1?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:statusFilters.page<=1?0.4:1 }}>
                      <ChevronLeft size={14}/>
                    </button>
                    <span style={{ fontSize:12, fontWeight:700, color:"#374151" }}>{statusFilters.page} / {statusPagination.totalPages}</span>
                    <button onClick={()=>updateStatusFilter({page:Math.min(statusPagination.totalPages,statusFilters.page+1)})} disabled={statusFilters.page>=statusPagination.totalPages}
                      style={{ width:30, height:30, borderRadius:7, border:`1.5px solid ${BORDER}`, backgroundColor:"#fff", cursor:statusFilters.page>=statusPagination.totalPages?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:statusFilters.page>=statusPagination.totalPages?0.4:1 }}>
                      <ChevronRight size={14}/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })()}


        {/* ═══════════════════════════════════════════════ */}
        {/* AI RESUME PARSER                                */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="resume-parse" && (
          <div>
            <BackBtn/>
            <TabHeader title="AI Resume Parser" subtitle="Paste resume PDF links — Claude AI extracts candidate data automatically"/>
            <div style={{ ...CARD, marginBottom:20 }}>
              <div style={{ backgroundColor:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:12, padding:"14px 18px", marginBottom:22, display:"flex", gap:12 }}>
                <span style={{ fontSize:22, flexShrink:0 }}>🤖</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:"#92400e", marginBottom:4 }}>How it works</div>
                  <div style={{ fontSize:12, color:"#78350f", lineHeight:1.7 }}>Paste one PDF URL per line · Click Parse · Claude AI extracts: <strong>Name, Email, Phone, Location, Qualification, Experience, Company, Skills</strong> · Candidates auto-added with unique <strong>RES-YYYY-NNNNN</strong> ID.</div>
                </div>
              </div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:8 }}>Resume PDF URLs <span style={{ fontWeight:400, color:"#94a3b8" }}>(one per line, max 50)</span></label>
              <textarea value={resumeLinks} onChange={e=>setResumeLinks(e.target.value)} rows={7}
                placeholder={"https://example.com/resume1.pdf\nhttps://drive.google.com/uc?id=...\nhttps://dropbox.com/s/.../resume.pdf"}
                style={{ width:"100%", padding:"12px 14px", fontSize:13, fontFamily:"monospace", border:`1.5px solid ${BORDER}`, borderRadius:10, outline:"none", resize:"vertical", color:"#0f172a", backgroundColor:"#FAFBFC", boxSizing:"border-box", lineHeight:1.7 }}
                onFocus={e=>e.target.style.borderColor=O} onBlur={e=>e.target.style.borderColor=BORDER}/>
              <div style={{ fontSize:12, color:"#94a3b8", marginTop:5, marginBottom:16 }}>{resumeLinks.split("\n").filter(l=>l.trim().startsWith("http")).length} valid URL(s) detected</div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={handleBulkParseResumes} disabled={parsingResumes}
                  style={{ padding:"11px 26px", backgroundColor:parsingResumes?"#FEF3C7":O, color:parsingResumes?"#c2410c":"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:parsingResumes?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8 }}>
                  {parsingResumes?(<><span style={{ display:"inline-block", width:14, height:14, border:"2px solid #c2410c", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/> Parsing…</>):"🤖 Parse Resumes"}
                </button>
                {!parsingResumes && <button onClick={()=>{setResumeLinks("");setParseResults(null);}} style={{ padding:"11px 20px", backgroundColor:"#fff", color:"#64748b", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Clear</button>}
              </div>
            </div>
            {parseResults && (
              <div style={{ ...CARD }}>
                <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
                  {[{label:"Total",value:parseResults.totalLinks,bg:"#F8FAFC",color:"#374151"},{label:"✅ Parsed",value:parseResults.parsedCount,bg:"#f0fdf4",color:"#166534"},{label:"❌ Failed",value:parseResults.errorCount,bg:"#fef2f2",color:"#dc2626"}].map(s=>(
                    <div key={s.label} style={{ flex:"1 1 110px", backgroundColor:s.bg, borderRadius:12, padding:"14px", textAlign:"center", border:`1.5px solid ${BORDER}` }}>
                      <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:12, color:s.color, fontWeight:600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {parseResults.candidates?.map((c,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", marginBottom:8, backgroundColor:"#FAFBFC", border:`1.5px solid ${BORDER}`, borderLeft:`4px solid ${O}`, borderRadius:10 }}>
                    <div style={{ width:38, height:38, borderRadius:"50%", backgroundColor:O_LITE, color:O, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                      {initials(c.name)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700 }}>{c.name}</div>
                      <div style={{ fontSize:12, color:"#64748b" }}>{c.email} · {c.contact}</div>
                    </div>
                    <div style={{ fontSize:11, color:"#94a3b8", textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontWeight:700, color:O, marginBottom:2 }}>{c.candidate_id}</div>
                      <div>{c.current_location||"—"} · {c.experience?`${c.experience} yrs`:"—"}</div>
                    </div>
                    <button onClick={()=>window.open(`/admin/bulk-candidates/${c.id}`,"_blank")}
                      style={{ padding:"6px 14px", backgroundColor:O, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}>View</button>
                  </div>
                ))}
                {parseResults.errors?.map((e,i)=>(
                  <div key={i} style={{ padding:"10px 14px", marginBottom:6, backgroundColor:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, fontSize:13 }}>
                    <span style={{ fontWeight:600, color:"#dc2626" }}>#{e.index}</span>
                    <span style={{ color:"#374151", marginLeft:8 }}>{e.url}</span>
                    <span style={{ color:"#dc2626", marginLeft:8 }}>— {e.error}</span>
                  </div>
                ))}
                <button onClick={()=>window.location.href="/admin/bulk-candidates"}
                  style={{ marginTop:16, padding:"10px 22px", backgroundColor:O, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  View All Bulk Candidates →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* CANDIDATE DETAIL MODAL                              */}
      {/* ═══════════════════════════════════════════════════ */}
      {selectedCandidate && (
        <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.5)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:24, animation:"fadeIn 0.15s ease" }}
          onClick={e=>{ if(e.target===e.currentTarget)setSelectedCandidate(null); }}>
          <div style={{ backgroundColor:"#fff", borderRadius:20, padding:0, width:"100%", maxWidth:600, maxHeight:"90vh", overflow:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.2)" }}>
            {/* Modal header */}
            <div style={{ padding:"24px 28px 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between", position:"sticky", top:0, backgroundColor:"#fff", borderBottom:`1.5px solid ${BORDER}`, paddingBottom:20, zIndex:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                {(() => { const [bg,fg]=avatarColor(selectedCandidate.name); return (
                  <div style={{ width:52, height:52, borderRadius:"50%", backgroundColor:bg, color:fg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, flexShrink:0 }}>
                    {initials(selectedCandidate.name)}
                  </div>
                ); })()}
                <div>
                  <h2 style={{ fontSize:18, fontWeight:700, margin:"0 0 3px" }}>{selectedCandidate.name||"—"}</h2>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <Badge
                      label={selectedCandidate._type==="referred"?"Referred":selectedCandidate._type==="bulk"?"Bulk Upload":"Portal"}
                      color={selectedCandidate._type==="referred"?"#15803d":selectedCandidate._type==="bulk"?O:"#1d4ed8"}
                      bg={selectedCandidate._type==="referred"?"#DCFCE7":selectedCandidate._type==="bulk"?O_LITE:"#EFF6FF"}
                      border={selectedCandidate._type==="referred"?"#86efac":selectedCandidate._type==="bulk"?O_MID:"#BFDBFE"}
                    />
                    {selectedCandidate.status && <Badge label={selectedCandidate.status} color="#7c3aed" bg="#F3E8FF" border="#d8b4fe"/>}
                  </div>
                </div>
              </div>
              <button onClick={()=>setSelectedCandidate(null)}
                style={{ width:34, height:34, borderRadius:"50%", border:`1.5px solid ${BORDER}`, backgroundColor:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={16} color="#64748b"/>
              </button>
            </div>
            {/* Modal body */}
            <div style={{ padding:"24px 28px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                {[
                  { icon:Mail, label:"Email", value:selectedCandidate.email },
                  { icon:Phone, label:"Phone", value:selectedCandidate.phone||selectedCandidate.contact },
                  { icon:Building2, label:"Company", value:selectedCandidate.company },
                  { icon:Award, label:"Experience", value:selectedCandidate.experience ? `${selectedCandidate.experience} yrs` : null },
                  { icon:Calendar, label:"Joined On", value:fmtDate(selectedCandidate.created_at||selectedCandidate.referred_at) },
                  { icon:Users, label:"Department", value:selectedCandidate.department||selectedCandidate.industry },
                ].filter(f=>f.value).map(({ icon:Icon, label, value })=>(
                  <div key={label} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"14px", backgroundColor:"#F8FAFC", borderRadius:12, border:`1.5px solid ${BORDER}` }}>
                    <div style={{ width:34, height:34, borderRadius:9, backgroundColor:O_LITE, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon size={15} color={O}/>
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.04em" }}>{label}</div>
                      <div style={{ fontSize:14, fontWeight:600, color:"#0f172a", marginTop:2 }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {selectedCandidate.skills && (
                <div style={{ marginTop:16, padding:"14px", backgroundColor:"#F8FAFC", borderRadius:12, border:`1.5px solid ${BORDER}` }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:10 }}>Skills</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {selectedCandidate.skills.split(",").map(s=>s.trim()).filter(Boolean).map(s=>(
                      <span key={s} style={{ fontSize:12, fontWeight:600, padding:"4px 12px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:999, color:"#374151" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {selectedCandidate.linkedin && (
                <a href={selectedCandidate.linkedin} target="_blank" rel="noreferrer"
                  style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:16, padding:"9px 18px", backgroundColor:"#0A66C2", color:"#fff", borderRadius:9, fontSize:13, fontWeight:700, textDecoration:"none" }}>
                  View LinkedIn Profile →
                </a>
              )}
              {/* Full details link for portal candidates */}
              {selectedCandidate._type==="portal" && selectedCandidate.id && (
                <button onClick={()=>window.location.href=`/admin/candidates/${selectedCandidate.id}`}
                  style={{ display:"block", width:"100%", marginTop:16, padding:"11px", backgroundColor:O, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  Open Full Profile →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
