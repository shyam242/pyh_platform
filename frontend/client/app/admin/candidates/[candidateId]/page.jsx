"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Download, Mail, Phone, MapPin, Briefcase, DollarSign, Clock, BookOpen, Award, ExternalLink } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import axios from "axios";

export default function AdminCandidateDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = params?.candidateId;

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (candidateId) {
      fetchCandidateDetails();
    }
  }, [candidateId]);

  const fetchCandidateDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/admin/candidates/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCandidate(response.data.candidate);
    } catch (error) {
      showError("Failed to load candidate details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadResume = async () => {
    try {
      setDownloading(true);
      
      if (!candidate?.resume_file_path && !candidate?.resume_url && !candidate?.resume) {
        showError("No resume available for this candidate");
        return;
      }

      const resumePath = candidate?.resume_file_path || candidate?.resume_url || candidate?.resume;
      
      const link = document.createElement("a");
      link.href = `http://localhost:5000${resumePath}`;
      link.setAttribute("download", `${candidate.name}_resume.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess("Resume downloaded successfully");
    } catch (error) {
      showError("Failed to download resume");
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!confirm("Are you sure you want to delete this candidate profile? This action is permanent.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/admin/candidates/${candidateId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess("Candidate profile deleted successfully");
      router.push("/admin");
    } catch (error) {
      showError(error.response?.data?.message || "Failed to delete candidate");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <p>Loading candidate details...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 1rem", fontSize: "1.2rem", fontWeight: "600" }}>Candidate not found</p>
          <button onClick={() => router.back()} style={{ padding: "0.5rem 1rem", backgroundColor: "#ff9d4d", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const parseSkills = (value) => {
    if (!value) return [];
    try {
      return typeof value === "string" ? value.split(",").map(s => s.trim()).filter(Boolean) : Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const generalSkills = parseSkills(candidate.skills);
  const technicalSkills = parseSkills(candidate.technical_skills);
  const softSkills = parseSkills(candidate.soft_skills);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <div style={{ backgroundColor: "white", padding: "1.5rem 2rem", display: "flex", alignItems: "center", gap: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderBottom: "1px solid #e2e8f0" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.5rem", color: "#ff9d4d" }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Candidate Details</h1>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem" }}>
          {/* Left Column */}
          <div>
            {/* Profile Card */}
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "2px solid #f1f5f9" }}>
                {candidate.image ? (
                  <img src={candidate.image} alt={candidate.name} style={{ width: "100px", height: "100px", borderRadius: "0.5rem", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100px", height: "100px", borderRadius: "0.5rem", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", fontWeight: "700", color: "#64748b" }}>
                    {candidate.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>{candidate.name}</h2>
                  <p style={{ margin: "0 0 1rem", color: "#64748b", fontSize: "0.95rem" }}>
                    {candidate.email} {candidate.phone ? ` • ${candidate.phone}` : ""}
                  </p>
                  <span style={{ display: "inline-block", padding: "0.4rem 0.8rem", backgroundColor: candidate.verified ? "#dcfce7" : "#fef3c7", color: candidate.verified ? "#166534" : "#92400e", borderRadius: "0.25rem", fontSize: "0.85rem", fontWeight: "600" }}>
                    {candidate.verified ? "✓ Verified" : "⏳ Pending Verification"}
                  </span>
                </div>
              </div>

              {/* Personal Info Section */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Personal Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <Mail size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                    <div>
                      <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Email</p>
                      <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.email || "Not provided"}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <Phone size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                    <div>
                      <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Contact Number</p>
                      <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.contact || candidate.phone || "Not provided"}</p>
                    </div>
                  </div>
                  {candidate.current_location && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                      <MapPin size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                      <div>
                        <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Current Location</p>
                        <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.current_location}</p>
                      </div>
                    </div>
                  )}
                  {candidate.preferred_location && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                      <MapPin size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                      <div>
                        <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Preferred Location</p>
                        <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.preferred_location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Info */}
              {(candidate.current_company_name || candidate.job_role || candidate.experience || candidate.cctc || candidate.ectc || candidate.notice_period || candidate.offer_in_hand) && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Professional Information</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    {candidate.job_role && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <Briefcase size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Job Role</p>
                          <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.job_role || "Not provided"}</p>
                        </div>
                      </div>
                    )}
                    {candidate.current_company_name && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <Briefcase size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Current Company</p>
                          <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.current_company_name}</p>
                        </div>
                      </div>
                    )}
                    {candidate.experience && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <Clock size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Experience</p>
                          <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.experience}</p>
                        </div>
                      </div>
                    )}
                    {(candidate.cctc || candidate.current_ctc) && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <DollarSign size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Current CTC (LPA)</p>
                          <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.cctc || candidate.current_ctc || "Not provided"}</p>
                        </div>
                      </div>
                    )}
                    {(candidate.ectc || candidate.expected_ctc) && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <DollarSign size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Expected CTC (LPA)</p>
                          <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.ectc || candidate.expected_ctc}</p>
                        </div>
                      </div>
                    )}
                    {candidate.notice_period && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <Clock size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Notice Period</p>
                          <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.notice_period}</p>
                        </div>
                      </div>
                    )}
                    {candidate.offer_in_hand && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <Award size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Offer in Hand</p>
                          <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.offer_in_hand}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Skills */}
              {(generalSkills.length > 0 || technicalSkills.length > 0 || softSkills.length > 0) && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Skills</h3>
                  {generalSkills.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <p style={{ margin: "0 0 0.75rem", color: "#64748b", fontSize: "0.9rem", fontWeight: "600" }}>General Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                        {generalSkills.map((skill, idx) => (
                          <span key={idx} style={{ display: "inline-block", padding: "0.5rem 1rem", backgroundColor: "#fef3e2", color: "#7c2d12", borderRadius: "0.375rem", fontSize: "0.9rem", fontWeight: "500" }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {technicalSkills.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <p style={{ margin: "0 0 0.75rem", color: "#64748b", fontSize: "0.9rem", fontWeight: "600" }}>Technical Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                        {technicalSkills.map((skill, idx) => (
                          <span key={idx} style={{ display: "inline-block", padding: "0.5rem 1rem", backgroundColor: "#eef2ff", color: "#4338ca", borderRadius: "0.375rem", fontSize: "0.9rem", fontWeight: "500" }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {softSkills.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 0.75rem", color: "#64748b", fontSize: "0.9rem", fontWeight: "600" }}>Soft Skills</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                        {softSkills.map((skill, idx) => (
                          <span key={idx} style={{ display: "inline-block", padding: "0.5rem 1rem", backgroundColor: "#ecfdf5", color: "#166534", borderRadius: "0.375rem", fontSize: "0.9rem", fontWeight: "500" }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Info */}
              {(candidate.address_aadhaar || candidate.reason_for_change || candidate.linkedin_profile) && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Additional Profile Details</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                    {candidate.address_aadhaar && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <MapPin size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Address (as per Aadhaar)</p>
                          <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.address_aadhaar}</p>
                        </div>
                      </div>
                    )}
                    {candidate.reason_for_change && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <Briefcase size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Reason for Change</p>
                          <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.reason_for_change}</p>
                        </div>
                      </div>
                    )}
                    {candidate.linkedin_profile && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <ExternalLink size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                        <div>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>LinkedIn Profile</p>
                          <a href={candidate.linkedin_profile} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontSize: "0.95rem", fontWeight: "600", textDecoration: "underline" }}>{candidate.linkedin_profile}</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Education */}
              {candidate.highest_qualification && (
                <div>
                  <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Education</h3>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <BookOpen size={18} style={{ color: "#ff9d4d", marginTop: "2px" }} />
                    <div>
                      <p style={{ margin: "0", fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>Highest Qualification</p>
                      <p style={{ margin: "0", fontSize: "0.95rem", color: "#0f172a", fontWeight: "600" }}>{candidate.highest_qualification}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Resume Card */}
            {(candidate.resume_file_path || candidate.resume_url || candidate.resume) && (
              <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", position: "sticky", top: "2rem" }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Resume</h3>
                <button
                  onClick={downloadResume}
                  disabled={downloading}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    backgroundColor: downloading ? "#fcc5a0" : "#ff9d4d",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    cursor: downloading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Download size={16} />
                  {downloading ? "Downloading..." : "Download Resume"}
                </button>
              </div>
            )}

            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", position: "sticky", top: "2rem" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>Admin Actions</h3>
              <button
                onClick={handleDeleteCandidate}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Delete Candidate Profile
              </button>
            </div>

            {/* Info Card */}
            <div style={{ backgroundColor: "#fef3e2", borderRadius: "1rem", padding: "1.5rem", border: "1px solid #fed7aa" }}>
              <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: "700", color: "#7c2d12" }}>Profile Status</h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#92400e", lineHeight: "1.5" }}>
                {candidate.verified ? "✓ This candidate's profile has been verified." : "⏳ This candidate is pending verification."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
