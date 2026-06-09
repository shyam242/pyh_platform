"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { Users, DollarSign, UserCheck, Briefcase, LogOut, Trash2, Upload, ChevronDown } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboardData, setDashboardData] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [referrers, setReferrers] = useState([]);
  const [pendingRecruiters, setPendingRecruiters] = useState([]);
  const [approvedRecruiters, setApprovedRecruiters] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
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

  useEffect(() => {
    fetchDashboardData();
    fetchJobs();
  }, []);

  useEffect(() => {
    if (activeTab === "recruiters") {
      fetchApprovedRecruiters();
    }
    if (activeTab === "incentives") {
      fetchReferrers();
    }
    if (activeTab === "candidates") {
      fetchDashboardData();
    }
    if (activeTab === "jobs-list") {
      fetchJobs();
    }
    if (activeTab === "manage-status") {
      fetchBulkCandidates();
      fetchCandidateStatusStats();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDashboardData(response.data.dashboard);
      setCandidates(response.data.candidates);
      setPendingRecruiters(response.data.pendingRecruiters);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      showError("Failed to load dashboard");
      setLoading(false);
    }
  };

  const fetchReferrers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/admin/referrers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReferrers(response.data);
    } catch (error) {
      console.error("Error fetching referrers:", error);
      showError("Failed to load referrers");
    }
  };

  const fetchApprovedRecruiters = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/admin/users/recruiter`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Normalize response to array and filter only approved recruiters
      const list = Array.isArray(response.data) ? response.data : (response.data.data || response.data.users || []);
      const approved = list.filter(r => r.is_recruiter_approved || r.is_recruiter_approved === true || r.is_recruiter_approved === 't');
      setApprovedRecruiters(approved);
    } catch (error) {
      console.error("Error fetching approved recruiters:", error);
      showError("Failed to load recruiters");
    }
  };

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/jobs/admin/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      showError("Failed to load jobs");
    }
  };

  const fetchBulkCandidates = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/admin/bulk-candidates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBulkCandidates(response.data);
    } catch (error) {
      console.error("Error fetching bulk candidates:", error);
      showError("Failed to load candidates");
    }
  };

  const fetchCandidateStatusStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/admin/candidate-status-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCandidateStatusStats(response.data);
    } catch (error) {
      console.error("Error fetching status stats:", error);
      showError("Failed to load status statistics");
    }
  };

  const handleUpdateCandidateStatus = async (candidateId, newStatus) => {
    try {
      setUpdatingStatus(candidateId);
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/admin/bulk-candidates/${candidateId}/status`,
        { candidate_status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess(`Candidate status updated to ${newStatus}`);
      fetchBulkCandidates();
      fetchCandidateStatusStats();
    } catch (error) {
      showError(error.response?.data?.message || "Failed to update candidate status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleSelectJob = (jobId) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
    setSelectAll(newSelected.size === jobs.length && jobs.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedJobs(new Set());
      setSelectAll(false);
    } else {
      setSelectedJobs(new Set(jobs.map(j => j.id)));
      setSelectAll(true);
    }
  };

  const handleDeleteSelectedJobs = async () => {
    if (selectedJobs.size === 0) {
      showError("No jobs selected");
      return;
    }

    if (!confirm(`Delete ${selectedJobs.size} job(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/jobs/admin/bulk-delete`,
        { jobIds: Array.from(selectedJobs) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data.deletedCount || response.data.deletedCount === 0) {
        showError(response.data.message || "No jobs were deleted");
        return;
      }

      showSuccess(`${response.data.deletedCount} job(s) deleted successfully`);
      setSelectedJobs(new Set());
      setSelectAll(false);
      fetchJobs();
    } catch (error) {
      showError(error.response?.data?.message || "Failed to delete jobs");
    }
  };

  const handleJobStatusChange = async (jobId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/jobs/${jobId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess(`Job status updated to ${newStatus}`);
      fetchJobs();
    } catch (error) {
      showError(error.response?.data?.message || "Failed to update job status");
    }
  };

  const fetchPendingRecruiters = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setPendingRecruiters(response.data.pendingRecruiters || []);
    } catch (error) {
      showError("Failed to load pending recruiters");
    }
  };

  const handleApproveRecruiter = async (recruiterId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/admin/recruiters/${recruiterId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess("Recruiter approved");
      fetchDashboardData();
    } catch (error) {
      showError("Failed to approve recruiter");
    }
  };

  const handleRejectRecruiter = async (recruiterId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/admin/recruiters/${recruiterId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess("Recruiter rejected");
      fetchDashboardData();
    } catch (error) {
      showError("Failed to reject recruiter");
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!confirm("Are you sure you want to remove this candidate? This action cannot be undone.")) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE_URL}/api/admin/candidates/${candidateId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess("Candidate removed successfully");
      fetchDashboardData();
    } catch (error) {
      showError("Failed to remove candidate");
    }
  };

  const handleUpdateIncentive = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/admin/incentives/${incentiveForm.referrerId}`,
        { incentive_value: incentiveForm.value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess("Incentive updated successfully");
      setIncentiveForm({ referrerId: "", value: "" });
      if (activeTab === "incentives") {
        fetchReferrers();
      }
    } catch (error) {
      showError("Failed to update incentive");
    }
  };

  const handleRevokeIncentive = async (referrerId) => {
    if (!confirm("Are you sure you want to revoke this referrer's incentive? This action cannot be undone.")) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE_URL}/api/admin/incentives/${referrerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess("Incentive revoked successfully");
      fetchReferrers();
      setEditingReferrerId(null);
    } catch (error) {
      showError("Failed to revoke incentive");
    }
  };

  const handleQuickEditIncentive = async (referrerId) => {
    if (editingIncentiveValue === "") {
      showError("Please enter an incentive value");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/admin/incentives/${referrerId}`,
        { incentive_value: editingIncentiveValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess("Incentive updated successfully");
      fetchReferrers();
      setEditingReferrerId(null);
      setEditingIncentiveValue("");
    } catch (error) {
      showError("Failed to update incentive");
    }
  };

  const parseCSV = (text) => {
    const lines = [];
    let currentLine = "";
    let insideQuotes = false;
    
    // Parse CSV properly handling quoted fields with newlines
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentLine += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === '\n' && !insideQuotes) {
        if (currentLine.trim()) lines.push(currentLine);
        currentLine = "";
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) lines.push(currentLine);
    
    if (lines.length < 2) return [];
    
    // Parse headers
    const headerLine = lines[0];
    const headers = headerLine.split(",").map(h => 
      h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_")
    );
    
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let currentValue = "";
      let inQuotes = false;
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        const nextChar = lines[i][j + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentValue += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim().replace(/^"|"$/g, ""));
          currentValue = "";
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim().replace(/^"|"$/g, ""));
      
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || "";
      });
      if (Object.values(obj).some(v => v !== "")) rows.push(obj);
    }
    
    return rows;
  };

  const handleBulkUploadJobs = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const jobs = parseCSV(text);
      
      if (jobs.length === 0) {
        showError("No valid jobs found in CSV");
        return;
      }

      setUploadingJobs(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/bulk-upload/jobs`,
        { jobs },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccess(`${response.data.createdCount} jobs created successfully`);
      if (response.data.errors) {
        showError("Some rows failed: " + response.data.errors.slice(0, 3).join(", "));
      }
      e.target.value = "";
      // Refresh the jobs list if it's currently being viewed
      if (activeTab === "jobs-list") {
        fetchJobs();
      }
    } catch (error) {
      showError(error.response?.data?.message || "Failed to upload jobs");
    } finally {
      setUploadingJobs(false);
    }
  };

  const handleBulkUploadCandidates = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showError("Please upload a CSV file");
      return;
    }

    try {
      setUploadingCandidates(true);
      const token = localStorage.getItem("token");
      
      const formData = new FormData();
      formData.append("csvFile", file);

      const response = await axios.post(
        `${API_BASE_URL}/api/admin/bulk-upload/csv`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          } 
        }
      );

      showSuccess(`${response.data.uploadedCount} candidates uploaded successfully`);
      if (response.data.errors && response.data.errors.length > 0) {
        const errorMsg = response.data.errors.slice(0, 3).join("; ");
        showError("Some rows had issues: " + errorMsg);
      }
      e.target.value = "";
      // Optionally refresh candidate list
      fetchDashboardData();
    } catch (error) {
      showError(error.response?.data?.message || "Failed to upload candidates");
    } finally {
      setUploadingCandidates(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
     window.location.href = "/signin";
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: "1.5rem",
            marginBottom: "1rem",
            color: "#9ca3af"
          }}>
            Loading...
          </div>
          <p style={{ fontSize: "1.1rem", color: "#6b7280" }}>Loading Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>

      {/* NAVBAR */}
      <nav style={{
        position: "relative",
        zIndex: 100,
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <div style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "1.5rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1f2937", margin: 0 }}>
            PickYourHire Admin
          </h1>
          
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            {/* DROPDOWN MENU */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#ffffff",
                  color: "#f97316",
                  border: "1px solid #f97316",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  transition: "all 0.3s",
                  boxShadow: "0 1px 2px rgba(249,115,22,0.15)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#e5e7eb";
                  e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.07)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                }}
              >
                Menu
                <ChevronDown style={{ width: "1rem", height: "1rem", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s" }} />
              </button>

              {/* DROPDOWN CONTENT */}
              {dropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 0.5rem)",
                  right: 0,
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.75rem",
                  minWidth: "220px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                  zIndex: 1000
                }}>
                  {[
                    { id: "overview", label: "Overview" },
                    { id: "candidates", label: "Candidates" },
                    { id: "manage-status", label: "Candidate Status" },
                    { id: "pending-recruiters", label: "⏳ Pending Recruiters" },
                    { id: "recruiters", label: "Approved Recruiters" },
                    { id: "incentives", label: "Incentives" },
                    { id: "jobs-list", label: "All Jobs" },
                    { id: "jobs", label: "Post Jobs" },
                    { id: "bulk-jobs", label: "Bulk Jobs" },
                    { id: "bulk-candidates", label: "Bulk Candidates" },
                    { id: "resume-views", label: "📊 Resume Analytics", isLink: "/admin/resume-views" }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.isLink) { window.location.href = item.isLink; return; }
                        setActiveTab(item.id);
                        setDropdownOpen(false);
                        if (item.id === "incentives") fetchReferrers();
                        if (item.id === "recruiters") fetchApprovedRecruiters();
                        if (item.id === "pending-recruiters") fetchPendingRecruiters();
                        if (item.id === "jobs-list") fetchJobs();
                        if (item.id === "manage-status") {
                          fetchBulkCandidates();
                          fetchCandidateStatusStats();
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "0.875rem 1.5rem",
                        border: "none",
                        backgroundColor: activeTab === item.id ? "#f3f4f6" : "#ffffff",
                        color: activeTab === item.id ? "#f97316" : "#374151",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        fontWeight: activeTab === item.id ? "600" : "400",
                        transition: "all 0.2s",
                        borderLeft: activeTab === item.id ? "3px solid #f97316" : "3px solid transparent"
                      }}
                      onMouseEnter={(e) => {
                        if (activeTab !== item.id) e.currentTarget.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        if (activeTab !== item.id) e.currentTarget.style.backgroundColor = "#ffffff";
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* LOGOUT BUTTON */}
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: "#f97316",
                color: "#fff",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: "600",
                transition: "all 0.3s",
                boxShadow: "0 1px 3px rgba(249,115,22,0.25)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ea580c";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(249,115,22,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#f97316";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(249,115,22,0.25)";
              }}
            >
              <LogOut style={{ width: "1rem", height: "1rem" }} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* CONTENT HEADER */}
        {['overview','candidates','recruiters','incentives','manage-status'].includes(activeTab) && (
          <div style={{
            marginBottom: "2rem",
            padding: "1.5rem",
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
          }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "#1f2937",
              margin: "0 0 0.5rem 0"
            }}>
              {[
                { id: "overview", label: "Dashboard Overview" },
                { id: "candidates", label: "Manage Candidates" },
                { id: "recruiters", label: "Approved Recruiters" },
                { id: "incentives", label: "Referrer Incentives" },
                { id: "manage-status", label: "Candidate Status Management" },
                { id: "jobs-list", label: "All Jobs" },
                { id: "jobs", label: "Post New Job" },
                { id: "bulk-jobs", label: "Bulk Upload Jobs" },
                { id: "bulk-candidates", label: "Bulk Upload Candidates" }
              ].find(t => t.id === activeTab)?.label}
            </h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
              {activeTab === "manage-status" 
                ? "Update and track candidate progress through different stages"
                : "Manage your platform efficiently from this comprehensive dashboard"}
            </p>
          </div>
        )}

        {/* CANDIDATES TAB */}
        {activeTab === "candidates" && (
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            padding: "2rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem", color: "#1f2937" }}>
              Candidates ({candidates.length})
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {candidates.map(candidate => (
                <div
                  key={candidate.id}
                  onClick={() => window.location.href = `/admin/candidates/${candidate.id}`}
                  style={{
                    padding: "1.25rem",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "0.75rem",
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: "#1f2937" }}>{candidate.name}</h3>
                  <p style={{ margin: "0.25rem 0 0.5rem 0", color: "#6b7280" }}>{candidate.email}</p>
                  <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>{candidate.skills ? candidate.skills.split(",").slice(0,3).join(", ") : "No skills listed"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECRUITERS TAB */}
        {activeTab === "pending-recruiters" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", margin: "0 0 4px" }}>Pending Recruiter Approvals</h2>
              <p style={{ fontSize: "0.9rem", color: "#64748b", margin: 0 }}>Review and approve or reject recruiter registrations</p>
            </div>
            {pendingRecruiters.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <p style={{ color: "#94a3b8", fontSize: "1rem", margin: 0 }}>No pending recruiter approvals 🎉</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {pendingRecruiters.map(recruiter => (
                  <div key={recruiter.id} style={{ backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderLeft: "4px solid #f59e0b", borderRadius: "14px", padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "#FFF7ED", color: "#E87722", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                      {(recruiter.name || "R").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "15px", fontWeight: "700", marginBottom: "2px" }}>{recruiter.name}</div>
                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>{recruiter.email} {recruiter.phone ? `· ${recruiter.phone}` : ""}</div>
                      {recruiter.company_name && <div style={{ fontSize: "12px", color: "#94a3b8" }}>🏢 {recruiter.company_name}{recruiter.company_website ? ` · ${recruiter.company_website}` : ""}</div>}
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                      <button onClick={() => { handleApproveRecruiter(recruiter.id); setTimeout(() => fetchPendingRecruiters(), 800); }}
                        style={{ padding: "8px 20px", backgroundColor: "#3B6D11", color: "#fff", border: "none", borderRadius: "9px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
                        ✓ Approve
                      </button>
                      <button onClick={() => { handleRejectRecruiter(recruiter.id); setTimeout(() => fetchPendingRecruiters(), 800); }}
                        style={{ padding: "8px 20px", backgroundColor: "#fff", color: "#dc2626", border: "1.5px solid #dc2626", borderRadius: "9px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "recruiters" && (
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            padding: "2rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem", color: "#1f2937" }}>
              Approved Recruiters ({approvedRecruiters.length})
            </h2>
            {approvedRecruiters.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "2rem",
                backgroundColor: "#f8fafc",
                borderRadius: "0.5rem",
                color: "#475569",
                border: "1px dashed #e5e7eb"
              }}>
                <p style={{ margin: 0, fontSize: "1rem" }}>No approved recruiters found yet.</p>
                <p style={{ margin: "0.5rem 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>Approve recruiters from the pending recruiter list first.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb", backgroundColor: "#f3f4f6" }}>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700" }}>Name</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700" }}>Email</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700" }}>Phone</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700" }}>Company</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700" }}>Approved At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedRecruiters.map((recruiter, index) => (
                      <tr key={recruiter.id} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "1rem", color: "#1f2937", fontWeight: "600" }}>{recruiter.name || "—"}</td>
                        <td style={{ padding: "1rem", color: "#6b7280" }}>{recruiter.email || "—"}</td>
                        <td style={{ padding: "1rem", color: "#6b7280" }}>{recruiter.phone || "—"}</td>
                        <td style={{ padding: "1rem", color: "#6b7280" }}>{recruiter.company_name || recruiter.company || "—"}</td>
                        <td style={{ padding: "1rem", color: "#6b7280" }}>{recruiter.recruiter_approved_at ? new Date(recruiter.recruiter_approved_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* INCENTIVES TAB */}
        {activeTab === "incentives" && (
          <div>
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              padding: "2rem",
              marginBottom: "2rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
            }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem", color: "#1f2937" }}>
                Update Referrer Incentive
              </h2>
              <form onSubmit={handleUpdateIncentive} style={{ display: "grid", gap: "1rem", maxWidth: "400px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#475569" }}>
                    Select Referrer
                  </label>
                  <select
                    value={incentiveForm.referrerId}
                    onChange={(e) => setIncentiveForm({ ...incentiveForm, referrerId: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      color: "#0f172a",
                      backgroundColor: "#f9fafb"
                    }}
                  >
                    <option value="" style={{ backgroundColor: "#ffffff", color: "#0f172a" }}>Choose a referrer...</option>
                    {referrers.map(ref => (
                      <option key={ref.id} value={ref.id} style={{ backgroundColor: "#ffffff", color: "#0f172a" }}>
                        {ref.name} (₹{ref.incentive_value})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#475569" }}>
                    Incentive Value (₹)
                  </label>
                  <input
                    type="number"
                    value={incentiveForm.value}
                    onChange={(e) => setIncentiveForm({ ...incentiveForm, value: e.target.value })}
                    placeholder="500"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      color: "#0f172a",
                      backgroundColor: "#f9fafb"
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    backgroundColor: "#f97316",
                    color: "#fff",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "600",
                    transition: "all 0.3s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#ea580c"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f97316"}
                >
                  Update Incentive
                </button>
              </form>
            </div>

            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              padding: "2rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
            }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem", color: "#1f2937" }}>
                All Referrers & Incentives
              </h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700" }}>Name</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700" }}>Email</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700" }}>Company</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700" }}>Incentive</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrers.map(referrer => (
                      editingReferrerId === referrer.id ? (
                        <tr key={referrer.id} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: "#f8fafc" }}>
                          <td style={{ padding: "1rem", color: "#0f172a" }}>{referrer.name}</td>
                          <td style={{ padding: "1rem", color: "#0f172a" }}>{referrer.email}</td>
                          <td style={{ padding: "1rem", color: "#0f172a" }}>{referrer.company || "-"}</td>
                          <td style={{ padding: "1rem" }}>
                            <input
                              type="number"
                              value={editingIncentiveValue}
                              onChange={(e) => setEditingIncentiveValue(e.target.value)}
                              placeholder={referrer.incentive_value.toString()}
                              style={{
                                padding: "0.5rem",
                                border: "1px solid #d1d5db",
                                borderRadius: "0.375rem",
                                fontSize: "0.875rem",
                                width: "100px",
                                color: "#0f172a",
                                backgroundColor: "#ffffff"
                              }}
                            />
                          </td>
                          <td style={{ padding: "1rem", display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => handleQuickEditIncentive(referrer.id)}
                              style={{
                                backgroundColor: "#10b981",
                                color: "#fff",
                                border: "none",
                                padding: "0.375rem 0.75rem",
                                borderRadius: "0.375rem",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: "600"
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingReferrerId(null)}
                              style={{
                                backgroundColor: "#6b7280",
                                color: "#fff",
                                border: "none",
                                padding: "0.375rem 0.75rem",
                                borderRadius: "0.375rem",
                                cursor: "pointer",
                                fontSize: "0.75rem"
                              }}
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={referrer.id} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
                          <td style={{ padding: "1rem", color: "#0f172a" }}>{referrer.name}</td>
                          <td style={{ padding: "1rem", color: "#0f172a" }}>{referrer.email}</td>
                          <td style={{ padding: "1rem", color: "#0f172a" }}>{referrer.company || "-"}</td>
                          <td style={{
                            padding: "1rem",
                            backgroundColor: "#f0fdf4",
                            fontWeight: "600",
                            color: "#10b981"
                          }}>
                            ₹{referrer.incentive_value}
                          </td>
                          <td style={{ padding: "1rem", display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => {
                                setEditingReferrerId(referrer.id);
                                setEditingIncentiveValue(referrer.incentive_value.toString());
                              }}
                              style={{
                                backgroundColor: "#3b82f6",
                                color: "#fff",
                                border: "none",
                                padding: "0.375rem 0.75rem",
                                borderRadius: "0.375rem",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: "600"
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleRevokeIncentive(referrer.id)}
                              style={{
                                backgroundColor: "#dc2626",
                                color: "#fff",
                                border: "none",
                                padding: "0.375rem 0.75rem",
                                borderRadius: "0.375rem",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: "600"
                              }}
                            >
                              Revoke
                            </button>
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

        {/* BULK JOBS TAB */}
        {activeTab === "bulk-jobs" && (
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            padding: "2rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", color: "#1f2937" }}>
              Bulk Upload Jobs
            </h2>
            <p style={{ color: "#475569", marginBottom: "1.5rem" }}>
              Upload a CSV file with job listings. Download the template <a href="/Job_Upload.csv" download style={{ color: "#f97316", textDecoration: "underline" }}>here</a>.
            </p>
            <div style={{
              border: "2px dashed #e5e7eb",
              borderRadius: "0.75rem",
              padding: "2rem",
              textAlign: "center",
              backgroundColor: "#f8fafc"
            }}>
              <Upload style={{ width: "3rem", height: "3rem", color: "#f97316", margin: "0 auto 1rem" }} />
              <p style={{ color: "#475569", marginBottom: "0.5rem", fontWeight: "600" }}>Drag and drop your CSV file here or click to browse</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkUploadJobs}
                disabled={uploadingJobs}
                style={{
                  display: "block",
                  margin: "0 auto",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                  cursor: uploadingJobs ? "not-allowed" : "pointer"
                }}
              />
              {uploadingJobs && <p style={{ color: "#f97316", marginTop: "1rem" }}>Uploading...</p>}
            </div>
          </div>
        )}

        {/* BULK CANDIDATES TAB */}
        {activeTab === "bulk-candidates" && (
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            padding: "2rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#1f2937", margin: 0 }}>
                Bulk Upload Candidates
              </h2>
              <button
                onClick={() => window.location.href = "/admin/bulk-candidates"}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#f97316",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.75rem",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  transition: "background-color 0.2s",
                  boxShadow: "0 8px 20px rgba(249,115,22,0.15)"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#ea580c"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f97316"}
              >
                View Bulk Candidates
              </button>
            </div>
            <p style={{ color: "#475569", marginBottom: "1.5rem" }}>
              Upload a CSV file with candidate information. Download the template <a href="/Candidate_Upload.csv" download style={{ color: "#f97316", textDecoration: "underline" }}>here</a>.
            </p>
            <div style={{
              border: "2px dashed #e5e7eb",
              borderRadius: "0.75rem",
              padding: "2rem",
              textAlign: "center",
              backgroundColor: "#f8fafc"
            }}>
              <Upload style={{ width: "3rem", height: "3rem", color: "#10b981", margin: "0 auto 1rem" }} />
              <p style={{ color: "#475569", marginBottom: "0.5rem", fontWeight: "600" }}>Drag and drop your CSV file here or click to browse</p>
              <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: "1rem" }}>Supported format: CSV with columns like name, email, phone, skills, experience</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkUploadCandidates}
                disabled={uploadingCandidates}
                style={{
                  display: "block",
                  margin: "0 auto",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                  cursor: uploadingCandidates ? "not-allowed" : "pointer"
                }}
              />
              {uploadingCandidates && <p style={{ color: "#10b981", marginTop: "1rem" }}>Uploading...</p>}
            </div>
          </div>
        )}

        {/* JOBS LIST TAB */}
        {activeTab === "jobs-list" && (
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            padding: "2rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#1f2937", margin: 0 }}>
                All Created Jobs ({jobs.length})
              </h2>
              {selectedJobs.size > 0 && (
                <button
                  onClick={handleDeleteSelectedJobs}
                  style={{
                    backgroundColor: "#f97316",
                    color: "#fff",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.3s",
                    boxShadow: "0 4px 14px rgba(249,115,22,0.18)"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#ea580c"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f97316"}
                >
                  <Trash2 size={16} />
                  Delete ({selectedJobs.size})
                </button>
              )}
            </div>

            {jobs.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb", backgroundColor: "#f3f4f6" }}>
                      <th style={{ textAlign: "center", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem", width: "50px" }}>
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          style={{ cursor: "pointer", width: "18px", height: "18px" }}
                        />
                      </th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Job Title</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Department</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Location</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Job Type</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Experience</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Salary Range</th>
                      <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job, index) => (
                      <tr 
                        key={job.id} 
                        onClick={() => window.location.href = `/admin/jobs/${job.id}`}
                        style={{ 
                          borderBottom: "1px solid #e5e7eb", 
                          backgroundColor: selectedJobs.has(job.id) ? "#eff6ff" : (index % 2 === 0 ? "#ffffff" : "#f9fafb"),
                          cursor: "pointer",
                          transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = selectedJobs.has(job.id) ? "#eff6ff" : "#f3f4f6"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedJobs.has(job.id) ? "#eff6ff" : (index % 2 === 0 ? "#ffffff" : "#f9fafb")}
                      >
                        <td 
                          style={{ padding: "1rem", textAlign: "center" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedJobs.has(job.id)}
                            onChange={() => handleSelectJob(job.id)}
                            style={{ cursor: "pointer", width: "18px", height: "18px" }}
                          />
                        </td>
                        <td style={{ padding: "1rem", color: "#1f2937", fontWeight: "600" }}>{job.job_title}</td>
                        <td style={{ padding: "1rem", color: "#6b7280" }}>{job.department}</td>
                        <td style={{ padding: "1rem", color: "#6b7280" }}>{job.location}</td>
                        <td style={{ padding: "1rem", color: "#6b7280" }}>{job.job_type}</td>
                        <td style={{ padding: "1rem", color: "#6b7280" }}>{job.experience_required || "-"}</td>
                        <td style={{ padding: "1rem", color: "#6b7280" }}>{job.salary_range || "-"}</td>
                        <td style={{ padding: "1rem" }} onClick={(e) => e.stopPropagation()}>
                          <select
                            value={job.status || "active"}
                            onChange={(e) => handleJobStatusChange(job.id, e.target.value)}
                            style={{
                              width: "100%",
                              padding: "0.5rem 0.625rem",
                              borderRadius: "0.375rem",
                              border: "1px solid #d1d5db",
                              fontSize: "0.9rem",
                              color: "#111827",
                              backgroundColor: "#f9fafb",
                              cursor: "pointer"
                            }}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "2rem",
                backgroundColor: "#f8fafc",
                borderRadius: "0.5rem",
                color: "#475569",
                border: "1px dashed #e5e7eb"
              }}>
                <p style={{ fontSize: "1rem", margin: 0 }}>No jobs created yet</p>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: "0.5rem 0 0 0" }}>Create or upload jobs to see them here</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "overview" && dashboardData && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
            marginBottom: "3rem"
          }}>
            {[
              { label: "Total Candidates", value: dashboardData.totalCandidates, color: "#3b82f6" },
              { label: "Total Referrers", value: dashboardData.totalReferrers, color: "#10b981" },
              { label: "Recruiters (Approved)", value: dashboardData.approvedRecruiters, color: "#8b5cf6" },
              { label: "Total Referrals", value: dashboardData.totalReferrals, color: "#f59e0b" }
            ].map((stat, idx) => (
              <div key={idx} style={{
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                padding: "1.5rem",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                transition: "all 0.3s"
              }}>
                <div style={{
                  backgroundColor: stat.color + "20",
                  padding: "1rem",
                  borderRadius: "0.5rem"
                }}>
                  <div style={{ width: "2rem", height: "2rem", backgroundColor: stat.color, borderRadius: "0.25rem" }} />
                </div>
                <div>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.25rem", margin: 0 }}>{stat.label}</p>
                  <p style={{ fontSize: "1.75rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "jobs" && (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "0.75rem",
            padding: "2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem", color: "#000" }}>Post New Job</h2>
            <button
              onClick={() => window.location.href = "/admin/post-job"}
              style={{
                backgroundColor: "#f97316",
                color: "#fff",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                cursor: "pointer",
                fontWeight: "700",
                boxShadow: "0 8px 20px rgba(249,115,22,0.15)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#ea580c"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f97316"}
            >
              Create New Job Posting
            </button>
          </div>
        )}

        {/* CANDIDATE STATUS MANAGEMENT TAB */}
        {activeTab === "manage-status" && (
          <div>
            {/* STATUS STATISTICS */}
            {candidateStatusStats && (
              <div style={{
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                padding: "2rem",
                marginBottom: "2rem",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
              }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1.5rem", color: "#1f2937" }}>
                  Candidate Distribution by Status
                </h3>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "1rem"
                }}>
                  <div style={{
                    padding: "1rem",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "0.5rem",
                    textAlign: "center"
                  }}>
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "0.5rem", margin: "0 0 0.5rem 0" }}>Total Candidates</p>
                    <p style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1f2937", margin: 0 }}>{candidateStatusStats.total}</p>
                  </div>
                  {candidateStatusStats.byStatus && candidateStatusStats.byStatus.map((stat, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setFilterStatus(stat.candidate_status)}
                      style={{
                        padding: "1rem",
                        backgroundColor: filterStatus === stat.candidate_status ? "#dbeafe" : "#f9fafb",
                        borderRadius: "0.5rem",
                        textAlign: "center",
                        border: filterStatus === stat.candidate_status ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#dbeafe"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = filterStatus === stat.candidate_status ? "#dbeafe" : "#f9fafb"}
                    >
                      <p style={{ color: "#6b7280", fontSize: "0.8rem", marginBottom: "0.25rem", margin: "0 0 0.5rem 0" }}>{stat.candidate_status}</p>
                      <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1f2937", margin: 0 }}>{stat.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CANDIDATES LIST WITH STATUS SELECTOR */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              padding: "2rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#1f2937", margin: 0 }}>
                  All Candidates ({filterStatus === "all" ? bulkCandidates.length : bulkCandidates.filter(c => c.candidate_status === filterStatus).length})
                </h3>
                <button
                  onClick={() => setFilterStatus("all")}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: filterStatus === "all" ? "#3b82f6" : "#e5e7eb",
                    color: filterStatus === "all" ? "#fff" : "#374151",
                    border: "none",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    if (filterStatus !== "all") e.currentTarget.style.backgroundColor = "#d1d5db";
                  }}
                  onMouseLeave={(e) => {
                    if (filterStatus !== "all") e.currentTarget.style.backgroundColor = "#e5e7eb";
                  }}
                >
                  Show All
                </button>
              </div>

              {bulkCandidates.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "3rem 2rem",
                  backgroundColor: "#f8fafc",
                  borderRadius: "0.5rem",
                  color: "#475569",
                  border: "1px dashed #e5e7eb"
                }}>
                  <p style={{ fontSize: "1rem", margin: 0 }}>No candidates found</p>
                  <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: "0.5rem 0 0 0" }}>Upload candidates first using bulk upload</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb", backgroundColor: "#f3f4f6" }}>
                        <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Name</th>
                        <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Email</th>
                        <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Contact</th>
                        <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Current Status</th>
                        <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Update Status</th>
                        <th style={{ textAlign: "left", padding: "1rem", color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Updated At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(filterStatus === "all" ? bulkCandidates : bulkCandidates.filter(c => c.candidate_status === filterStatus)).map((candidate, idx) => (
                        <tr 
                          key={candidate.id} 
                          style={{ 
                            borderBottom: "1px solid #e5e7eb", 
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb"
                          }}
                        >
                          <td style={{ padding: "1rem", color: "#1f2937", fontWeight: "600" }}>{candidate.name}</td>
                          <td style={{ padding: "1rem", color: "#6b7280", fontSize: "0.9rem" }}>{candidate.email}</td>
                          <td style={{ padding: "1rem", color: "#6b7280" }}>{candidate.contact || "-"}</td>
                          <td style={{ padding: "1rem" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "0.375rem 0.75rem",
                              borderRadius: "0.375rem",
                              fontSize: "0.8rem",
                              fontWeight: "600",
                              backgroundColor: "#dbeafe",
                              color: "#1e40af"
                            }}>
                              {candidate.candidate_status || "Contacted"}
                            </span>
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <select
                              value={candidate.candidate_status || "Contacted"}
                              onChange={(e) => handleUpdateCandidateStatus(candidate.id, e.target.value)}
                              disabled={updatingStatus === candidate.id}
                              style={{
                                padding: "0.5rem",
                                border: "1px solid #d1d5db",
                                borderRadius: "0.375rem",
                                fontSize: "0.875rem",
                                backgroundColor: "#ffffff",
                                color: "#0f172a",
                                cursor: updatingStatus === candidate.id ? "not-allowed" : "pointer",
                                opacity: updatingStatus === candidate.id ? 0.5 : 1,
                                transition: "all 0.2s"
                              }}
                            >
                              <option value="Contacted">Contacted</option>
                              <option value="Interested">Interested</option>
                              <option value="Not Interested">Not Interested</option>
                              <option value="No Response">No Response</option>
                              <option value="Follow-up Required">Follow-up Required</option>
                              <option value="In Review">In Review</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Interview Scheduled">Interview Scheduled</option>
                              <option value="Interview Cleared">Interview Cleared</option>
                              <option value="Offered">Offered</option>
                              <option value="Hired">Hired</option>
                              <option value="Rejected">Rejected</option>
                              <option value="On Hold">On Hold</option>
                            </select>
                          </td>
                          <td style={{ padding: "1rem", color: "#6b7280", fontSize: "0.8rem" }}>
                            {candidate.status_updated_at 
                              ? new Date(candidate.status_updated_at).toLocaleDateString()
                              : "-"}
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
      </div>
    </div>
  );
}
