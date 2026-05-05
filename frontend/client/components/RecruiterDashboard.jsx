"use client";

import { useEffect, useState } from "react";
import { Download, Trash2, Check, Pause, XCircle, Users, TrendingUp, CheckCircle2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

export default function RecruiterDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    shortlisted: 0,
    onHold: 0,
    rejected: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/recruiter/all");
      const result = await res.json();
      setData(result);
      calculateStats(result);
      setLoading(false);
    } catch (err) {
      showError("Failed to fetch candidates");
      setLoading(false);
    }
  };

  const calculateStats = (candidates) => {
    setStats({
      total: candidates.length,
      shortlisted: candidates.filter(c => c.status === "shortlist").length,
      onHold: candidates.filter(c => c.status === "hold").length,
      rejected: candidates.filter(c => c.status === "reject").length
    });
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch("http://localhost:5000/api/recruiter/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`http://localhost:5000/api/recruiter/${referralId}/cv/download`);
      
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
    <div style={{
      padding: "1.5rem",
      backgroundColor: "#f9f9f9",
      borderRadius: "0.75rem",
      border: "1px solid #ddd",
      display: "flex",
      alignItems: "center",
      gap: "1rem"
    }}>
      <div style={{
        width: "3rem",
        height: "3rem",
        borderRadius: "0.5rem",
        backgroundColor: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <Icon style={{ width: "1.5rem", height: "1.5rem", color: "#fff" }} />
      </div>
      <div>
        <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.25rem" }}>{label}</p>
        <p style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#000" }}>{value}</p>
      </div>
    </div>
  );

  const CandidateCard = ({ candidate }) => (
    <div style={{
      padding: "1.5rem",
      backgroundColor: "#f9f9f9",
      borderRadius: "0.75rem",
      border: "1px solid #ddd",
      display: "flex",
      flexDirection: "column",
      gap: "1rem"
    }}>
      <div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#000", marginBottom: "0.25rem" }}>
          {candidate.name}
        </h3>
        <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
          {candidate.company} • {candidate.experience} years
        </p>
        <a 
          href={candidate.email} 
          style={{ fontSize: "0.875rem", color: "#0066cc", textDecoration: "none" }}
        >
          {candidate.email}
        </a>
      </div>

      <div style={{
        padding: "0.75rem",
        backgroundColor: "#fff",
        borderRadius: "0.5rem",
        display: "inline-block",
        width: "fit-content"
      }}>
        <span style={{
          fontSize: "0.75rem",
          fontWeight: "600",
          padding: "0.25rem 0.75rem",
          borderRadius: "9999px",
          backgroundColor: candidate.status === "shortlist" ? "#dcfce7" : candidate.status === "hold" ? "#fef3c7" : "#fee2e2",
          color: candidate.status === "shortlist" ? "#166534" : candidate.status === "hold" ? "#92400e" : "#991b1b"
        }}>
          {candidate.status ? candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1) : "Pending"}
        </span>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          onClick={() => updateStatus(candidate.id, "shortlist")}
          style={{
            flex: 1,
            minWidth: "80px",
            padding: "0.5rem",
            backgroundColor: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.3s"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#15803d"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#16a34a"}
        >
          <Check style={{ width: "1rem", height: "1rem" }} /> Accept
        </button>

        <button
          onClick={() => updateStatus(candidate.id, "hold")}
          style={{
            flex: 1,
            minWidth: "80px",
            padding: "0.5rem",
            backgroundColor: "#eab308",
            color: "#000",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.3s"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#d4a61b"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#eab308"}
        >
          <Pause style={{ width: "1rem", height: "1rem" }} /> Hold
        </button>

        <button
          onClick={() => updateStatus(candidate.id, "reject")}
          style={{
            flex: 1,
            minWidth: "80px",
            padding: "0.5rem",
            backgroundColor: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.3s"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#b91c1c"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#dc2626"}
        >
          <XCircle style={{ width: "1rem", height: "1rem" }} /> Reject
        </button>

        {candidate.cv_file && (
          <button
            onClick={() => downloadCV(candidate.id, candidate.name)}
            style={{
              flex: 1,
              minWidth: "80px",
              padding: "0.5rem",
              backgroundColor: "#f3f4f6",
              color: "#000",
              border: "1px solid #ddd",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#e5e7eb"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#f3f4f6"}
          >
            <Download style={{ width: "1rem", height: "1rem" }} /> CV
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#000", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* HEADER */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
            Recruiter Dashboard
          </h1>
          <p style={{ fontSize: "1rem", color: "#666", lineHeight: "1.6" }}>
            Review and manage candidate applications efficiently
          </p>
        </div>

        {/* STATS GRID */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem"
        }}>
          <StatCard icon={Users} label="Total Candidates" value={stats.total} color="#000" />
          <StatCard icon={CheckCircle2} label="Shortlisted" value={stats.shortlisted} color="#16a34a" />
          <StatCard icon={Pause} label="On Hold" value={stats.onHold} color="#eab308" />
          <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="#dc2626" />
        </div>

        {/* CANDIDATES GRID */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", fontSize: "1.1rem", color: "#666" }}>
            Loading candidates...
          </div>
        ) : data.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "3rem",
            backgroundColor: "#f9f9f9",
            borderRadius: "0.75rem",
            border: "1px solid #ddd"
          }}>
            <Users style={{ width: "3rem", height: "3rem", margin: "0 auto 1rem", color: "#999" }} />
            <p style={{ fontSize: "1.1rem", color: "#666" }}>No candidates yet</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem"
          }}>
            {data.map(candidate => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}