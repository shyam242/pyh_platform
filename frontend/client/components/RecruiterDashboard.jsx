"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Check, Pause, XCircle, Users, TrendingUp, CheckCircle2, Eye, Clock } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

export default function RecruiterDashboard() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [bulkCandidates, setBulkCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    shortlisted: 0,
    onHold: 0,
    rejected: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [referredFilter, setReferredFilter] = useState("all");

  useEffect(() => {
    fetchApprovalStatus();
    fetchData();
    fetchBulkCandidates();
  }, []);

  const fetchApprovalStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/recruiter/approval-status", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setIsApproved(data.is_recruiter_approved);
    } catch (err) {
      console.error("Failed to fetch approval status:", err);
      setIsApproved(false);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/recruiter/all", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      // Handle API response - ensure we have an array
      const candidatesArray = Array.isArray(result) ? result : (result.data || []);

      setData(candidatesArray);
      setLoading(false);
    } catch (err) {
      showError("Failed to fetch candidates");
      setData([]);
      setLoading(false);
    }
  };

  const fetchBulkCandidates = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/admin/bulk-candidates", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      const candidatesArray = Array.isArray(result) ? result : (result.data || []);
      setBulkCandidates(candidatesArray);
    } catch (err) {
      console.error("Failed to fetch bulk candidates:", err);
      setBulkCandidates([]);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/recruiter/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) throw new Error("Update failed");

      showSuccess(`Status updated to ${status}`);
      fetchData();
    } catch (err) {
      showError(err.message);
    }
  };

  const downloadCV = async (referralId, candidateName) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/recruiter/${referralId}/cv/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("Failed to download CV");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${candidateName}-resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showSuccess("CV downloaded successfully!");
    } catch (err) {
      showError(err.message || "Failed to download CV");
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div
      style={{
        padding: "1.5rem",
        backgroundColor: "#ffffff",
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        transition: "all 0.3s"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: "3rem",
        height: "3rem",
        borderRadius: "0.5rem",
        backgroundColor: color + "15",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <Icon style={{ width: "1.5rem", height: "1.5rem", color: color }} />
      </div>
      <div>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem", margin: 0 }}>{label}</p>
        <p style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1f2937", margin: 0 }}>{value}</p>
      </div>
    </div>
  );

  const matchesFilter = (candidate) => {
    const search = searchTerm.trim().toLowerCase();
    const referredStatus = candidate.referrer_name ? "referred" : "not referred";
    const candidateStatus = candidate.status || "";

    if (statusFilter !== "all" && candidateStatus !== statusFilter) {
      return false;
    }

    if (referredFilter === "referred" && !candidate.referrer_name) {
      return false;
    }
    if (referredFilter === "not_referred" && candidate.referrer_name) {
      return false;
    }

    if (!search) {
      return true;
    }

    const values = [
      candidate.name,
      candidate.email,
      candidate.skills,
      candidate.company,
      candidate.status,
      referredStatus,
      candidate.referrer_name,
      candidate.referrer_company,
      candidate.referrer_experience?.toString(),
      candidate.experience?.toString()
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return values.includes(search);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setReferredFilter("all");
  };

  const combinedCandidates = [
    ...data.map(candidate => ({ ...candidate, is_bulk: false })),
    ...bulkCandidates.map(candidate => ({ ...candidate, is_bulk: true }))
  ];

  const combinedStats = {
    total: combinedCandidates.length,
    shortlisted: combinedCandidates.filter(c => c.status === "shortlist").length,
    onHold: combinedCandidates.filter(c => c.status === "hold").length,
    rejected: combinedCandidates.filter(c => c.status === "reject").length
  };

  const filteredData = combinedCandidates.filter(matchesFilter);

  const CandidateCard = ({ candidate }) => (
    <div
      onClick={() => router.push(candidate.is_bulk ? `/bulk-candidates/${candidate.id}` : `/candidate-details/${candidate.id}`)}
      style={{
        padding: "1.25rem",
        backgroundColor: "#f9f9f9",
        borderRadius: "0.75rem",
        border: "1px solid #ddd",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        cursor: "pointer",
        transition: "all 0.3s",
        boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
        marginBottom: "1rem"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.12)";
        e.currentTarget.style.transform = "translateX(4px)";
        e.currentTarget.style.borderColor = "#1e88e5";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "translateX(0)";
        e.currentTarget.style.borderColor = "#ddd";
      }}
    >
      {/* Candidate Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "#1e88e5", margin: 0 }}>
            {candidate.name}
          </h3>
        </div>
        <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>
          {candidate.email}
        </p>

        {/* Skills */}
        {candidate.skills && (
          <div style={{ marginBottom: "0.5rem" }}>
            <p style={{ fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>Skills:</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {candidate.skills.split(",").slice(0, 3).map((skill, idx) => (
                <span key={idx} style={{
                  fontSize: "0.75rem",
                  backgroundColor: "#e3f2fd",
                  color: "#1e88e5",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "0.25rem",
                  whiteSpace: "nowrap"
                }}>
                  {skill.trim()}
                </span>
              ))}
              {candidate.skills.split(",").length > 3 && (
                <span style={{ fontSize: "0.75rem", color: "#666" }}>
                  +{candidate.skills.split(",").length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Referrer Info */}
        {candidate.referrer_name && (
          <div style={{
            fontSize: "0.8rem",
            color: "#666",
            marginTop: "0.5rem",
            padding: "0.5rem",
            backgroundColor: "#f0f0f0",
            borderRadius: "0.375rem"
          }}>
            <span style={{ fontWeight: "600" }}>Referred by: </span>
            {candidate.referrer_name}
            {candidate.referrer_company && ` (${candidate.referrer_company})`}
            {candidate.referrer_experience && ` • ${candidate.referrer_experience} yrs exp`}
          </div>
        )}
      </div>

      {/* Status badge + actions */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", flexShrink: 0 }}>
        {candidate.status ? (
          <span style={{
            fontSize: "0.75rem",
            fontWeight: "600",
            padding: "0.5rem 0.75rem",
            borderRadius: "9999px",
            backgroundColor:
              candidate.status === "shortlist" ? "#dcfce7" :
              candidate.status === "hold" ? "#fef3c7" :
              candidate.status === "reject" ? "#fee2e2" : "#f3f4f6",
            color:
              candidate.status === "shortlist" ? "#166534" :
              candidate.status === "hold" ? "#92400e" :
              candidate.status === "reject" ? "#991b1b" : "#374151",
            whiteSpace: "nowrap"
          }}>
            {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
          </span>
        ) : null}

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); updateStatus(candidate.id, "shortlist"); }}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "0.65rem",
              border: "1px solid #3b82f6",
              backgroundColor: candidate.status === "shortlist" ? "#eff6ff" : "#fff",
              color: "#1d4ed8",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 600
            }}
          >Shortlist</button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); updateStatus(candidate.id, "hold"); }}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "0.65rem",
              border: "1px solid #f59e0b",
              backgroundColor: candidate.status === "hold" ? "#fffbeb" : "#fff",
              color: "#b45309",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 600
            }}
          >Hold</button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); updateStatus(candidate.id, "reject"); }}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "0.65rem",
              border: "1px solid #dc2626",
              backgroundColor: candidate.status === "reject" ? "#fee2e2" : "#fff",
              color: "#991b1b",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 600
            }}
          >Reject</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", color: "#1f2937" }}>
      {/* NAVBAR */}
      <nav style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        padding: "1.5rem 0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0, color: "#1f2937" }}>
            Recruiter Dashboard
          </h1>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/signin";
            }}
            style={{
              backgroundColor: "#dc2626",
              color: "#fff",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: "600",
              transition: "all 0.3s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#b91c1c";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#dc2626";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 1.5rem" }}>

        {/* APPROVAL PENDING MESSAGE */}
        {isApproved === false && (
          <div style={{
            backgroundColor: "#fef3c7",
            borderLeft: "4px solid #f59e0b",
            padding: "1.5rem",
            borderRadius: "0.75rem",
            marginBottom: "2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#92400e", marginBottom: "0.5rem", margin: 0 }}>
              Awaiting Admin Approval
            </h3>
            <p style={{ color: "#78350f", fontSize: "0.95rem", margin: 0 }}>
              Your recruiter profile is pending admin approval. You'll have full access to the dashboard once approved. We'll send you an email confirmation.
            </p>
          </div>
        )}

        {/* HEADER */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: "700", color: "#1f2937", margin: "0 0 0.5rem 0" }}>
            Candidates
          </h2>
          <p style={{ fontSize: "1rem", color: "#6b7280", lineHeight: "1.6", margin: 0 }}>
            Review and manage candidate applications efficiently
          </p>
        </div>

        {/* CANDIDATES SECTION */}
        <>
            {/* STATS GRID */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem"
            }}>
              <StatCard icon={Users} label="Total Candidates" value={combinedStats.total} color="#3b82f6" />
              <StatCard icon={CheckCircle2} label="Shortlisted" value={combinedStats.shortlisted} color="#10b981" />
              <StatCard icon={Pause} label="On Hold" value={combinedStats.onHold} color="#f59e0b" />
              <StatCard icon={XCircle} label="Rejected" value={combinedStats.rejected} color="#dc2626" />
            </div>

            {/* FILTERS */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr minmax(180px, 220px) minmax(180px, 220px) minmax(180px, 200px)",
              gap: "1rem",
              marginBottom: "1.5rem"
            }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "#374151", fontWeight: "600", fontSize: "0.9rem" }}>
                  Search candidates
                </label>
                <input
                  type="search"
                  placeholder="Search by name, skills, experience, or referrer"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.9rem 1rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.75rem",
                    fontSize: "0.95rem",
                    color: "#111827",
                    backgroundColor: "#ffffff"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "#374151", fontWeight: "600", fontSize: "0.9rem" }}>
                  Status filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.9rem 1rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.75rem",
                    fontSize: "0.95rem",
                    color: "#111827",
                    backgroundColor: "#ffffff"
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="shortlist">Shortlisted</option>
                  <option value="hold">On hold</option>
                  <option value="reject">Rejected</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "#374151", fontWeight: "600", fontSize: "0.9rem" }}>
                  Referred filter
                </label>
                <select
                  value={referredFilter}
                  onChange={(e) => setReferredFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.9rem 1rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.75rem",
                    fontSize: "0.95rem",
                    color: "#111827",
                    backgroundColor: "#ffffff"
                  }}
                >
                  <option value="all">All candidates</option>
                  <option value="referred">Referred only</option>
                  <option value="not_referred">Not referred</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                {(searchTerm || statusFilter !== "all" || referredFilter !== "all") && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    style={{
                      width: "100%",
                      padding: "0.95rem 1rem",
                      backgroundColor: "#1f2937",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0.75rem",
                      cursor: "pointer",
                      fontWeight: "600",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#111827"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#1f2937"}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* CANDIDATES LIST */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "3rem", fontSize: "1.1rem", color: "#6b7280" }}>
                Loading candidates...
              </div>
            ) : combinedCandidates.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "3rem",
                backgroundColor: "#f9fafb",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb"
              }}>
                <Users style={{ width: "3rem", height: "3rem", margin: "0 auto 1rem", color: "#9ca3af" }} />
                <p style={{ fontSize: "1.1rem", color: "#6b7280" }}>No candidates yet</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "3rem",
                backgroundColor: "#f9fafb",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb"
              }}>
                <p style={{ fontSize: "1.1rem", color: "#6b7280", marginBottom: "0.5rem" }}>No candidates match your filter.</p>
                <p style={{ fontSize: "0.95rem", color: "#9ca3af" }}>Try a broader search or clear the filters.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {filteredData.map(candidate => (
                  <CandidateCard key={candidate.id} candidate={candidate} />
                ))}
              </div>
            )}
          </>

      </div>
    </div>
  );
}