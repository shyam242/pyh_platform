"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Users, Briefcase, UserCheck, LogOut, Trash2, Upload,
  ChevronDown, ChevronRight, X, Info, Megaphone, ShieldCheck,
  UserPlus, Zap, BarChart2, Home, Search, Filter, Eye,
  Mail, Phone, Building2, Calendar, Award, MoreVertical, ExternalLink,
  Pencil, Pause, Play, RotateCcw, MapPin, PlusCircle, Target, Sparkles, Plus,
  CheckCircle2, XCircle, Clock, ThumbsUp, ThumbsDown, PhoneOff, Star, AlertCircle
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#E2E8F0";
// Selectable hiring-pipeline stages — also used to decide whether a stored
// candidate_status is a "real" stage vs a referral-invite label like
// "Awaiting Candidate"/"Accepted"/"Referred" that isn't itself selectable.
const PIPELINE_STATUSES = ["Contacted","Interested","Not Interested","No Response","Shortlisted","Interview Scheduled","Interview Cleared","Offered","Hired","Rejected","On Hold"];
const CARD = { backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "24px" };

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
  const [recruiterStatuses, setRecruiterStatuses] = useState([]); // private per-recruiter candidate status tags (admin-only view)
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
  const [jobSearch, setJobSearch] = useState("");
  const [jobDeptFilter, setJobDeptFilter] = useState("All");
  const [jobLocFilter, setJobLocFilter] = useState("All");
  const [jobStatusFilter, setJobStatusFilter] = useState("All");
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPerPage] = useState(10);
  const [openJobMenuId, setOpenJobMenuId] = useState(null);
  const [bulkCandidates, setBulkCandidates] = useState([]);
  const [candidateStatusStats, setCandidateStatusStats] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedCard, setExpandedCard] = useState(null);
  const [resumeLinks, setResumeLinks] = useState("");
  const [resumeUploadMode, setResumeUploadMode] = useState("links"); // 'links' | 'files'
  const [resumeFiles, setResumeFiles] = useState([]);
  const [uploadingResumeFiles, setUploadingResumeFiles] = useState(false);
  const [parsingResumes, setParsingResumes] = useState(false);
  const [parseResults, setParseResults] = useState(null);
  // Candidate tab sub-filter: "all" | "referred" | "bulk"
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [recSearch, setRecSearch] = useState("");
  const [recCompany, setRecCompany] = useState("All");
  const [recSearchA, setRecSearchA] = useState("");
  const [recCompanyA, setRecCompanyA] = useState("All");
  const [recPage, setRecPage] = useState(1);
  const [recPerPage, setRecPerPage] = useState(10);
  const [statusSearch, setStatusSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter2, setStatusFilter2] = useState("all");
  const [locationFilter, setLocationFilter] = useState("All");
  const [statusCandidates, setStatusCandidates] = useState([]); // unified: portal + bulk + referred
  const [statusListLoading, setStatusListLoading] = useState(false);
  const [exportingStatus, setExportingStatus] = useState(false);
  const [incPage, setIncPage] = useState(1);
  const [incSearch, setIncSearch] = useState("");
  const clickTimers = useRef({});

  // ── Keyboard shortcuts ──────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (!e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (["INPUT","TEXTAREA","SELECT"].includes(tag)) return;
    switch (e.key.toLowerCase()) {
      case "c": e.preventDefault(); setActiveTab("bulk-candidates"); break;
      case "j": e.preventDefault(); window.location.href = "/admin/post-job"; break;
      case "r": e.preventDefault(); setActiveTab("pending-recruiters"); fetchPendingRecruiters(); break;
      case "p": e.preventDefault(); setActiveTab("resume-parse"); break;
      case "v": e.preventDefault(); setActiveTab("resume-parse"); break;
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
    if (activeTab === "candidates") { fetchDashboardData(); fetchReferredCandidates(); fetchBulkCandidates(); }
    if (activeTab === "referred-candidates") fetchReferredCandidates();
    if (activeTab === "recruiter-status") fetchRecruiterStatuses();
    if (activeTab === "jobs-list" || activeTab === "jobs") fetchJobs();
    if (activeTab === "manage-status") { fetchCandidateStatusList(); }
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
    } catch (err) {
      console.error("Failed to load referred candidates:", err);
      showError("Failed to load referred candidates");
    }
  };
  const fetchRecruiterStatuses = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/admin/recruiter-candidate-statuses`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setRecruiterStatuses(r.data.statuses || []);
    } catch (err) {
      console.error("Failed to load recruiter candidate statuses:", err);
      showError("Failed to load recruiter statuses");
    }
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
  // Unified candidate-status list: merges portal signups + bulk uploads + referred candidates
  const fetchCandidateStatusList = async () => {
    try {
      setStatusListLoading(true);
      const r = await axios.get(`${API_BASE_URL}/api/admin/candidate-status/list?limit=5000`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setStatusCandidates(r.data.candidates || []);
    } catch { showError("Failed to load candidate status list"); } finally { setStatusListLoading(false); }
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

  // ── Actions ────────────────────────────────────────────────
  const handleUpdateCandidateStatus = async (source, id, status) => {
    try {
      setUpdatingStatus(id);
      await axios.put(`${API_BASE_URL}/api/admin/candidate-status/${source}/${id}`, { candidate_status: status }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      showSuccess(`Status updated`); fetchCandidateStatusList();
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
    try { await axios.put(`${API_BASE_URL}/api/jobs/${id}`, { status }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); showSuccess(`Job ${status==="closed"?"closed":status==="inactive"?"paused":"reactivated"}`); fetchJobs(); }
    catch { showError("Failed to update job"); }
  };
  const handleDeleteJob = async (id) => {
    if (!confirm("Delete this job? This cannot be undone.")) return;
    try { await axios.delete(`${API_BASE_URL}/api/jobs/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); showSuccess("Job deleted"); fetchJobs(); }
    catch { showError("Failed to delete job"); }
  };
  const jobCode = (job) => `PYH-JB-${String(job.id).padStart(3,"0")}`;
  const jobStatusMeta = (status) => ({
    active:   { label: "Active",  bg: "#DCFCE7", color: "#15803d", border: "#86efac", dot: "#15803d" },
    inactive: { label: "Paused",  bg: "#FEF3C7", color: "#b45309", border: "#fde68a", dot: "#b45309" },
    closed:   { label: "Closed",  bg: "#FEF2F2", color: "#dc2626", border: "#fecaca", dot: "#dc2626" },
  }[status] || { label: status||"—", bg: "#F1F5F9", color: "#64748b", border: BORDER, dot: "#64748b" });
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

  const handleBulkUploadResumeFiles = async () => {
    if(!resumeFiles.length){showError("Choose PDF files to upload");return;}
    if(resumeFiles.length>50){showError("Max 50 files per batch");return;}
    try {
      setUploadingResumeFiles(true); setParseResults(null);
      const fd=new FormData();
      resumeFiles.forEach(f=>fd.append("resumes",f));
      const r=await axios.post(`${API_BASE_URL}/api/admin/bulk-upload/resume-files`,fd,{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`,"Content-Type":"multipart/form-data"}});
      setParseResults(r.data);
      if(r.data.parsedCount>0)showSuccess(`${r.data.parsedCount} parsed automatically`);
      if(r.data.needsReviewCount>0)showError(`${r.data.needsReviewCount} saved — need manual review (unreadable file, e.g. image/scanned resume)`);
      if(r.data.errorCount>0)showError(`${r.data.errorCount} failed`);
    } catch (err) { showError(err.response?.data?.message || "Failed to upload resumes"); }
    finally { setUploadingResumeFiles(false); }
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
    { id:"overview", label:"Overview" },
    { id:"candidates", label:"Total Candidates" },
    { id:"referred-candidates", label:"Referred Candidates" },
    { id:"manage-status", label:"Candidate Status" },
    { id:"recruiter-status", label:"Recruiter Status" },
    { id:"pending-recruiters", label:"Pending Recruiters" },
    { id:"recruiters", label:"Approved Recruiters" },
    { id:"incentives", label:"Incentives" },
    { id:"jobs-list", label:"All Jobs" },
    { id:"jobs", label:"Post Job" },
    { id:"bulk-jobs", label:"Bulk Jobs" },
    { id:"bulk-candidates", label:"Bulk Candidates" },
    { id:"resume-parse", label:"Candidate upload" },
    { id:"resume-views", label:"Resume views", isLink:"/admin/resume-views" },
    { id:"fake-experience-check", label:"Fake Experience Check", isLink:"/admin/fake-experience-check" },
  ];
  return (
    <div style={{ minHeight:"100vh", backgroundColor:"#F8FAFC", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:"#0f172a" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
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
                    if(item.id==="pending-recruiters")fetchPendingRecruiters();
                    if(item.id==="jobs-list"||item.id==="jobs")fetchJobs();
                    if(item.id==="referred-candidates")fetchReferredCandidates();
                    if(item.id==="manage-status"){fetchCandidateStatusList();}
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
        onClick={()=>{ if(dropdownOpen) setDropdownOpen(false); if(openJobMenuId) setOpenJobMenuId(null); }}>

        {/* ═══════════════════════════════════════════════ */}
        {/* OVERVIEW                                        */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="overview" && dashboardData && (() => {
          const topRef = referrers.reduce((t,r)=>(!t||(r.referral_count||0)>(t.referral_count||0))?r:t,null);
          const cards = [
            { id:"candidates", label:"Total Candidates", value:dashboardData.totalCandidates, change:"+20%", icon:Users, iconBg:"#EFF6FF", iconColor:"#1d4ed8", viewLabel:"View all candidates", viewHref:()=>setActiveTab("candidates"), details:[{label:"Active",value:candidates.filter(c=>c.status!=="rejected").length},{label:"New This Month",value:dashboardData.newCandidatesThisMonth??"—"},{label:"Shortlisted",value:dashboardData.shortlistedCandidates??"—"},{label:"Rejected",value:dashboardData.rejectedCandidates??"—"}], labelColor:"#1d4ed8" },
            { id:"referrers", label:"Total Referrers", value:dashboardData.totalReferrers, change:"+25%", icon:Users, iconBg:"#DCFCE7", iconColor:"#15803d", viewLabel:"View all referrers", viewHref:()=>{window.location.href="/admin/referrers";}, details:[{label:"Active Referrers",value:referrers.filter(r=>(r.referral_count||0)>0).length||"—"},{label:"New This Month",value:dashboardData.newReferrersThisMonth??"—"},{label:"Inactive",value:referrers.filter(r=>!(r.referral_count>0)).length||"—"},{label:"Top Referrer",value:topRef?.name?.split(" ")[0]||"—"}], labelColor:"#15803d" },
            { id:"recruiters", label:"Recruiters (Approved)", value:dashboardData.approvedRecruiters, change:"+100%", icon:ShieldCheck, iconBg:"#F3E8FF", iconColor:"#7c3aed", viewLabel:"View all recruiters", viewHref:()=>setActiveTab("recruiters"), details:[{label:"Pending Approval",value:pendingRecruiters.length},{label:"Approved",value:dashboardData.approvedRecruiters},{label:"Rejected",value:dashboardData.rejectedRecruiters??"—"},{label:"Total",value:(pendingRecruiters.length||0)+(dashboardData.approvedRecruiters||0)}], labelColor:"#7c3aed" },
            { id:"referrals", label:"Total Referrals", value:referredCandidates.length, change:"+30%", icon:Megaphone, iconBg:"#FFF7ED", iconColor:O, viewLabel:"View referred candidates", viewHref:()=>setActiveTab("referred-candidates"), details:[{label:"Successful",value:dashboardData.successfulReferrals??"—"},{label:"Pending",value:dashboardData.pendingReferrals??"—"},{label:"Expired",value:dashboardData.expiredReferrals??"—"},{label:"Conversion Rate",value:dashboardData.conversionRate?`${dashboardData.conversionRate}%`:"—"}], labelColor:O },
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
                    { label:"Add Candidates", desc:"Add new candidates to the platform", icon:UserPlus, shortcut:"Alt + C", bg:"#EFF6FF", color:"#1d4ed8", action:()=>setActiveTab("bulk-candidates") },
                    { label:"Post Jobs", desc:"Create and publish new job openings", icon:Briefcase, shortcut:"Alt + J", bg:"#DCFCE7", color:"#15803d", action:()=>{window.location.href="/admin/post-job";} },
                    { label:"Recruiter", desc:"Manage recruiters and approvals", icon:UserCheck, shortcut:"Alt + R", bg:"#F3E8FF", color:"#7c3aed", action:()=>{setActiveTab("pending-recruiters");fetchPendingRecruiters();} },
                    { label:"Resume Parser", desc:"Parse resumes using AI technology", icon:Zap, shortcut:"Alt + P", bg:"#FFF7ED", color:O, action:()=>setActiveTab("resume-parse") },
                    { label:"CV Add", desc:"Upload and manage CVs", icon:Upload, shortcut:"Alt + V", bg:"#ECFDF5", color:"#059669", action:()=>setActiveTab("resume-parse") },
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
                  { icon:Users, iconBg:"#EFF6FF", iconColor:"#1d4ed8", value:portalOnly.length+allBulk.length, label:"Total Candidates", sub:"All candidates in your platform" },
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
        {/* RECRUITER STATUS (admin-only, private tags)      */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="recruiter-status" && (() => {
          const searched = recruiterStatuses.filter(s =>
            !candidateSearch || [s.candidate_name, s.candidate_email, s.recruiter_name, s.status].filter(Boolean).join(" ").toLowerCase().includes(candidateSearch.toLowerCase())
          );
          const statusColor = { "Shortlisted":{c:"#1d4ed8",bg:"#EFF6FF",b:"#BFDBFE"}, "In Process":{c:"#7c3aed",bg:"#F3E8FF",b:"#DDD6FE"}, "On Hold":{c:"#C2410C",bg:"#FFF7ED",b:"#FED7AA"}, "Offer Given":{c:"#15803d",bg:"#DCFCE7",b:"#86efac"} };
          return (
            <div>
              <BackBtn/>
              <TabHeader title={`Recruiter Candidate Statuses (${recruiterStatuses.length})`} subtitle="Private status tags each recruiter has set on candidates — visible only to admin, never to other recruiters"/>
              <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:16, overflow:"hidden" }}>
                <div style={{ padding:"16px 24px", borderBottom:`1.5px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <ShieldCheck size={16} color={O}/>
                    <span style={{ fontWeight:700, fontSize:15 }}>Recruiter Status Log</span>
                    <span style={{ fontSize:12, color:"#94a3b8", marginLeft:4 }}>{searched.length} shown</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#F8FAFC" }}>
                    <Search size={14} color="#94a3b8"/>
                    <input value={candidateSearch} onChange={e=>setCandidateSearch(e.target.value)} placeholder="Search..."
                      style={{ border:"none", outline:"none", fontSize:13, background:"transparent", fontFamily:"inherit", width:160 }}/>
                    {candidateSearch && <button onClick={()=>setCandidateSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}><X size={13}/></button>}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1.5fr 1.5fr", gap:8, padding:"10px 24px", backgroundColor:"#F8FAFC", borderBottom:`1px solid ${BORDER}`, fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  <span>Candidate</span><span>Recruiter</span><span>Source</span><span>Status</span><span>Updated</span>
                </div>
                {searched.length===0 ? (
                  <div style={{ padding:"60px", textAlign:"center" }}>
                    <ShieldCheck size={40} color="#E5E7EB" style={{ display:"block", margin:"0 auto 12px" }}/>
                    <p style={{ color:"#94a3b8", margin:0 }}>No recruiter status tags yet</p>
                  </div>
                ) : searched.map(s=>{
                  const sc = statusColor[s.status] || { c:"#475569", bg:"#F1F5F9", b:"#CBD5E1" };
                  return (
                    <div key={s.id}
                      style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1.5fr 1.5fr", gap:8, padding:"14px 24px", borderBottom:`1px solid #F8FAFC`, alignItems:"center" }}
                      onMouseEnter={e=>e.currentTarget.style.backgroundColor=O_LITE}
                      onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600 }}>{s.candidate_name||"—"}</div>
                        <div style={{ fontSize:12, color:"#94a3b8" }}>{s.candidate_email||""}</div>
                      </div>
                      <div style={{ fontSize:13, color:"#475569" }}>{s.recruiter_name||"—"}</div>
                      <div><Badge label={s.source} color="#475569" bg="#F1F5F9" border="#CBD5E1"/></div>
                      <div><Badge label={s.status} color={sc.c} bg={sc.bg} border={sc.b}/></div>
                      <div style={{ fontSize:12, color:"#64748b", display:"flex", alignItems:"center", gap:5 }}>
                        <Calendar size={12}/> {fmtDate(s.updated_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}


        {/* ═══════════════════════════════════════════════ */}
        {/* PENDING RECRUITERS                              */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="pending-recruiters" && (() => {
          const companies = ["All", ...Array.from(new Set(pendingRecruiters.map(r=>r.company_name).filter(Boolean)))];
          const filtered = pendingRecruiters.filter(r => {
            const q = recSearch.toLowerCase();
            const matchQ = !q || [r.name,r.email,r.company_name].filter(Boolean).join(" ").toLowerCase().includes(q);
            const matchC = recCompany==="All" || r.company_name===recCompany;
            return matchQ && matchC;
          });
          const docStatus = (r) => r.company_website ? "Complete" : r.company_name ? "Partial" : "Missing";
          const docColor = (s) => s==="Complete"?["#DCFCE7","#15803d","#86efac"]:s==="Partial"?["#FEF3C7","#d97706","#fde68a"]:["#FEF2F2","#dc2626","#fecaca"];

          return (
            <div>
              <BackBtn/>
              {/* Hero banner */}
              <div style={{ background:"linear-gradient(135deg,#f0f7ff 0%,#e8f4fd 100%)", border:`1.5px solid ${BORDER}`, borderRadius:18, padding:"26px 32px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <h2 style={{ fontSize:22, fontWeight:800, margin:"0 0 6px", color:"#0f172a" }}>Recruiter Approval Center</h2>
                  <p style={{ fontSize:13, color:"#64748b", margin:0, maxWidth:380 }}>Review new recruiter registrations, verify company information, and approve trusted recruiting partners.</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ textAlign:"center", padding:"12px 20px", backgroundColor:"#fff", borderRadius:12, border:`1.5px solid ${BORDER}` }}>
                    <div style={{ fontSize:28, fontWeight:800, color:"#f59e0b" }}>{pendingRecruiters.length}</div>
                    <div style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>Pending</div>
                  </div>
                </div>
              </div>

              {/* Search + filters */}
              <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:200, display:"flex", alignItems:"center", gap:8, padding:"10px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10 }}>
                  <Search size={15} color="#94a3b8"/>
                  <input value={recSearch} onChange={e=>setRecSearch(e.target.value)} placeholder="Search recruiters by name, email or company..."
                    style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:"inherit", background:"transparent", color:"#0f172a" }}/>
                  {recSearch && <button onClick={()=>setRecSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}><X size={13}/></button>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10 }}>
                  <span style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>Status:</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#f59e0b" }}>Pending</span>
                </div>
                <select value={recCompany} onChange={e=>setRecCompany(e.target.value)}
                  style={{ padding:"10px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:"#374151", fontFamily:"inherit", cursor:"pointer" }}>
                  {companies.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20 }}>
                {/* Left: table */}
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <h3 style={{ fontSize:16, fontWeight:700, margin:0 }}>Pending Recruiter Approvals</h3>
                    <span style={{ fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:999, backgroundColor:"#FEF3C7", color:"#d97706", border:"1px solid #fde68a" }}>{filtered.length} Pending</span>
                  </div>

                  {filtered.length===0 ? (
                    <div style={{ ...CARD, textAlign:"center", padding:"60px" }}>
                      <div style={{ fontSize:52, marginBottom:14 }}>🎉</div>
                      <p style={{ fontWeight:700, fontSize:16, margin:"0 0 6px" }}>You're all caught up!</p>
                      <p style={{ color:"#94a3b8", margin:"0 0 20px", fontSize:13 }}>There are currently no recruiter approvals waiting for review.<br/>The system will automatically notify you when a new recruiter registers.</p>
                      <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                        <button onClick={()=>setActiveTab("recruiters")} style={{ padding:"9px 20px", backgroundColor:"#EFF6FF", color:"#1d4ed8", border:"1.5px solid #BFDBFE", borderRadius:9, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>View Approved Recruiters</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, overflow:"hidden" }}>
                      {/* Table header */}
                      <div style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 2fr 1fr 1.2fr 1fr 1.4fr", gap:8, padding:"11px 20px", backgroundColor:"#F8FAFC", borderBottom:`1.5px solid ${BORDER}`, fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        <span>Recruiter</span><span>Company</span><span>Email</span><span>Registered On</span><span>Documents</span><span>Status</span><span>Actions</span>
                      </div>
                      {filtered.map((r,i)=>{
                        const ds = docStatus(r); const [dbg,dfg,dbd]=docColor(ds);
                        const [abg,afg]=avatarColor(r.name);
                        return (
                          <div key={r.id} style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 2fr 1fr 1.2fr 1fr 1.4fr", gap:8, padding:"14px 20px", borderBottom:i<filtered.length-1?`1px solid ${BORDER}`:"none", alignItems:"center", transition:"background 0.12s" }}
                            onMouseEnter={e=>e.currentTarget.style.backgroundColor=O_LITE}
                            onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                            {/* Recruiter */}
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:36, height:36, borderRadius:"50%", backgroundColor:abg, color:afg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{initials(r.name)}</div>
                              <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{r.name||"—"}</div>
                            </div>
                            {/* Company */}
                            <div style={{ fontSize:13, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.company_name||"—"}</div>
                            {/* Email */}
                            <div style={{ fontSize:12, color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.email||"—"}</div>
                            {/* Registered */}
                            <div style={{ fontSize:11, color:"#94a3b8" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}</div>
                            {/* Docs */}
                            <div>
                              <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:999, backgroundColor:dbg, color:dfg, border:`1px solid ${dbd}` }}>{ds==="Complete"?"● Complete":ds==="Partial"?"△ Partial":"✕ Missing"}</span>
                            </div>
                            {/* Status */}
                            <div><span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:999, backgroundColor:"#FEF3C7", color:"#d97706", border:"1px solid #fde68a" }}>Pending</span></div>
                            {/* Actions */}
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>{handleApproveRecruiter(r.id);setTimeout(fetchPendingRecruiters,800);}}
                                style={{ padding:"5px 14px", backgroundColor:"#15803d", color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Approve</button>
                              <button onClick={()=>{handleRejectRecruiter(r.id);setTimeout(fetchPendingRecruiters,800);}}
                                style={{ padding:"5px 14px", backgroundColor:"#fff", color:"#dc2626", border:"1.5px solid #fecaca", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Reject</button>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ padding:"10px 20px", borderTop:`1px solid ${BORDER}`, fontSize:12, color:"#94a3b8" }}>
                        Showing 1 to {filtered.length} of {filtered.length} pending approvals
                      </div>
                    </div>
                  )}

                  {/* Approval workflow */}
                  <div style={{ ...CARD, marginTop:20 }}>
                    <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 18px" }}>Approval Workflow</h3>
                    <div style={{ display:"flex", alignItems:"center", gap:0 }}>
                      {[
                        { icon:"📝", label:"Registration", sub:"Recruiter submits registration", color:"#1d4ed8", bg:"#EFF6FF", num:1 },
                        { icon:"🏢", label:"Company Documents", sub:"Verify company & legal documents", color:"#7c3aed", bg:"#F3E8FF", num:2 },
                        { icon:"👤", label:"Admin Review", sub:"Review information and documents", color:"#d97706", bg:"#FEF3C7", num:3 },
                        { icon:"✅", label:"Approval", sub:"Approve or reject recruiter", color:"#15803d", bg:"#DCFCE7", num:4 },
                      ].map((s,i,arr)=>(
                        <div key={s.label} style={{ display:"flex", alignItems:"center", flex:1 }}>
                          <div style={{ flex:1, textAlign:"center" }}>
                            <div style={{ width:44, height:44, borderRadius:"50%", backgroundColor:s.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, margin:"0 auto 8px", border:`2px solid ${s.color}30` }}>{s.icon}</div>
                            <div style={{ fontSize:12, fontWeight:700, color:"#0f172a", marginBottom:3 }}>{s.label}</div>
                            <div style={{ fontSize:10, color:"#94a3b8", lineHeight:1.4 }}>{s.sub}</div>
                          </div>
                          {i<arr.length-1 && <div style={{ width:32, height:2, backgroundColor:BORDER, flexShrink:0 }}/>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Recent Activity + Quick Actions */}
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {/* Recent Activity */}
                  <div style={{ ...CARD }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                      <h3 style={{ fontSize:14, fontWeight:700, margin:0 }}>Recent Activity</h3>
                      <button style={{ fontSize:12, color:O, fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>View All</button>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      {[
                        { icon:"✅", text:"New recruiter registration submitted", time:"Just now", color:"#DCFCE7", fg:"#15803d" },
                        { icon:"📄", text:"Company documents updated", time:"Yesterday", color:"#EFF6FF", fg:"#1d4ed8" },
                        { icon:"🎉", text:"Recruiter registration submitted", time:"Yesterday", color:"#F3E8FF", fg:"#7c3aed" },
                        { icon:"👤", text:"New recruiter registration pending", time:"2 days ago", color:"#FEF3C7", fg:"#d97706" },
                      ].map((a,i)=>(
                        <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                          <div style={{ width:30, height:30, borderRadius:"50%", backgroundColor:a.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>{a.icon}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, color:"#374151", lineHeight:1.4 }}>{a.text}</div>
                            <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{a.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div style={{ ...CARD }}>
                    <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 14px" }}>Quick Actions</h3>
                    {[
                      { label:"View Approved Recruiters", icon:"✅", action:()=>setActiveTab("recruiters") },
                      { label:"View Rejected Recruiters", icon:"❌", action:()=>{} },
                      { label:"Export Recruiter List", icon:"📤", action:()=>{} },
                      { label:"Registration Settings", icon:"⚙️", action:()=>{} },
                    ].map((a,i)=>(
                      <button key={i} onClick={a.action}
                        style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#fff", cursor:"pointer", fontFamily:"inherit", marginBottom:i<3?8:0, transition:"all 0.15s" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=O;e.currentTarget.style.backgroundColor=O_LITE;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.backgroundColor="#fff";}}>
                        <span style={{ fontSize:16 }}>{a.icon}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:"#374151", flex:1, textAlign:"left" }}>{a.label}</span>
                        <ChevronRight size={14} color="#94a3b8"/>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════ */}
        {/* APPROVED RECRUITERS                             */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="recruiters" && (() => {
          const companies = ["All", ...Array.from(new Set(approvedRecruiters.map(r=>r.company_name||r.company).filter(Boolean)))];
          const filtered = approvedRecruiters.filter(r => {
            const q = recSearchA.toLowerCase();
            const matchQ = !q || [r.name,r.email,r.phone,r.company_name,r.company].filter(Boolean).join(" ").toLowerCase().includes(q);
            const matchC = recCompanyA==="All" || (r.company_name||r.company)===recCompanyA;
            return matchQ && matchC;
          });
          const totalPages = Math.max(1, Math.ceil(filtered.length/recPerPage));
          const paginated = filtered.slice((recPage-1)*recPerPage, recPage*recPerPage);
          const approvedThisMonth = approvedRecruiters.filter(r => {
            if (!r.recruiter_approved_at) return false;
            const d = new Date(r.recruiter_approved_at);
            const n = new Date();
            return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
          }).length;
          const lastApproval = approvedRecruiters.sort((a,b)=>new Date(b.recruiter_approved_at||0)-new Date(a.recruiter_approved_at||0))[0];
          const uniqueCompanies = new Set(approvedRecruiters.map(r=>r.company_name||r.company).filter(Boolean)).size;

          return (
            <div>
              <BackBtn/>
              {/* Hero */}
              <div style={{ background:"linear-gradient(135deg,#f0f7ff 0%,#e8f4fd 100%)", border:`1.5px solid ${BORDER}`, borderRadius:18, padding:"26px 32px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <h2 style={{ fontSize:22, fontWeight:800, margin:"0 0 6px" }}>Approved Recruiters</h2>
                  <p style={{ fontSize:13, color:"#64748b", margin:0 }}>Manage and view all recruiters who have been verified and approved on the platform.</p>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={()=>setActiveTab("pending-recruiters")}
                    style={{ padding:"9px 18px", backgroundColor:O, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    Pending Approvals {pendingRecruiters.length>0 && `(${pendingRecruiters.length})`}
                  </button>
                </div>
              </div>

              {/* Search + filters */}
              <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
                <div style={{ flex:1, minWidth:200, display:"flex", alignItems:"center", gap:8, padding:"10px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10 }}>
                  <Search size={15} color="#94a3b8"/>
                  <input value={recSearchA} onChange={e=>{setRecSearchA(e.target.value);setRecPage(1);}} placeholder="Search by name, email, company or phone..."
                    style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:"inherit", background:"transparent" }}/>
                  {recSearchA && <button onClick={()=>setRecSearchA("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}><X size={13}/></button>}
                </div>
                <select value={recCompanyA} onChange={e=>{setRecCompanyA(e.target.value);setRecPage(1);}}
                  style={{ padding:"10px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:"#374151", fontFamily:"inherit", cursor:"pointer" }}>
                  {companies.map(c=><option key={c}>{c}</option>)}
                </select>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10 }}>
                  <span style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>Status:</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"#15803d" }}>● Approved</span>
                </div>
              </div>

              {/* Stat cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
                {[
                  { icon:"👥", label:"Total Approved Recruiters", value:approvedRecruiters.length, sub:"All time", color:"#7c3aed", bg:"#F3E8FF" },
                  { icon:"✅", label:"Approved This Month", value:approvedThisMonth, sub:"+12% vs last month", color:"#15803d", bg:"#DCFCE7" },
                  { icon:"🏢", label:"Companies Represented", value:uniqueCompanies, sub:"", color:"#1d4ed8", bg:"#EFF6FF" },
                  { icon:"📅", label:"Latest Approval", value:lastApproval?.recruiter_approved_at ? new Date(lastApproval.recruiter_approved_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—", sub:lastApproval?.company_name||"", color:O, bg:O_LITE },
                ].map((s,i)=>(
                  <div key={i} style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"18px 20px", display:"flex", alignItems:"flex-start", gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:12, backgroundColor:s.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize:12, color:"#94a3b8", fontWeight:600, marginBottom:4 }}>{s.label}</div>
                      <div style={{ fontSize:20, fontWeight:800, color:s.color, marginBottom:2 }}>{s.value}</div>
                      {s.sub && <div style={{ fontSize:11, color:"#94a3b8" }}>{s.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, overflow:"hidden", marginBottom:16 }}>
                <div style={{ padding:"16px 24px", borderBottom:`1.5px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:700, fontSize:15 }}>Approved Recruiters ({filtered.length})</span>
                </div>
                {/* Col headers */}
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 2fr 2fr 1.4fr 1.2fr 1.4fr", gap:8, padding:"10px 24px", backgroundColor:"#F8FAFC", borderBottom:`1.5px solid ${BORDER}`, fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  <span>Recruiter</span><span>Company Logo</span><span>Company</span><span>Email</span><span>Phone</span><span>Approved On</span><span>Actions</span>
                </div>

                {paginated.length===0 ? (
                  <div style={{ padding:"60px", textAlign:"center", color:"#94a3b8" }}>
                    <Users size={40} color="#E5E7EB" style={{ display:"block", margin:"0 auto 14px" }}/>
                    <p style={{ margin:0 }}>No approved recruiters found</p>
                  </div>
                ) : paginated.map((r,i)=>{
                  const [bg,fg]=avatarColor(r.name);
                  const companyInitials = (r.company_name||r.company||"?").split(" ").map(w=>w[0]).slice(0,3).join("").toUpperCase();
                  return (
                    <div key={r.id}
                      style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 2fr 2fr 1.4fr 1.2fr 1.4fr", gap:8, padding:"14px 24px", borderBottom:i<paginated.length-1?`1px solid ${BORDER}`:"none", alignItems:"center", transition:"background 0.12s" }}
                      onMouseEnter={e=>e.currentTarget.style.backgroundColor=O_LITE}
                      onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                      {/* Recruiter */}
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:"50%", backgroundColor:bg, color:fg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>{initials(r.name)}</div>
                        <div style={{ fontSize:13, fontWeight:700 }}>{r.name||"—"}</div>
                      </div>
                      {/* Company logo placeholder */}
                      <div>
                        <div style={{ width:40, height:28, borderRadius:6, backgroundColor:"#F1F5F9", border:`1.5px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:"#64748b", letterSpacing:"0.03em" }}>
                          {companyInitials}
                        </div>
                      </div>
                      {/* Company */}
                      <div style={{ fontSize:13, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.company_name||r.company||"—"}</div>
                      {/* Email */}
                      <div style={{ fontSize:12, color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.email||"—"}</div>
                      {/* Phone */}
                      <div style={{ fontSize:12, color:"#475569" }}>{r.phone||"—"}</div>
                      {/* Approved on */}
                      <div style={{ fontSize:12, color:"#94a3b8" }}>{r.recruiter_approved_at ? new Date(r.recruiter_approved_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—"}</div>
                      {/* Actions */}
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:999, backgroundColor:"#DCFCE7", color:"#15803d", border:"1px solid #86efac" }}>● Approved</span>
                        <button onClick={()=>window.location.href=`/recruiter-details/${r.id}`}
                          style={{ padding:"5px 14px", border:`1.5px solid ${BORDER}`, borderRadius:7, backgroundColor:"#fff", color:"#374151", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", transition:"all 0.15s" }}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor=O;e.currentTarget.style.color=O;}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.color="#374151";}}>
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                <div style={{ padding:"12px 24px", borderTop:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>Showing {(recPage-1)*recPerPage+1} to {Math.min(recPage*recPerPage,filtered.length)} of {filtered.length} recruiters</span>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <button onClick={()=>setRecPage(p=>Math.max(1,p-1))} disabled={recPage===1}
                      style={{ padding:"5px 10px", border:`1.5px solid ${BORDER}`, borderRadius:7, backgroundColor:"#fff", color:recPage===1?"#d1d5db":"#374151", cursor:recPage===1?"not-allowed":"pointer", fontSize:13 }}>‹</button>
                    {Array.from({length:Math.min(totalPages,5)},(_,i)=>{
                      const p = totalPages<=5 ? i+1 : recPage<=3 ? i+1 : recPage+i-2;
                      if(p<1||p>totalPages)return null;
                      return (
                        <button key={p} onClick={()=>setRecPage(p)}
                          style={{ padding:"5px 10px", minWidth:32, border:`1.5px solid ${recPage===p?O:BORDER}`, borderRadius:7, backgroundColor:recPage===p?O:"#fff", color:recPage===p?"#fff":"#374151", cursor:"pointer", fontSize:12, fontWeight:recPage===p?700:400 }}>{p}</button>
                      );
                    })}
                    {totalPages>5 && <span style={{ color:"#94a3b8", fontSize:12 }}>… {totalPages}</span>}
                    <button onClick={()=>setRecPage(p=>Math.min(totalPages,p+1))} disabled={recPage===totalPages}
                      style={{ padding:"5px 10px", border:`1.5px solid ${BORDER}`, borderRadius:7, backgroundColor:"#fff", color:recPage===totalPages?"#d1d5db":"#374151", cursor:recPage===totalPages?"not-allowed":"pointer", fontSize:13 }}>›</button>
                    <select value={recPerPage} onChange={e=>{setRecPerPage(Number(e.target.value));setRecPage(1);}}
                      style={{ padding:"5px 10px", border:`1.5px solid ${BORDER}`, borderRadius:7, fontSize:12, fontFamily:"inherit", cursor:"pointer" }}>
                      {[10,25,50].map(n=><option key={n} value={n}>{n} / page</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer info */}
              <div style={{ ...CARD, padding:"18px 22px" }}>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ fontSize:22 }}>ℹ️</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>About Approved Recruiters</div>
                    <div style={{ fontSize:12, color:"#64748b", lineHeight:1.6 }}>These recruiters have successfully completed the verification process and are trusted partners on PickYourHire.</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════ */}
        {/* INCENTIVES                                      */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="incentives" && (() => {
          const incPerPage = 10;
          const filteredRefs = referrers.filter(r => !incSearch || [r.name,r.email,r.company,r.linkedin].filter(Boolean).join(" ").toLowerCase().includes(incSearch.toLowerCase()));
          const totalIncPages = Math.max(1, Math.ceil(filteredRefs.length / incPerPage));
          const pagedRefs = filteredRefs.slice((incPage-1)*incPerPage, incPage*incPerPage);

          return (
            <div>
              <BackBtn/>
              {/* Hero */}
              <div style={{ background:"linear-gradient(135deg,#fff7ed 0%,#fef3e2 100%)", border:`1.5px solid ${BORDER}`, borderRadius:18, padding:"24px 32px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ width:56, height:56, borderRadius:14, backgroundColor:O_LITE, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>🎁</div>
                  <div>
                    <h2 style={{ fontSize:21, fontWeight:800, margin:"0 0 4px" }}>Referrer Incentives</h2>
                    <p style={{ fontSize:13, color:"#64748b", margin:0 }}>Manage your platform efficiently from this comprehensive dashboard.</p>
                  </div>
                </div>
                <div style={{ fontSize:48, opacity:0.5 }}>🎁</div>
              </div>

              {/* SECTION 1: All Referrers */}
              <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:16, overflow:"hidden", marginBottom:24 }}>
                <div style={{ padding:"16px 24px", borderBottom:`1.5px solid ${BORDER}`, display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:8, backgroundColor:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Users size={16} color="#1d4ed8"/>
                  </div>
                  <span style={{ fontWeight:700, fontSize:15 }}>All Referrers</span>
                  <span style={{ fontSize:12, color:"#94a3b8", marginLeft:4 }}>{referrers.length} total</span>
                </div>
                {/* Table header */}
                <div style={{ display:"grid", gridTemplateColumns:"40px 2fr 2.5fr 1.5fr 2fr 1fr", gap:0, padding:"10px 24px", backgroundColor:"#F8FAFC", borderBottom:`1px solid ${BORDER}`, fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  <span>#</span><span>Name</span><span>Email</span><span>Company</span><span>LinkedIn ID</span><span>Actions</span>
                </div>
                {pagedRefs.length === 0 ? (
                  <div style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>No referrers found</div>
                ) : pagedRefs.map((r, i) => {
                  const [bg, fg] = avatarColor(r.name);
                  const rowNum = (incPage-1)*incPerPage + i + 1;
                  const linkedinDisplay = r.linkedin ? r.linkedin.replace(/^https?:\/\/(www\.)?/i,"").replace(/\/$/,"") : null;
                  return (
                    <div key={r.id} style={{ display:"grid", gridTemplateColumns:"40px 2fr 2.5fr 1.5fr 2fr 1fr", gap:0, padding:"13px 24px", borderBottom:`1px solid ${BORDER}`, alignItems:"center", transition:"background 0.1s" }}
                      onMouseEnter={e=>e.currentTarget.style.backgroundColor="#FAFBFC"}
                      onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                      <span style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>{rowNum}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", backgroundColor:bg, color:fg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>{initials(r.name)}</div>
                        <span style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>{r.name||"—"}</span>
                      </div>
                      <span style={{ fontSize:12, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.email||"—"}</span>
                      <span style={{ fontSize:12, color:"#475569" }}>{r.company||"—"}</span>
                      <div>
                        {linkedinDisplay ? (
                          <a href={r.linkedin.startsWith("http")?r.linkedin:`https://${r.linkedin}`} target="_blank" rel="noreferrer"
                            style={{ fontSize:12, color:"#1d4ed8", textDecoration:"none", display:"flex", alignItems:"center", gap:4 }}
                            onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"}
                            onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>
                            {linkedinDisplay.length>30?linkedinDisplay.slice(0,30)+"…":linkedinDisplay}
                            <ExternalLink size={10}/>
                          </a>
                        ) : <span style={{ fontSize:12, color:"#94a3b8" }}>—</span>}
                      </div>
                      <div>
                        <a href={`/admin/referrers`} style={{ padding:"5px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:7, fontSize:12, fontWeight:600, color:"#374151", cursor:"pointer", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:5, transition:"all 0.15s" }}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor=O;e.currentTarget.style.color=O;}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.color="#374151";}}>
                          <Eye size={12}/> View
                        </a>
                      </div>
                    </div>
                  );
                })}
                {/* Pagination */}
                <div style={{ padding:"12px 24px", borderTop:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:"#64748b" }}>Showing {(incPage-1)*incPerPage+1} to {Math.min(incPage*incPerPage,filteredRefs.length)} of {filteredRefs.length} referrers</span>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={()=>setIncPage(p=>Math.max(1,p-1))} disabled={incPage===1}
                      style={{ width:28, height:28, border:`1.5px solid ${BORDER}`, borderRadius:6, backgroundColor:"#fff", cursor:incPage===1?"not-allowed":"pointer", color:incPage===1?"#d1d5db":"#374151", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                    {Array.from({length:Math.min(totalIncPages,5)},(_,i)=>i+1).map(p=>(
                      <button key={p} onClick={()=>setIncPage(p)}
                        style={{ width:28, height:28, border:`1.5px solid ${incPage===p?O:BORDER}`, borderRadius:6, backgroundColor:incPage===p?O:"#fff", color:incPage===p?"#fff":"#374151", cursor:"pointer", fontSize:12, fontWeight:incPage===p?700:400, display:"flex", alignItems:"center", justifyContent:"center" }}>{p}</button>
                    ))}
                    {totalIncPages>5 && <span style={{ color:"#94a3b8", alignSelf:"center", fontSize:12 }}>…{totalIncPages}</span>}
                    <button onClick={()=>setIncPage(p=>Math.min(totalIncPages,p+1))} disabled={incPage===totalIncPages}
                      style={{ width:28, height:28, border:`1.5px solid ${BORDER}`, borderRadius:6, backgroundColor:"#fff", cursor:incPage===totalIncPages?"not-allowed":"pointer", color:incPage===totalIncPages?"#d1d5db":"#374151", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Referrer Incentives */}
              <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:16, overflow:"hidden" }}>
                <div style={{ padding:"16px 24px", borderBottom:`1.5px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, backgroundColor:O_LITE, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🎁</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15 }}>Referrer Incentives</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>Manage and update incentive amounts for all referrers.</div>
                    </div>
                  </div>
                  <div style={{ fontSize:32, opacity:0.4 }}>💰</div>
                </div>
                {/* Table header */}
                <div style={{ display:"grid", gridTemplateColumns:"40px 2fr 2.5fr 1.5fr 2fr 1.5fr 1.5fr", gap:0, padding:"10px 24px", backgroundColor:"#F8FAFC", borderBottom:`1px solid ${BORDER}`, fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  <span>#</span><span>Name</span><span>Email</span><span>Company</span><span>LinkedIn ID</span><span>Current Incentive (₹)</span><span>Actions</span>
                </div>
                {pagedRefs.length === 0 ? (
                  <div style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>No referrers found</div>
                ) : pagedRefs.map((r, i) => {
                  const [bg, fg] = avatarColor(r.name);
                  const rowNum = (incPage-1)*incPerPage + i + 1;
                  const linkedinDisplay = r.linkedin ? r.linkedin.replace(/^https?:\/\/(www\.)?/i,"").replace(/\/$/,"") : null;
                  const isEditing = editingReferrerId === r.id;
                  return (
                    <div key={r.id} style={{ display:"grid", gridTemplateColumns:"40px 2fr 2.5fr 1.5fr 2fr 1.5fr 1.5fr", gap:0, padding:"13px 24px", borderBottom:`1px solid ${BORDER}`, alignItems:"center", backgroundColor:isEditing?"#FFFBF7":"transparent", transition:"background 0.1s" }}
                      onMouseEnter={e=>{ if(!isEditing) e.currentTarget.style.backgroundColor="#FAFBFC"; }}
                      onMouseLeave={e=>{ if(!isEditing) e.currentTarget.style.backgroundColor="transparent"; }}>
                      <span style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>{rowNum}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", backgroundColor:bg, color:fg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>{initials(r.name)}</div>
                        <span style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>{r.name||"—"}</span>
                      </div>
                      <span style={{ fontSize:12, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.email||"—"}</span>
                      <span style={{ fontSize:12, color:"#475569" }}>{r.company||"—"}</span>
                      <div>
                        {linkedinDisplay ? (
                          <a href={r.linkedin.startsWith("http")?r.linkedin:`https://${r.linkedin}`} target="_blank" rel="noreferrer"
                            style={{ fontSize:12, color:"#1d4ed8", textDecoration:"none", display:"flex", alignItems:"center", gap:4 }}>
                            {linkedinDisplay.length>28?linkedinDisplay.slice(0,28)+"…":linkedinDisplay}
                            <ExternalLink size={10}/>
                          </a>
                        ) : <span style={{ fontSize:12, color:"#94a3b8" }}>—</span>}
                      </div>
                      <div>
                        {isEditing ? (
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <input type="number" value={editingIncentiveValue} onChange={e=>setEditingIncentiveValue(e.target.value)} autoFocus
                              style={{ width:80, padding:"5px 8px", border:`1.5px solid ${O}`, borderRadius:7, fontSize:13, fontFamily:"inherit", outline:"none" }}/>
                          </div>
                        ) : (
                          <span style={{ fontSize:14, fontWeight:700, color:"#15803d" }}>₹{r.incentive_value||0}</span>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        {isEditing ? (
                          <>
                            <button onClick={()=>handleQuickEditIncentive(r.id)}
                              style={{ padding:"5px 12px", backgroundColor:"#15803d", color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>Save</button>
                            <button onClick={()=>{setEditingReferrerId(null);setEditingIncentiveValue("");}}
                              style={{ padding:"5px 10px", backgroundColor:"#f1f5f9", color:"#475569", border:"none", borderRadius:7, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>✕</button>
                          </>
                        ) : (
                          <button onClick={()=>{setEditingReferrerId(r.id);setEditingIncentiveValue((r.incentive_value||0).toString());}}
                            style={{ padding:"5px 16px", backgroundColor:O, color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
                            ✏️ Edit Incentive
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div style={{ padding:"12px 24px", borderTop:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:"#64748b" }}>Showing {(incPage-1)*incPerPage+1} to {Math.min(incPage*incPerPage,filteredRefs.length)} of {filteredRefs.length} referrers</span>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={()=>setIncPage(p=>Math.max(1,p-1))} disabled={incPage===1}
                      style={{ width:28, height:28, border:`1.5px solid ${BORDER}`, borderRadius:6, backgroundColor:"#fff", cursor:incPage===1?"not-allowed":"pointer", color:incPage===1?"#d1d5db":"#374151", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                    {Array.from({length:Math.min(totalIncPages,5)},(_,i)=>i+1).map(p=>(
                      <button key={p} onClick={()=>setIncPage(p)}
                        style={{ width:28, height:28, border:`1.5px solid ${incPage===p?O:BORDER}`, borderRadius:6, backgroundColor:incPage===p?O:"#fff", color:incPage===p?"#fff":"#374151", cursor:"pointer", fontSize:12, fontWeight:incPage===p?700:400, display:"flex", alignItems:"center", justifyContent:"center" }}>{p}</button>
                    ))}
                    {totalIncPages>5 && <span style={{ color:"#94a3b8", alignSelf:"center", fontSize:12 }}>…{totalIncPages}</span>}
                    <button onClick={()=>setIncPage(p=>Math.min(totalIncPages,p+1))} disabled={incPage===totalIncPages}
                      style={{ width:28, height:28, border:`1.5px solid ${BORDER}`, borderRadius:6, backgroundColor:"#fff", cursor:incPage===totalIncPages?"not-allowed":"pointer", color:incPage===totalIncPages?"#d1d5db":"#374151", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════ */}
        {/* JOBS LIST                                       */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="jobs-list" && (() => {
          const departments = ["All Departments", ...Array.from(new Set(jobs.map(j=>j.department).filter(Boolean)))];
          const locations = ["All Locations", ...Array.from(new Set(jobs.map(j=>j.location).filter(Boolean)))];
          const filtered = jobs.filter(j => {
            const q = jobSearch.toLowerCase();
            const matchQ = !q || [j.job_title,j.department,j.location].filter(Boolean).join(" ").toLowerCase().includes(q);
            const matchD = jobDeptFilter==="All Departments" || j.department===jobDeptFilter;
            const matchL = jobLocFilter==="All Locations" || j.location===jobLocFilter;
            const matchS = jobStatusFilter==="All Status" || (j.status||"active")===jobStatusFilter;
            return matchQ && matchD && matchL && matchS;
          });
          const totalPages = Math.max(1, Math.ceil(filtered.length/jobsPerPage));
          const paginated = filtered.slice((jobsPage-1)*jobsPerPage, jobsPage*jobsPerPage);
          const counts = {
            total: jobs.length,
            active: jobs.filter(j=>(j.status||"active")==="active").length,
            paused: jobs.filter(j=>j.status==="inactive").length,
            closed: jobs.filter(j=>j.status==="closed").length,
          };
          const resetFilters = () => { setJobSearch(""); setJobDeptFilter("All Departments"); setJobLocFilter("All Locations"); setJobStatusFilter("All Status"); setJobsPage(1); };

          return (
            <div>
              <BackBtn/>
              {/* Hero */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:44, height:44, borderRadius:12, backgroundColor:O_LITE, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Briefcase size={20} color={O}/>
                  </div>
                  <div>
                    <h2 style={{ fontSize:20, fontWeight:800, margin:0 }}>All Created Jobs</h2>
                    <p style={{ fontSize:13, color:"#64748b", margin:"2px 0 0" }}>Manage and monitor all the jobs created on the platform.</p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  {selectedJobs.size>0 && (
                    <button onClick={handleDeleteSelectedJobs} style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 18px", backgroundColor:"#fef2f2", color:"#dc2626", border:"1.5px solid #fecaca", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                      <Trash2 size={14}/> Delete ({selectedJobs.size})
                    </button>
                  )}
                  <button onClick={()=>setActiveTab("jobs")} style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 20px", backgroundColor:O, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit", whiteSpace:"nowrap" }}>
                    <Plus size={16}/> Create New Job
                  </button>
                </div>
              </div>

              {/* Stat cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
                {[
                  { label:"Total Jobs", value:counts.total, sub:"All time", icon:Briefcase, color:"#1d4ed8", bg:"#EFF6FF" },
                  { label:"Active Jobs", value:counts.active, sub:"Currently running", icon:CheckCircle2, color:"#15803d", bg:"#DCFCE7" },
                  { label:"Paused Jobs", value:counts.paused, sub:"On hold", icon:Pause, color:"#b45309", bg:"#FEF3C7" },
                  { label:"Closed Jobs", value:counts.closed, sub:"No longer accepting", icon:XCircle, color:"#dc2626", bg:"#FEF2F2" },
                ].map(s=>(
                  <div key={s.label} style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderLeft:`4px solid ${s.color}`, borderRadius:14, padding:"16px 18px", display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ width:38, height:38, borderRadius:10, backgroundColor:s.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <s.icon size={17} color={s.color}/>
                    </div>
                    <div>
                      <div style={{ fontSize:22, fontWeight:800, lineHeight:1.1 }}>{s.value}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:"#374151", marginTop:2 }}>{s.label}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
                <div style={{ flex:1, minWidth:220, display:"flex", alignItems:"center", gap:8, padding:"10px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10 }}>
                  <Search size={15} color="#94a3b8"/>
                  <input value={jobSearch} onChange={e=>{setJobSearch(e.target.value);setJobsPage(1);}} placeholder="Search by job title, department or location..."
                    style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:"inherit", background:"transparent" }}/>
                  {jobSearch && <button onClick={()=>setJobSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}><X size={13}/></button>}
                </div>
                <select value={jobDeptFilter} onChange={e=>{setJobDeptFilter(e.target.value);setJobsPage(1);}}
                  style={{ padding:"10px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:"#374151", fontFamily:"inherit", cursor:"pointer" }}>
                  {departments.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <select value={jobLocFilter} onChange={e=>{setJobLocFilter(e.target.value);setJobsPage(1);}}
                  style={{ padding:"10px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:"#374151", fontFamily:"inherit", cursor:"pointer" }}>
                  {locations.map(l=><option key={l} value={l}>{l}</option>)}
                </select>
                <select value={jobStatusFilter} onChange={e=>{setJobStatusFilter(e.target.value);setJobsPage(1);}}
                  style={{ padding:"10px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:"#374151", fontFamily:"inherit", cursor:"pointer" }}>
                  {["All Status","active","inactive","closed"].map(s=><option key={s} value={s}>{s==="All Status"?s:jobStatusMeta(s).label}</option>)}
                </select>
                <button onClick={resetFilters} style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 16px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, fontWeight:600, color:"#475569", cursor:"pointer", fontFamily:"inherit" }}>
                  <RotateCcw size={13}/> Reset
                </button>
              </div>

              {/* Table */}
              <div style={{ ...CARD, padding:0, overflow:"hidden" }}>
                {jobs.length===0 ? (
                  <div style={{ padding:"48px", textAlign:"center", color:"#94a3b8" }}>
                    <Briefcase size={36} color="#E5E7EB" style={{ display:"block", margin:"0 auto 12px" }}/>
                    No jobs yet. Click "Create New Job" to post your first opening.
                  </div>
                ) : filtered.length===0 ? (
                  <div style={{ padding:"48px", textAlign:"center", color:"#94a3b8" }}>No jobs match your filters.</div>
                ) : (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor:"#F8FAFC", borderBottom:`1.5px solid ${BORDER}` }}>
                          <th style={{ padding:"13px 16px", width:40 }}>
                            <input type="checkbox" checked={selectAll} onChange={handleSelectAll} style={{ cursor:"pointer", width:16, height:16 }}/>
                          </th>
                          <th style={{ textAlign:"left", padding:"13px 8px", color:"#94a3b8", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"0.04em", width:36 }}>#</th>
                          {["Job Title","Department","Location","Applicants","Status","Created On","Actions"].map(h=>(
                            <th key={h} style={{ textAlign:"left", padding:"13px 16px", color:"#64748b", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((job,i)=>{
                          const meta = jobStatusMeta(job.status||"active");
                          return (
                            <tr key={job.id}
                              style={{ borderBottom:`1px solid ${BORDER}`, backgroundColor:selectedJobs.has(job.id)?"#EFF6FF":i%2===0?"#fff":"#FAFBFC" }}
                              onMouseEnter={e=>e.currentTarget.style.backgroundColor=selectedJobs.has(job.id)?"#EFF6FF":O_LITE}
                              onMouseLeave={e=>e.currentTarget.style.backgroundColor=selectedJobs.has(job.id)?"#EFF6FF":i%2===0?"#fff":"#FAFBFC"}>
                              <td style={{ padding:"13px 16px" }}>
                                <input type="checkbox" checked={selectedJobs.has(job.id)} onChange={()=>handleSelectJob(job.id)} style={{ cursor:"pointer", width:16, height:16 }}/>
                              </td>
                              <td style={{ padding:"13px 8px", color:"#94a3b8", fontSize:12 }}>{(jobsPage-1)*jobsPerPage+i+1}</td>
                              <td style={{ padding:"13px 16px" }}>
                                <div style={{ fontWeight:700, fontSize:13, color:"#1d4ed8", cursor:"pointer" }} onClick={()=>window.location.href=`/admin/jobs/${job.id}`}>{job.job_title}</div>
                                <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{jobCode(job)}</div>
                              </td>
                              <td style={{ padding:"13px 16px", color:"#475569", fontSize:13 }}>{job.department||"—"}</td>
                              <td style={{ padding:"13px 16px", color:"#475569", fontSize:13, display:"flex", alignItems:"center", gap:5 }}>
                                <MapPin size={12} color="#94a3b8"/> {job.location||"—"}
                              </td>
                              <td style={{ padding:"13px 16px", color:"#374151", fontSize:13, fontWeight:600 }}>{job.applicant_count ?? 0}</td>
                              <td style={{ padding:"13px 16px" }}>
                                <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, padding:"4px 11px", borderRadius:999, backgroundColor:meta.bg, color:meta.color, border:`1px solid ${meta.border}` }}>
                                  <span style={{ width:6, height:6, borderRadius:"50%", backgroundColor:meta.dot }}/> {meta.label}
                                </span>
                              </td>
                              <td style={{ padding:"13px 16px", color:"#94a3b8", fontSize:12 }}>
                                {job.created_at ? new Date(job.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                              </td>
                              <td style={{ padding:"13px 16px" }}>
                                <div style={{ display:"flex", gap:6 }}>
                                  <button title="View job" onClick={()=>window.location.href=`/admin/jobs/${job.id}`}
                                    style={{ width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${BORDER}`, borderRadius:8, backgroundColor:"#fff", color:"#1d4ed8", cursor:"pointer" }}>
                                    <Eye size={14}/>
                                  </button>
                                  {job.status==="closed" ? (
                                    <button title="Reactivate job" onClick={()=>handleJobStatusChange(job.id,"active")}
                                      style={{ width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${BORDER}`, borderRadius:8, backgroundColor:"#fff", color:"#15803d", cursor:"pointer" }}>
                                      <RotateCcw size={14}/>
                                    </button>
                                  ) : job.status==="inactive" ? (
                                    <button title="Resume job" onClick={()=>handleJobStatusChange(job.id,"active")}
                                      style={{ width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${BORDER}`, borderRadius:8, backgroundColor:"#fff", color:"#15803d", cursor:"pointer" }}>
                                      <Play size={14}/>
                                    </button>
                                  ) : (
                                    <button title="Pause job" onClick={()=>handleJobStatusChange(job.id,"inactive")}
                                      style={{ width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${BORDER}`, borderRadius:8, backgroundColor:"#fff", color:"#b45309", cursor:"pointer" }}>
                                      <Pause size={14}/>
                                    </button>
                                  )}
                                  <button title="Edit job" onClick={()=>window.location.href=`/admin/post-job?edit=${job.id}`}
                                    style={{ width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${BORDER}`, borderRadius:8, backgroundColor:"#fff", color:"#374151", cursor:"pointer" }}>
                                    <Pencil size={13}/>
                                  </button>
                                  <button title="Delete job" onClick={()=>handleDeleteJob(job.id)}
                                    style={{ width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", border:"1.5px solid #fecaca", borderRadius:8, backgroundColor:"#fff", color:"#dc2626", cursor:"pointer" }}>
                                    <Trash2 size={13}/>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {filtered.length>0 && (
                  <div style={{ padding:"12px 24px", borderTop:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <span style={{ fontSize:12, color:"#94a3b8" }}>Showing {(jobsPage-1)*jobsPerPage+1} to {Math.min(jobsPage*jobsPerPage,filtered.length)} of {filtered.length} jobs</span>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <button onClick={()=>setJobsPage(p=>Math.max(1,p-1))} disabled={jobsPage===1}
                        style={{ padding:"5px 10px", border:`1.5px solid ${BORDER}`, borderRadius:7, backgroundColor:"#fff", color:jobsPage===1?"#d1d5db":"#374151", cursor:jobsPage===1?"not-allowed":"pointer", fontSize:13 }}>‹</button>
                      {Array.from({length:Math.min(totalPages,5)},(_,idx)=>{
                        const p = totalPages<=5 ? idx+1 : jobsPage<=3 ? idx+1 : jobsPage+idx-2;
                        if(p<1||p>totalPages) return null;
                        return (
                          <button key={p} onClick={()=>setJobsPage(p)}
                            style={{ padding:"5px 10px", minWidth:32, border:`1.5px solid ${jobsPage===p?O:BORDER}`, borderRadius:7, backgroundColor:jobsPage===p?O:"#fff", color:jobsPage===p?"#fff":"#374151", cursor:"pointer", fontSize:12, fontWeight:jobsPage===p?700:400 }}>{p}</button>
                        );
                      })}
                      {totalPages>5 && <span style={{ color:"#94a3b8", fontSize:12 }}>… {totalPages}</span>}
                      <button onClick={()=>setJobsPage(p=>Math.min(totalPages,p+1))} disabled={jobsPage===totalPages}
                        style={{ padding:"5px 10px", border:`1.5px solid ${BORDER}`, borderRadius:7, backgroundColor:"#fff", color:jobsPage===totalPages?"#d1d5db":"#374151", cursor:jobsPage===totalPages?"not-allowed":"pointer", fontSize:13 }}>›</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
        {activeTab==="jobs" && (() => {
          const recentJobs = [...jobs].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,5);
          const deptIcon = (dept="") => {
            const d = dept.toLowerCase();
            if (d.includes("engineer")||d.includes("dev")) return { icon:"</>", bg:"#F3E8FF", color:"#7c3aed" };
            if (d.includes("design")) return { icon:"✎", bg:"#FEE2E2", color:"#dc2626" };
            if (d.includes("product")) return { icon:"◆", bg:"#F3E8FF", color:"#7c3aed" };
            if (d.includes("data")||d.includes("analytic")) return { icon:"∞", bg:"#DBEAFE", color:"#1d4ed8" };
            if (d.includes("market")) return { icon:"◎", bg:"#FEF3C7", color:"#b45309" };
            return { icon:"✦", bg:O_LITE, color:O };
          };
          return (
            <div>
              <BackBtn/>

              {/* Hero */}
              <div style={{ ...CARD, display:"flex", alignItems:"center", justifyContent:"space-between", gap:24, marginBottom:24, flexWrap:"wrap" }}>
                <div style={{ flex:"1 1 360px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                    <div style={{ width:44, height:44, borderRadius:12, backgroundColor:O_LITE, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Briefcase size={20} color={O}/>
                    </div>
                    <div>
                      <h2 style={{ fontSize:20, fontWeight:800, margin:0 }}>Post New Job</h2>
                      <p style={{ fontSize:13, color:"#64748b", margin:"2px 0 0" }}>Create job openings and attract the best talent for your team.</p>
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:22, marginBottom:20, flexWrap:"wrap" }}>
                    {[
                      { icon:Target, label:"Reach the right talent", sub:"Your job will be visible to active job seekers." },
                      { icon:Zap, label:"Quick & Easy", sub:"Create and publish a job in just a few minutes." },
                      { icon:Sparkles, label:"Better Matches", sub:"Get quality applications from relevant candidates." },
                    ].map(f=>(
                      <div key={f.label} style={{ display:"flex", gap:10, alignItems:"flex-start", maxWidth:170 }}>
                        <div style={{ width:30, height:30, borderRadius:8, backgroundColor:O_LITE, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <f.icon size={14} color={O}/>
                        </div>
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>{f.label}</div>
                          <div style={{ fontSize:11, color:"#94a3b8", marginTop:2, lineHeight:1.4 }}>{f.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={()=>window.location.href="/admin/post-job"}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 24px", backgroundColor:O, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"inherit" }}>
                    <Plus size={16}/> Create New Job Posting
                  </button>
                </div>

                {/* Illustration */}
                <div style={{ flex:"0 0 220px", display:"flex", justifyContent:"center" }}>
                  <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="100" cy="145" rx="80" ry="10" fill="#FFF3E8"/>
                    <rect x="35" y="35" width="130" height="85" rx="8" fill="#fff" stroke={BORDER} strokeWidth="2"/>
                    <rect x="35" y="35" width="130" height="16" rx="8" fill="#FFF3E8"/>
                    <circle cx="43" cy="43" r="3" fill={O}/>
                    <circle cx="52" cy="43" r="3" fill="#FBBF7A"/>
                    <circle cx="61" cy="43" r="3" fill="#FDE8D2"/>
                    <circle cx="70" cy="80" r="14" fill="#FFF3E8"/>
                    <circle cx="70" cy="75" r="6" fill={O}/>
                    <path d="M58 92c0-7 5-12 12-12s12 5 12 12" fill={O}/>
                    <rect x="95" y="65" width="55" height="7" rx="3.5" fill="#F1F5F9"/>
                    <rect x="95" y="78" width="55" height="7" rx="3.5" fill="#F1F5F9"/>
                    <rect x="95" y="91" width="35" height="7" rx="3.5" fill="#F1F5F9"/>
                    <path d="M97 67l3 3 5-6" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M97 80l3 3 5-6" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="20" y="120" width="160" height="10" rx="5" fill="#F1F5F9"/>
                    <circle cx="152" cy="108" r="20" fill="#fff" stroke={O} strokeWidth="3"/>
                    <line x1="166" y1="122" x2="178" y2="134" stroke={O} strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>

              {/* Recent Job Postings */}
              <div style={{ ...CARD, padding:0, overflow:"visible" }}>
                <div style={{ padding:"18px 22px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>Recent Job Postings</div>
                    <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>Overview of your recently created job openings.</div>
                  </div>
                  <button onClick={()=>setActiveTab("jobs-list")} style={{ background:"none", border:"none", color:O, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
                    View All Jobs <ChevronRight size={14}/>
                  </button>
                </div>

                {recentJobs.length===0 ? (
                  <div style={{ padding:"48px", textAlign:"center", color:"#94a3b8" }}>No jobs posted yet.</div>
                ) : (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor:"#F8FAFC", borderBottom:`1.5px solid ${BORDER}` }}>
                          {["Job Title","Department","Location","Applicants","Status","Created On","Actions"].map(h=>(
                            <th key={h} style={{ textAlign:"left", padding:"12px 16px", color:"#64748b", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentJobs.map((job,i)=>{
                          const meta = jobStatusMeta(job.status||"active");
                          const di = deptIcon(job.department);
                          return (
                            <tr key={job.id} style={{ borderBottom: i<recentJobs.length-1?`1px solid ${BORDER}`:"none" }}>
                              <td style={{ padding:"13px 16px" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                  <div style={{ width:30, height:30, borderRadius:8, backgroundColor:di.bg, color:di.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{di.icon}</div>
                                  <div>
                                    <div style={{ fontWeight:700, fontSize:13 }}>{job.job_title}</div>
                                    <div style={{ fontSize:11, color:"#94a3b8" }}>{jobCode(job)}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding:"13px 16px", color:"#475569", fontSize:13 }}>{job.department||"—"}</td>
                              <td style={{ padding:"13px 16px", color:"#475569", fontSize:13 }}>{job.location||"—"}</td>
                              <td style={{ padding:"13px 16px", color:"#374151", fontSize:13, fontWeight:600 }}>{job.applicant_count ?? 0}</td>
                              <td style={{ padding:"13px 16px" }}>
                                <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, padding:"4px 11px", borderRadius:999, backgroundColor:meta.bg, color:meta.color, border:`1px solid ${meta.border}` }}>
                                  <span style={{ width:6, height:6, borderRadius:"50%", backgroundColor:meta.dot }}/> {meta.label}
                                </span>
                              </td>
                              <td style={{ padding:"13px 16px", color:"#94a3b8", fontSize:12 }}>
                                {job.created_at ? new Date(job.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                              </td>
                              <td style={{ padding:"13px 16px", position:"relative" }}>
                                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                                  <button title="View job" onClick={()=>window.location.href=`/admin/jobs/${job.id}`}
                                    style={{ width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${BORDER}`, borderRadius:8, backgroundColor:"#fff", color:"#1d4ed8", cursor:"pointer" }}>
                                    <Eye size={14}/>
                                  </button>
                                  <button title="More actions" onClick={e=>{e.stopPropagation();setOpenJobMenuId(openJobMenuId===job.id?null:job.id);}}
                                    style={{ width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${BORDER}`, borderRadius:8, backgroundColor:"#fff", color:"#374151", cursor:"pointer" }}>
                                    <MoreVertical size={14}/>
                                  </button>
                                </div>
                                {openJobMenuId===job.id && (
                                  <div onClick={e=>e.stopPropagation()} style={{ position:"absolute", right:16, top:"calc(100% + 4px)", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:10, boxShadow:"0 12px 32px rgba(0,0,0,0.12)", zIndex:20, minWidth:170, overflow:"hidden" }}>
                                    <button onClick={()=>{setOpenJobMenuId(null);window.location.href=`/admin/post-job?edit=${job.id}`;}}
                                      style={{ width:"100%", padding:"10px 16px", border:"none", background:"none", textAlign:"left", fontSize:13, color:"#374151", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8 }}
                                      onMouseEnter={e=>e.currentTarget.style.backgroundColor="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                                      <Pencil size={13}/> Edit Job
                                    </button>
                                    {job.status==="inactive" || job.status==="closed" ? (
                                      <button onClick={()=>{setOpenJobMenuId(null);handleJobStatusChange(job.id,"active");}}
                                        style={{ width:"100%", padding:"10px 16px", border:"none", background:"none", textAlign:"left", fontSize:13, color:"#15803d", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8 }}
                                        onMouseEnter={e=>e.currentTarget.style.backgroundColor="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                                        <Play size={13}/> Reactivate
                                      </button>
                                    ) : (
                                      <button onClick={()=>{setOpenJobMenuId(null);handleJobStatusChange(job.id,"inactive");}}
                                        style={{ width:"100%", padding:"10px 16px", border:"none", background:"none", textAlign:"left", fontSize:13, color:"#b45309", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8 }}
                                        onMouseEnter={e=>e.currentTarget.style.backgroundColor="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                                        <Pause size={13}/> Pause Job
                                      </button>
                                    )}
                                    {job.status!=="closed" && (
                                      <button onClick={()=>{setOpenJobMenuId(null);handleJobStatusChange(job.id,"closed");}}
                                        style={{ width:"100%", padding:"10px 16px", border:"none", background:"none", textAlign:"left", fontSize:13, color:"#dc2626", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8 }}
                                        onMouseEnter={e=>e.currentTarget.style.backgroundColor="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                                        <XCircle size={13}/> Close Job
                                      </button>
                                    )}
                                    <button onClick={()=>{setOpenJobMenuId(null);handleDeleteJob(job.id);}}
                                      style={{ width:"100%", padding:"10px 16px", border:"none", borderTop:`1px solid ${BORDER}`, background:"none", textAlign:"left", fontSize:13, color:"#dc2626", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8 }}
                                      onMouseEnter={e=>e.currentTarget.style.backgroundColor="#FEF2F2"} onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                                      <Trash2 size={13}/> Delete Job
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {jobs.length>5 && (
                  <div style={{ padding:"14px", textAlign:"center", borderTop:`1px solid ${BORDER}` }}>
                    <button onClick={()=>setActiveTab("jobs-list")} style={{ background:"none", border:"none", color:O, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:4 }}>
                      View All Jobs ({jobs.length}) <ChevronRight size={14}/>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════ */}
        {/* MANAGE STATUS                                   */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab==="manage-status" && (() => {
          const locations = ["All", ...Array.from(new Set(statusCandidates.map(c=>c.current_location).filter(Boolean)))];

          const filtered = statusCandidates.filter(c => {
            const q = statusSearch.toLowerCase();
            const matchQ = !q || [c.name,c.email,c.contact,c.skills,c.job_role].filter(Boolean).join(" ").toLowerCase().includes(q);
            const matchSrc = sourceFilter==="all" || c._source===sourceFilter;
            const matchSt = statusFilter2==="all" || (c.candidate_status||"Contacted")===statusFilter2;
            const matchLoc = locationFilter==="All" || c.current_location===locationFilter;
            return matchQ && matchSrc && matchSt && matchLoc;
          });

          // Status counts for top bar
          const statusCounts = {};
          statusCandidates.forEach(c => {
            const s = c.candidate_status||"Contacted";
            statusCounts[s] = (statusCounts[s]||0)+1;
          });

          const statusStyle = (s) => {
            const map = {
              "Hired":["#DCFCE7","#15803d"],"Offered":["#EFF6FF","#1d4ed8"],"Interview Scheduled":["#F3E8FF","#7c3aed"],
              "Interview Cleared":["#ECFEFF","#0891b2"],
              "Shortlisted":["#ECFDF5","#059669"],"Contacted":["#F8FAFC","#64748b"],
              "Rejected":["#FEF2F2","#dc2626"],"On Hold":["#FEF3C7","#d97706"],"Interested":["#DCFCE7","#15803d"],
              "Not Interested":["#FEF2F2","#dc2626"],"No Response":["#F8FAFC","#94a3b8"],
              "Awaiting Candidate":["#FFF7ED",O],"Accepted":["#DCFCE7","#15803d"],
              "Referred":["#F3E8FF","#7c3aed"],
            };
            return map[s]||["#F8FAFC","#64748b"];
          };
          const sourceTag = (src) => ({
            referred: { label:"Referred", bg:"#F3E8FF", color:"#7c3aed", border:"#d8b4fe" },
            bulk: { label:"Bulk Upload", bg:"#EFF6FF", color:"#1d4ed8", border:"#BFDBFE" },
            portal: { label:"Portal", bg:"#DCFCE7", color:"#15803d", border:"#86efac" },
          }[src] || { label:src, bg:"#F8FAFC", color:"#64748b", border:BORDER });

          const handleExport = async () => {
            try {
              setExportingStatus(true);
              const params = new URLSearchParams();
              if (statusSearch) params.set("search", statusSearch);
              if (statusFilter2 !== "all") params.set("status", statusFilter2);
              if (sourceFilter !== "all") params.set("source", sourceFilter);
              const res = await axios.get(`${API_BASE_URL}/api/admin/candidate-status/export?${params.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                responseType: "blob",
              });
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const a = document.createElement("a");
              a.href = url;
              a.download = `candidate-status-${Date.now()}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
              showSuccess("Export downloaded");
            } catch { showError("Failed to export CSV"); } finally { setExportingStatus(false); }
          };

          const handleViewCV = (c) => {
            if (c._source === "bulk") { window.open(`/bulk-candidates/${c.id}`, "_blank"); return; }
            if (c._source === "portal" && c.resume_link) { window.open(c.resume_link, "_blank"); return; }
            if (c._source === "referred" && c.cv_file) { window.open(`${API_BASE_URL}/uploads/cv/${c.cv_file}`, "_blank"); return; }
            setSelectedCandidate({ ...c, _type:c._source==="referred"?"referred":c._source, status:c.candidate_status });
          };

          return (
            <div>
              <BackBtn/>
              {/* Hero banner */}
              <div style={{ background:"linear-gradient(135deg,#f0f7ff 0%,#e8f4fd 100%)", border:`1.5px solid ${BORDER}`, borderRadius:18, padding:"26px 32px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <h2 style={{ fontSize:22, fontWeight:800, margin:"0 0 6px", color:"#0f172a" }}>Candidate Status Management</h2>
                  <p style={{ fontSize:13, color:"#64748b", margin:0 }}>Track candidate progress, evaluate suitability, and make data-driven hiring decisions.</p>
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  <div style={{ textAlign:"center", padding:"12px 20px", backgroundColor:"#fff", borderRadius:12, border:`1.5px solid ${BORDER}` }}>
                    <div style={{ fontSize:28, fontWeight:800, color:"#0f172a" }}>{statusCandidates.length}</div>
                    <div style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>Total</div>
                  </div>
                </div>
              </div>

              {/* Overview stat cards */}
              <div style={{ ...CARD, padding:"16px 24px", marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <span style={{ fontWeight:700, fontSize:14 }}>Overview</span>
                  <select style={{ padding:"5px 12px", border:`1.5px solid ${BORDER}`, borderRadius:8, fontSize:12, fontFamily:"inherit", color:"#374151", cursor:"pointer" }}>
                    <option>All Jobs</option>
                  </select>
                </div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  {[
                    { Icon:Users, label:"Total Candidates", value:statusCandidates.length, color:"#1d4ed8", bg:"#EFF6FF" },
                    { Icon:Phone, label:"Contacted", value:statusCounts["Contacted"]||0, color:"#64748b", bg:"#F8FAFC" },
                    { Icon:ThumbsUp, label:"Interested", value:statusCounts["Interested"]||0, color:"#15803d", bg:"#DCFCE7" },
                    { Icon:ThumbsDown, label:"Not Interested", value:statusCounts["Not Interested"]||0, color:"#dc2626", bg:"#FEF2F2" },
                    { Icon:PhoneOff, label:"No Response", value:statusCounts["No Response"]||0, color:"#94a3b8", bg:"#F8FAFC" },
                    { Icon:Star, label:"Shortlisted", value:statusCounts["Shortlisted"]||0, color:"#059669", bg:"#ECFDF5" },
                    { Icon:Calendar, label:"Interview Scheduled", value:statusCounts["Interview Scheduled"]||0, color:"#7c3aed", bg:"#F3E8FF" },
                    { Icon:CheckCircle2, label:"Interview Cleared", value:statusCounts["Interview Cleared"]||0, color:"#0891b2", bg:"#ECFEFF" },
                    { Icon:Briefcase, label:"Offered", value:statusCounts["Offered"]||0, color:O, bg:O_LITE },
                    { Icon:CheckCircle2, label:"Hired", value:statusCounts["Hired"]||0, color:"#15803d", bg:"#DCFCE7" },
                    { Icon:XCircle, label:"Rejected", value:statusCounts["Rejected"]||0, color:"#dc2626", bg:"#FEF2F2" },
                    { Icon:Pause, label:"On Hold", value:statusCounts["On Hold"]||0, color:"#d97706", bg:"#FEF3C7" },
                    { Icon:Clock, label:"Awaiting Candidate", value:statusCounts["Awaiting Candidate"]||0, color:O, bg:O_LITE },
                    { Icon:UserCheck, label:"Accepted", value:statusCounts["Accepted"]||0, color:"#15803d", bg:"#DCFCE7" },
                    { Icon:Megaphone, label:"Referred", value:statusCounts["Referred"]||0, color:"#7c3aed", bg:"#F3E8FF" },
                  ].map(s=>(
                    <div key={s.label} onClick={()=>setStatusFilter2(f=>f===s.label?"all":s.label)}
                      style={{ cursor:"pointer", textAlign:"center", minWidth:110, padding:"12px 14px", borderRadius:12, border:`1.5px solid ${statusFilter2===s.label?s.color:BORDER}`, backgroundColor:statusFilter2===s.label?s.bg:"#fff", opacity: statusFilter2!=="all"&&statusFilter2!==s.label?0.55:1, transition:"all 0.15s" }}>
                      <div style={{ width:32, height:32, borderRadius:9, backgroundColor:s.bg, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px" }}>
                        <s.Icon size={16} color={s.color}/>
                      </div>
                      <div style={{ fontSize:20, fontWeight:800, color:statusFilter2===s.label?s.color:"#0f172a" }}>{s.value}</div>
                      <div style={{ fontSize:11, color:"#64748b", fontWeight:600, whiteSpace:"nowrap" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filters bar */}
              <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
                <div style={{ flex:1, minWidth:200, display:"flex", alignItems:"center", gap:8, padding:"9px 14px", backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:9 }}>
                  <Search size={14} color="#94a3b8"/>
                  <input value={statusSearch} onChange={e=>setStatusSearch(e.target.value)} placeholder="Search by name, email, phone or skills..."
                    style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:"inherit", background:"transparent" }}/>
                  {statusSearch && <button onClick={()=>setStatusSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}><X size={13}/></button>}
                </div>
                {/* Source filter */}
                <div style={{ display:"flex", gap:6 }}>
                  {[{id:"all",label:"All Sources"},{id:"referred",label:"Referred"},{id:"bulk",label:"Bulk Upload"},{id:"portal",label:"Portal"}].map(f=>(
                    <button key={f.id} onClick={()=>setSourceFilter(f.id)}
                      style={{ padding:"8px 14px", border:`1.5px solid ${sourceFilter===f.id?O:BORDER}`, borderRadius:9, backgroundColor:sourceFilter===f.id?O_LITE:"#fff", color:sourceFilter===f.id?O:"#475569", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                      {f.label}
                    </button>
                  ))}
                </div>
                {/* Status filter */}
                <select value={statusFilter2} onChange={e=>setStatusFilter2(e.target.value)}
                  style={{ padding:"8px 14px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:12, fontFamily:"inherit", color:"#374151", backgroundColor:"#fff", cursor:"pointer" }}>
                  <option value="all">All Status</option>
                  {["Contacted","Interested","Not Interested","No Response","Shortlisted","Interview Scheduled","Interview Cleared","Offered","Hired","Rejected","On Hold","Awaiting Candidate","Accepted","Referred"].map(s=><option key={s}>{s}</option>)}
                </select>
                {/* Location filter */}
                <select value={locationFilter} onChange={e=>setLocationFilter(e.target.value)}
                  style={{ padding:"8px 14px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:12, fontFamily:"inherit", color:"#374151", backgroundColor:"#fff", cursor:"pointer" }}>
                  {locations.map(l=><option key={l}>{l}</option>)}
                </select>
                {/* Export */}
                <button onClick={handleExport} disabled={exportingStatus}
                  style={{ padding:"8px 16px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#fff", color:"#475569", fontSize:12, fontWeight:600, cursor:exportingStatus?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:exportingStatus?0.6:1 }}>
                  <ExternalLink size={13} style={{ transform:"rotate(90deg)" }}/> {exportingStatus?"Exporting…":"Export"}
                </button>
              </div>

              {/* Table */}
              <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, overflow:"hidden" }}>
                {/* Col headers */}
                <div style={{ display:"grid", gridTemplateColumns:"2.2fr 1.6fr 1.2fr 1.2fr 1.2fr 1.4fr 1.2fr 1fr", gap:8, padding:"11px 20px", backgroundColor:"#F8FAFC", borderBottom:`1.5px solid ${BORDER}`, fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  <span>Candidate</span><span>Contact</span><span>Location</span><span>Role</span><span>Source</span><span>Current Status</span><span>Updated At</span><span>Actions</span>
                </div>

                {statusListLoading ? (
                  <div style={{ padding:"60px", textAlign:"center", color:"#94a3b8" }}>
                    <p style={{ margin:0, fontWeight:600 }}>Loading candidates…</p>
                  </div>
                ) : filtered.length===0 ? (
                  <div style={{ padding:"60px", textAlign:"center", color:"#94a3b8" }}>
                    <Users size={44} color="#E5E7EB" style={{ display:"block", margin:"0 auto 14px" }}/>
                    <p style={{ margin:0, fontWeight:600 }}>No candidates match your filters</p>
                  </div>
                ) : filtered.map((c,i)=>{
                  const [bg,fg]=avatarColor(c.name);
                  const [ssBg,ssFg]=statusStyle(c.candidate_status||"Contacted");
                  const src=sourceTag(c._source);
                  const editable = c._source==="portal" || c._source==="bulk" || (c._source==="referred" && c.referral_status==="accepted");
                  return (
                    <div key={`${c._source}-${c.id}`}
                      style={{ display:"grid", gridTemplateColumns:"2.2fr 1.6fr 1.2fr 1.2fr 1.2fr 1.4fr 1.2fr 1fr", gap:8, padding:"14px 20px", borderBottom:i<filtered.length-1?`1px solid ${BORDER}`:"none", alignItems:"center", transition:"background 0.12s" }}
                      onMouseEnter={e=>e.currentTarget.style.backgroundColor="#F8FAFC"}
                      onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                      {/* Name */}
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:"50%", backgroundColor:bg, color:fg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>{initials(c.name)}</div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{c.name||"—"}</div>
                          <div style={{ fontSize:11, color:"#94a3b8" }}>{c.email||"—"}</div>
                        </div>
                      </div>
                      {/* Contact */}
                      <div style={{ fontSize:12, color:"#475569" }}>{c.contact||"—"}</div>
                      {/* Location */}
                      <div style={{ fontSize:12, color:"#64748b", display:"flex", alignItems:"center", gap:4 }}>
                        {c.current_location ? <><MapPin size={11}/>{c.current_location}</> : "—"}
                      </div>
                      {/* Role */}
                      <div style={{ fontSize:12, color:"#475569" }}>{c.job_role||"—"}</div>
                      {/* Source tag */}
                      <div>
                        <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:999, backgroundColor:src.bg, color:src.color, border:`1px solid ${src.border}` }}>{src.label}</span>
                      </div>
                      {/* Status dropdown / badge */}
                      <div>
                        {editable ? (
                          <select value={PIPELINE_STATUSES.includes(c.candidate_status) ? c.candidate_status : "Contacted"}
                            onChange={e=>handleUpdateCandidateStatus(c._source,c.id,e.target.value)}
                            disabled={updatingStatus===c.id}
                            style={{ padding:"5px 10px", border:`1.5px solid ${BORDER}`, borderRadius:8, fontSize:11, fontWeight:700, color:ssFg, backgroundColor:ssBg, cursor:updatingStatus===c.id?"not-allowed":"pointer", fontFamily:"inherit", opacity:updatingStatus===c.id?0.5:1, outline:"none" }}>
                            {PIPELINE_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span title="This referral hasn't been accepted yet — pipeline status can be set once the candidate accepts" style={{ padding:"5px 10px", borderRadius:8, fontSize:11, fontWeight:700, color:ssFg, backgroundColor:ssBg, border:`1.5px solid ${BORDER}` }}>{c.candidate_status||"Referred"}</span>
                        )}
                      </div>
                      {/* Updated at */}
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{c.status_updated_at?new Date(c.status_updated_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—"}</div>
                      {/* Actions */}
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>handleViewCV(c)}
                          style={{ padding:"5px 12px", border:`1.5px solid ${BORDER}`, borderRadius:7, backgroundColor:"#fff", color:"#374151", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>View CV</button>
                      </div>
                    </div>
                  );
                })}
                <div style={{ padding:"12px 20px", borderTop:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>Showing 1 to {filtered.length} of {statusCandidates.length} candidates</span>
                  <div style={{ display:"flex", gap:6 }}>
                    {sourceFilter!=="all" && <button onClick={()=>setSourceFilter("all")} style={{ fontSize:11, padding:"3px 10px", border:`1px solid ${BORDER}`, borderRadius:6, cursor:"pointer", background:"#fff", color:"#475569", fontFamily:"inherit" }}>✕ {sourceTag(sourceFilter).label}</button>}
                    {statusFilter2!=="all" && <button onClick={()=>setStatusFilter2("all")} style={{ fontSize:11, padding:"3px 10px", border:`1px solid ${BORDER}`, borderRadius:6, cursor:"pointer", background:"#fff", color:"#475569", fontFamily:"inherit" }}>✕ {statusFilter2}</button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab==="resume-parse" && (
          <div>
            <BackBtn/>
            <TabHeader title="Resume Parser" subtitle="Paste resume PDF links, or upload PDF files directly — details are extracted automatically"/>
            <div style={{ ...CARD, marginBottom:20 }}>
              <div style={{ backgroundColor:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:12, padding:"14px 18px", marginBottom:22, display:"flex", gap:12 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:"#92400e", marginBottom:4 }}>How it works</div>
                  <div style={{ fontSize:12, color:"#78350f", lineHeight:1.7 }}>Paste PDF links or upload PDF files directly · Click Parse/Upload · System extracts: <strong>Name, Email, Phone, Location, Qualification, Experience, Company, Skills</strong> · Candidates auto-added with unique <strong>RES-YYYY-NNNNN</strong> ID.</div>
                </div>
              </div>

              <div style={{ display:"flex", gap:8, marginBottom:20 }}>
                {[{id:"links",label:"Paste Links"},{id:"files",label:"Direct Upload"}].map(m=>(
                  <button key={m.id} onClick={()=>{setResumeUploadMode(m.id);setParseResults(null);}}
                    style={{ padding:"9px 18px", borderRadius:9, border:`1.5px solid ${resumeUploadMode===m.id?O:BORDER}`, backgroundColor:resumeUploadMode===m.id?O_LITE:"#fff", color:resumeUploadMode===m.id?O:"#475569", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    {m.label}
                  </button>
                ))}
              </div>

              {resumeUploadMode==="links" ? (
                <>
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
                </>
              ) : (
                <>
                  <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:8 }}>Resume Files <span style={{ fontWeight:400, color:"#94a3b8" }}>(PDF, Word, or image — select up to 50)</span></label>
                  <label htmlFor="resume-files-input" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, padding:"36px 20px", border:`2px dashed ${resumeFiles.length?O:BORDER}`, borderRadius:12, backgroundColor:resumeFiles.length?O_LITE:"#FAFBFC", cursor:"pointer", textAlign:"center" }}>
                    <Upload size={22} color={resumeFiles.length?O:"#94a3b8"}/>
                    <div style={{ fontSize:13, fontWeight:600, color:resumeFiles.length?O:"#374151" }}>
                      {resumeFiles.length ? `${resumeFiles.length} file(s) selected` : "Click to choose files, or drag & drop"}
                    </div>
                    <div style={{ fontSize:11, color:"#94a3b8" }}>PDF, .doc/.docx, .jpg/.png/.webp · up to 50 files · 10MB each</div>
                    <input id="resume-files-input" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" multiple style={{ display:"none" }}
                      onChange={e=>{
                        const chosen = Array.from(e.target.files||[]);
                        if(chosen.length>50){showError("Max 50 files per batch");return;}
                        setResumeFiles(chosen);
                      }}/>
                  </label>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:8, lineHeight:1.6 }}>
                    Every file is kept and a candidate record is created — if a resume can't be auto-read (a scanned/image resume, a legacy .doc, etc.) it's saved with a <strong>Needs Review</strong> flag so you can open it and fill in the candidate's details by hand. Nothing is discarded.
                  </div>
                  {resumeFiles.length>0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
                      {resumeFiles.slice(0,12).map((f,i)=>(
                        <span key={i} style={{ fontSize:11, backgroundColor:"#F1F5F9", color:"#475569", padding:"3px 10px", borderRadius:6 }}>{f.name}</span>
                      ))}
                      {resumeFiles.length>12 && <span style={{ fontSize:11, color:"#94a3b8" }}>+{resumeFiles.length-12} more</span>}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:10, marginTop:16 }}>
                    <button onClick={handleBulkUploadResumeFiles} disabled={uploadingResumeFiles}
                      style={{ padding:"11px 26px", backgroundColor:uploadingResumeFiles?"#FEF3C7":O, color:uploadingResumeFiles?"#c2410c":"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:uploadingResumeFiles?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8 }}>
                      {uploadingResumeFiles?(<><span style={{ display:"inline-block", width:14, height:14, border:"2px solid #c2410c", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/> Uploading…</>):"⬆️ Upload & Parse"}
                    </button>
                    {!uploadingResumeFiles && <button onClick={()=>{setResumeFiles([]);setParseResults(null);}} style={{ padding:"11px 20px", backgroundColor:"#fff", color:"#64748b", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Clear</button>}
                  </div>
                </>
              )}
            </div>
            {parseResults && (
              <div style={{ ...CARD }}>
                <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
                  {[{label:"Total",value:parseResults.totalLinks??parseResults.totalFiles,bg:"#F8FAFC",color:"#374151"},{label:"✅ Parsed",value:parseResults.parsedCount,bg:"#f0fdf4",color:"#166534"},{label:"⚠️ Needs Review",value:parseResults.needsReviewCount,bg:"#FEF3C7",color:"#92400e"},{label:"❌ Failed",value:parseResults.errorCount,bg:"#fef2f2",color:"#dc2626"}].filter(s=>s.value!==undefined).map(s=>(
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
                    <button onClick={()=>window.open(`/bulk-candidates/${c.id}`,"_blank")}
                      style={{ padding:"6px 14px", backgroundColor:O, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}>View</button>
                  </div>
                ))}
                {parseResults.needsReview?.map((c,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", marginBottom:8, backgroundColor:"#FFFBEB", border:"1.5px solid #FDE68A", borderLeft:"4px solid #D97706", borderRadius:10 }}>
                    <div style={{ width:38, height:38, borderRadius:"50%", backgroundColor:"#FEF3C7", color:"#92400e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                      <AlertCircle size={16}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, color:"#78350f" }}>{c.original_resume_filename || c.name}</div>
                      <div style={{ fontSize:12, color:"#92400e" }}>{c.parse_error}</div>
                    </div>
                    <div style={{ fontSize:11, color:"#b45309", textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontWeight:700, marginBottom:2 }}>{c.candidate_id}</div>
                      <div>resume kept · not discarded</div>
                    </div>
                    <button onClick={()=>window.open(`/bulk-candidates/${c.id}`,"_blank")}
                      style={{ padding:"6px 14px", backgroundColor:"#D97706", color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>Fill Details</button>
                  </div>
                ))}
                {parseResults.errors?.map((e,i)=>(
                  <div key={i} style={{ padding:"10px 14px", marginBottom:6, backgroundColor:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, fontSize:13 }}>
                    <span style={{ fontWeight:600, color:"#dc2626" }}>#{e.index}</span>
                    <span style={{ color:"#374151", marginLeft:8 }}>{e.url||e.file}</span>
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
              {/* Referrer info for referred candidates */}
              {selectedCandidate._type==="referred" && (selectedCandidate.referrer_name || selectedCandidate.referrer_id) && (
                <div style={{ marginTop:16, padding:"14px", backgroundColor:"#F3E8FF", borderRadius:12, border:"1.5px solid #d8b4fe" }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:10 }}>Referred By</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#0f172a" }}>{selectedCandidate.referrer_name||"Unknown Referrer"}</div>
                      {selectedCandidate.referrer_email && <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{selectedCandidate.referrer_email}</div>}
                      {selectedCandidate.referrer_phone && <div style={{ fontSize:12, color:"#64748b" }}>{selectedCandidate.referrer_phone}</div>}
                    </div>
                    {selectedCandidate.referrer_id && (
                      <button onClick={()=>window.location.href=`/admin/referrers/${selectedCandidate.referrer_id}`}
                        style={{ padding:"8px 16px", backgroundColor:"#7c3aed", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                        View Referrer Profile →
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Full details link for portal candidates */}
              {selectedCandidate._type==="portal" && selectedCandidate.id && (
                <button onClick={()=>window.location.href=`/admin/candidates/${selectedCandidate.id}`}
                  style={{ display:"block", width:"100%", marginTop:16, padding:"11px", backgroundColor:O, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  Open Full Profile →
                </button>
              )}
              {/* Full profile link for referred candidates */}
              {selectedCandidate._type==="referred" && selectedCandidate.id && (
                <button onClick={()=>window.location.href=`/admin/referred-candidates/${selectedCandidate.id}`}
                  style={{ display:"block", width:"100%", marginTop:16, padding:"11px", backgroundColor:O, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  View Full Profile →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
