"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MapPin, Briefcase, DollarSign, Clock } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (jobId) fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}`);
      if (!response.ok) throw new Error("Failed to fetch job details");
      const data = await response.json();
      setJob(data);
    } catch (err) {
      showError(err.message || "Failed to load job details");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyJob = async () => {
    setApplying(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/signin");
        return;
      }

      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to apply for job");
      }

      showSuccess("Applied successfully! Check your dashboard for updates.");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      showError(err.message || "Failed to apply for job");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}><p>Loading job details...</p></div>;
  }

  if (!job) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}><p>Job not found</p></div>;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <div style={{ backgroundColor: "white", padding: "1.5rem 2rem", display: "flex", alignItems: "center", gap: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderBottom: "1px solid #e2e8f0" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.5rem", color: "#ff9d4d" }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Back to Jobs</h1>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1rem", display: "grid", gridTemplateColumns: "1fr 350px", gap: "2rem" }}>
        <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: "0 0 0.5rem", color: "#0f172a" }}>{job.job_title || "Untitled Position"}</h1>
            <p style={{ margin: "0", color: "#64748b", fontSize: "1.05rem", fontWeight: "500" }}>{job.department || "General Department"}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: "2px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <MapPin size={20} style={{ color: "#ff9d4d" }} />
              <div><p style={{ margin: "0", fontSize: "0.85rem", color: "#64748b", fontWeight: "500" }}>Location</p><p style={{ margin: "0.25rem 0 0", fontSize: "1rem", color: "#0f172a", fontWeight: "600" }}>{job.location || "Not specified"}</p></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Briefcase size={20} style={{ color: "#ff9d4d" }} />
              <div><p style={{ margin: "0", fontSize: "0.85rem", color: "#64748b", fontWeight: "500" }}>Job Type</p><p style={{ margin: "0.25rem 0 0", fontSize: "1rem", color: "#0f172a", fontWeight: "600" }}>{job.job_type || "Not specified"}</p></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <DollarSign size={20} style={{ color: "#ff9d4d" }} />
              <div><p style={{ margin: "0", fontSize: "0.85rem", color: "#64748b", fontWeight: "500" }}>Salary</p><p style={{ margin: "0.25rem 0 0", fontSize: "1rem", color: "#0f172a", fontWeight: "600" }}>{job.salary_range || "Not disclosed"}</p></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Clock size={20} style={{ color: "#ff9d4d" }} />
              <div><p style={{ margin: "0", fontSize: "0.85rem", color: "#64748b", fontWeight: "500" }}>Experience</p><p style={{ margin: "0.25rem 0 0", fontSize: "1rem", color: "#0f172a", fontWeight: "600" }}>{job.experience_required || "Not specified"}</p></div>
            </div>
          </div>

          {job.job_description && <div style={{ marginBottom: "2.5rem" }}><h2 style={{ fontSize: "1.35rem", fontWeight: "700", marginBottom: "1rem", color: "#0f172a" }}>Job Description</h2><p style={{ margin: 0, color: "#475569", lineHeight: "1.75", whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>{job.job_description}</p></div>}
          {job.responsibilities && <div style={{ marginBottom: "2.5rem" }}><h2 style={{ fontSize: "1.35rem", fontWeight: "700", marginBottom: "1rem", color: "#0f172a" }}>Responsibilities</h2>{typeof job.responsibilities === "string" ? <p style={{ margin: 0, color: "#475569", lineHeight: "1.75", whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>{job.responsibilities}</p> : <ul style={{ margin: 0, paddingLeft: "1.75rem", color: "#475569" }}>{job.responsibilities.map((r, i) => <li key={i} style={{ marginBottom: "0.75rem", fontSize: "0.95rem" }}>{r}</li>)}</ul>}</div>}
          {job.qualifications && <div style={{ marginBottom: "2.5rem" }}><h2 style={{ fontSize: "1.35rem", fontWeight: "700", marginBottom: "1rem", color: "#0f172a" }}>Required Qualifications</h2>{typeof job.qualifications === "string" ? <p style={{ margin: 0, color: "#475569", lineHeight: "1.75", whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>{job.qualifications}</p> : <ul style={{ margin: 0, paddingLeft: "1.75rem", color: "#475569" }}>{job.qualifications.map((q, i) => <li key={i} style={{ marginBottom: "0.75rem", fontSize: "0.95rem" }}>{q}</li>)}</ul>}</div>}
          {job.benefits && <div style={{ marginBottom: "2rem" }}><h2 style={{ fontSize: "1.35rem", fontWeight: "700", marginBottom: "1rem", color: "#0f172a" }}>Benefits</h2>{typeof job.benefits === "string" ? <p style={{ margin: 0, color: "#475569", lineHeight: "1.75", whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>{job.benefits}</p> : <ul style={{ margin: 0, paddingLeft: "1.75rem", color: "#475569" }}>{job.benefits.map((b, i) => <li key={i} style={{ marginBottom: "0.75rem", fontSize: "0.95rem" }}>{b}</li>)}</ul>}</div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", position: "sticky", top: "2rem" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Ready to Apply?</h3>
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", color: "#64748b", lineHeight: "1.5" }}>Click the button below to apply for this opportunity.</p>
            <button onClick={handleApplyJob} disabled={applying} style={{ width: "100%", padding: "0.875rem", backgroundColor: applying ? "#fcc5a0" : "#ff9d4d", color: "#fff", border: "none", borderRadius: "0.5rem", fontSize: "0.95rem", fontWeight: "600", cursor: applying ? "not-allowed" : "pointer" }}>
              {applying ? "Applying..." : "Apply Now"}
            </button>
          </div>

          <div style={{ backgroundColor: "#fef3e2", borderRadius: "1rem", padding: "1.5rem", border: "1px solid #fed7aa" }}>
            <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: "700", color: "#7c2d12" }}>Pro Tip</h4>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#92400e", lineHeight: "1.5" }}>Make sure your LinkedIn profile is up to date before applying.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
