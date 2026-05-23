"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, CheckCircle2, Plus, X } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

const AVAILABLE_SKILLS = ["React", "Node.js", "Python", "Java", "AWS", "UI/UX", "TypeScript", "MongoDB"];

export default function CandidateDashboard() {
  const [resume, setResume] = useState(null);
  const [skills, setSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [jobLoading, setJobLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/signin";
      return;
    }
    fetchDashboardData(token);
  }, []);

  const fetchDashboardData = async (token) => {
    await Promise.all([fetchJobs(token), fetchProfile(token)]);
  };

  const fetchJobs = async (token) => {
    setJobLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/jobs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      } else {
        console.warn("Failed to load jobs", res.status);
      }
    } catch (err) {
      console.error("Failed to load jobs", err);
    } finally {
      setJobLoading(false);
    }
  };

  const fetchProfile = async (token) => {
    try {
      const res = await fetch("http://localhost:5000/api/profile/user", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setImagePreview(data.image_url || null);
        if (Array.isArray(data.applied_jobs)) {
          setAppliedCount(data.applied_jobs.length);
        } else if (Array.isArray(data.applications)) {
          setAppliedCount(data.applications.length);
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  };

  const toggleSkill = (s) => {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const addSkill = () => {
    if (customSkill.trim() && !skills.includes(customSkill.trim())) {
      setSkills([...skills, customSkill.trim()]);
      setCustomSkill("");
    }
  };

  const removeSkill = (s) => {
    setSkills(skills.filter((x) => x !== s));
  };

  const handleImageSelect = (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showError("Profile picture must be smaller than 2MB");
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadProfileImage = async () => {
    if (!selectedImage) {
      showError("Select an image first");
      return;
    }
    setImageLoading(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("image", selectedImage);

      const res = await fetch("http://localhost:5000/api/profile/avatar", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload profile image");
      }

      const data = await res.json();
      setProfile(data.user);
      setImagePreview(data.user.image_url || null);
      setSelectedImage(null);
      showSuccess("Profile picture updated successfully");
    } catch (err) {
      showError(err.message || "Failed to upload profile image");
    } finally {
      setImageLoading(false);
    }
  };

  const getCardValue = (label) => {
    if (label === "Total Jobs") return jobs.length;
    if (label === "Applied") return appliedCount;
    if (label === "Profile Status") return profile?.verified ? "Verified" : "Pending";
    return "-";
  };

  const submit = async () => {
    if (!resume) return showError("Upload resume first");
    if (skills.length === 0) return showError("Select at least one skill");

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showError("Please sign in again.");
        window.location.href = "/signin";
        return;
      }
      const fd = new FormData();
      fd.append("resume", resume);
      fd.append("skills", JSON.stringify(skills));

      const res = await fetch("http://localhost:5000/api/profile/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });

      if (!res.ok) {
        const rawText = await res.text();
        let parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch (e) {
          parsed = null;
        }
        const bodyText = parsed?.message || parsed?.error || rawText;
        if (res.status === 404 || res.status === 405 || /Cannot POST/i.test(rawText) || /Cannot GET/i.test(rawText)) {
          throw new Error(
            `Backend route not found: POST http://localhost:5000/api/profile/verify. Confirm the server defines this endpoint and accepts POST requests.`
          );
        }
        throw new Error(bodyText || `Verification failed (status ${res.status})`);
      }

      showSuccess("Profile verified successfully!");
      setSubmitted(true);
      const tokenRef = localStorage.getItem("token");
      if (tokenRef) await fetchProfile(tokenRef);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      showError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleJobAction = (job) => {
    showSuccess(`Job card for ${job.job_title || job.title || "this role"} is visible here. Details and apply flow will be built next.`);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "700", margin: 0 }}>Candidate Dashboard</h1>
          <p style={{ color: "#475569", fontSize: "1rem", margin: 0 }}>
            Track your profile verification, view job opportunities, and keep your candidate profile visible to recruiters.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {["Total Jobs", "Applied", "Profile Status"].map((label) => (
            <div key={label} style={{ backgroundColor: "#1d4ed8", borderRadius: "1rem", padding: "1.5rem", color: "#fff", boxShadow: "0 12px 30px rgba(30,64,175,0.12)" }}>
              <p style={{ margin: 0, opacity: 0.85, fontSize: "0.95rem" }}>{label}</p>
              <p style={{ margin: "0.75rem 0 0", fontSize: "2.25rem", fontWeight: "700" }}>{getCardValue(label)}</p>
            </div>
          ))}
        </div>        <div style={{ backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid #e2e8f0", padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ width: "90px", height: "90px", borderRadius: "9999px", overflow: "hidden", backgroundColor: "#f3f4f6", border: "1px solid #e2e8f0" }}>
              <img
                src={imagePreview || "/user.svg"}
                alt="Candidate profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#0f172a", fontWeight: "700" }}>Profile Picture</p>
              <p style={{ margin: 0, color: "#475569", fontSize: "0.95rem" }}>
                Upload a profile image so recruiters and admins can recognize you when they view your candidate card.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1rem" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "0.75rem", cursor: "pointer", fontSize: "0.95rem", color: "#111827" }}>
              Choose Image
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => handleImageSelect(e.target.files?.[0])}
                style={{ display: "none" }}
              />
            </label>
            <button
              type="button"
              onClick={uploadProfileImage}
              disabled={!selectedImage || imageLoading}
              style={{
                backgroundColor: selectedImage ? "#1d4ed8" : "#94a3b8",
                color: "#fff",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.85rem 1.25rem",
                cursor: selectedImage ? "pointer" : "not-allowed",
                minWidth: "160px"
              }}
            >
              {imageLoading ? "Uploading..." : "Upload Image"}
            </button>
          </div>
          {selectedImage && (
            <p style={{ marginTop: "1rem", color: "#4b5563", fontSize: "0.9rem" }}>
              Selected file: {selectedImage.name}
            </p>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid #e2e8f0", padding: "2rem", boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Complete Your Candidate Profile</h2>
            <p style={{ margin: "0 0 1.5rem", color: "#64748b" }}>
              Upload your resume and add the skills recruiters are looking for.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#334155" }}>
                  Upload Resume <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: resume ? "2px solid #16a34a" : "2px dashed #cbd5e1",
                    borderRadius: "0.75rem",
                    padding: "1.75rem",
                    textAlign: "center",
                    cursor: "pointer",
                    backgroundColor: resume ? "#ecfdf5" : "#f8fafc",
                    transition: "all 0.3s"
                  }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          showError("File size must be under 5MB");
                          return;
                        }
                        setResume(file);
                        showSuccess("Resume uploaded!");
                      }
                    }}
                  />
                  {resume ? (
                    <div>
                      <CheckCircle2 style={{ width: "2rem", height: "2rem", margin: "0 auto 0.5rem", color: "#16a34a" }} />
                      <p style={{ color: "#16a34a", fontWeight: "700" }}>{resume.name}</p>
                      <p style={{ fontSize: "0.875rem", color: "#475569", marginTop: "0.25rem" }}>Click to change</p>
                    </div>
                  ) : (
                    <div>
                      <Upload style={{ width: "2rem", height: "2rem", margin: "0 auto 0.5rem", color: "#64748b" }} />
                      <p style={{ fontWeight: "700", color: "#0f172a" }}>Upload your resume</p>
                      <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>PDF or DOC only, under 5MB</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.75rem", color: "#334155" }}>
                  Select Your Skills <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
                  {AVAILABLE_SKILLS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      style={{
                        padding: "0.6rem 1rem",
                        border: skills.includes(skill) ? "2px solid #fb923c" : "1px solid #cbd5e1",
                        backgroundColor: skills.includes(skill) ? "#fb923c" : "#fff",
                        color: skills.includes(skill) ? "#fff" : "#0f172a",
                        borderRadius: "999px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: "600",
                        transition: "all 0.2s"
                      }}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <input
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addSkill()}
                    placeholder="Add a custom skill"
                    style={{
                      flex: 1,
                      padding: "0.9rem 1rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.75rem",
                      fontSize: "0.95rem",
                      outline: "none"
                    }}
                  />
                  <button
                    onClick={addSkill}
                    style={{
                      padding: "0.9rem 1.25rem",
                      backgroundColor: "#fb923c",
                      border: "none",
                      borderRadius: "0.75rem",
                      color: "#fff",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    <Plus style={{ width: "1rem", height: "1rem" }} />
                  </button>
                </div>
                {skills.length > 0 && (
                  <div style={{ padding: "1rem", backgroundColor: "#ecfdf5", borderRadius: "0.75rem", border: "1px solid #bbf7d0" }}>
                    <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: "600", color: "#166534" }}>Selected Skills ({skills.length})</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
                      {skills.map((skill) => (
                        <div key={skill} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.8rem", backgroundColor: "#dcfce7", borderRadius: "0.75rem", color: "#166534", border: "1px solid #86efac" }}>
                          <span>{skill}</span>
                          <button onClick={() => removeSkill(skill)} style={{ background: "none", border: "none", cursor: "pointer", color: "#15803d" }}>
                            <X style={{ width: "0.9rem", height: "0.9rem" }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={submit}
                disabled={loading || !resume || skills.length === 0}
                style={{
                  width: "100%",
                  padding: "1rem",
                  backgroundColor: loading || !resume || skills.length === 0 ? "#cbd5e1" : "#f97316",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.75rem",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: loading || !resume || skills.length === 0 ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s"
                }}
              >
                <CheckCircle2 style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
                {loading ? "Verifying..." : "Complete Verification"}
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid #e2e8f0", padding: "2rem", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Your Candidate Summary</h2>
            <p style={{ margin: "0 0 1.5rem", color: "#475569" }}>
              This panel shows your profile status and visibility to recruiters.
            </p>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderRadius: "0.75rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <span style={{ color: "#334155", fontWeight: "600" }}>Candidate Name</span>
                <span style={{ color: "#0f172a", fontWeight: "700" }}>{profile?.name || "Not set"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderRadius: "0.75rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <span style={{ color: "#334155", fontWeight: "600" }}>Profile Status</span>
                <span style={{ color: profile?.verified ? "#0f766e" : "#b45309", fontWeight: "700" }}>{profile?.verified ? "Verified" : "Pending"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderRadius: "0.75rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <span style={{ color: "#334155", fontWeight: "600" }}>Skills Added</span>
                <span style={{ color: "#0f172a", fontWeight: "700" }}>{skills.length || (Array.isArray(profile?.skills) ? profile.skills.length : 0)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "700", color: "#0f172a" }}>Open Jobs</h2>
            <p style={{ margin: "0.5rem 0 0", color: "#64748b" }}>Browse the latest openings that can match your skills.</p>
          </div>
          <div style={{ color: "#475569", fontSize: "0.95rem" }}>{jobLoading ? "Loading jobs..." : `${jobs.length} jobs available`}</div>
        </div>

        <div style={{ display: "grid", gap: "1.5rem" }}>
          {jobLoading ? (
            <div style={{ padding: "2rem", backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid #e2e8f0", textAlign: "center", color: "#64748b" }}>
              Loading available jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ padding: "2rem", backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid #e2e8f0", textAlign: "center", color: "#64748b" }}>
              No job openings are available right now. Check back soon.
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id || job._id || job.job_title} style={{ backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid #e2e8f0", padding: "1.5rem", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: "700", color: "#0f172a" }}>{job.job_title || job.title || "Untitled Role"}</h3>
                    <p style={{ margin: 0, color: "#475569" }}>{job.department || job.department_name || "General"}</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span style={{ padding: "0.5rem 0.75rem", borderRadius: "999px", backgroundColor: "#eef2ff", color: "#3730a3", fontSize: "0.85rem", fontWeight: "600" }}>{job.location || "Remote"}</span>
                    <span style={{ padding: "0.5rem 0.75rem", borderRadius: "999px", backgroundColor: "#f7fee7", color: "#166534", fontSize: "0.85rem", fontWeight: "600" }}>{job.job_type || job.type || "Full-time"}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.75rem", marginTop: "1rem", color: "#475569" }}>
                  <div style={{ padding: "1rem", borderRadius: "0.75rem", backgroundColor: "#f8fafc" }}>
                    <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em" }}>Experience</p>
                    <p style={{ margin: "0.5rem 0 0", fontWeight: "700", color: "#0f172a" }}>{job.experience_required || job.experience || "Not specified"}</p>
                  </div>
                  <div style={{ padding: "1rem", borderRadius: "0.75rem", backgroundColor: "#f8fafc" }}>
                    <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em" }}>Salary</p>
                    <p style={{ margin: "0.5rem 0 0", fontWeight: "700", color: "#0f172a" }}>{job.salary_range || job.salary || "Not disclosed"}</p>
                  </div>
                </div>

                <p style={{ margin: "1rem 0 0", color: "#475569", lineHeight: "1.75" }}>
                  {(job.job_description || job.description || "No description available.").slice(0, 180)}
                  {(job.job_description || job.description || "").length > 180 ? "..." : ""}
                </p>

                <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <span style={{ color: "#64748b", fontSize: "0.9rem" }}>Posted {job.posted_at || job.postedOn || "recently"}</span>
                  <button
                    onClick={() => handleJobAction(job)}
                    style={{
                      padding: "0.9rem 1.25rem",
                      backgroundColor: "#1d4ed8",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0.75rem",
                      cursor: "pointer",
                      fontWeight: "700"
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
