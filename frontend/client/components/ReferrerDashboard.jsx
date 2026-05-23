"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2, Users, Trophy, DollarSign, Plus, Eye, EyeOff } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { validateReferralForm } from "@/utils/validation";

export default function ReferrerDashboard() {
  const [stats, setStats] = useState({
    totalReferred: 0,
    successfulJoinings: 0,
    totalIncentives: 0
  });
  const [referrals, setReferrals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    industry: "",
    department: "",
    skills: "",
    experience: "",
    company: "",
    linkedin: "",
  });
  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const fileInputRef = useRef(null);

  // Skills suggestions for auto-complete
  const skillSuggestions = [
    "JavaScript", "Python", "Java", "C++", "C#", "PHP", "Ruby", "Go", "Rust", "TypeScript",
    "React", "Vue.js", "Angular", "Node.js", "Express", "Django", "Flask", "Spring Boot",
    "HTML", "CSS", "SASS", "Tailwind CSS", "Bootstrap", "Material UI",
    "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Jenkins", "Git",
    "Machine Learning", "Data Science", "AI", "DevOps", "Cybersecurity"
  ];

  useEffect(() => {
    fetchStats();
    fetchReferrals();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/referral/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchReferrals = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/referral/my", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReferrals(data);
      }
    } catch (err) {
      console.error("Failed to fetch referrals:", err);
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSkillsChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, skills: value });
    setErrors({ ...errors, skills: "" });
  };

  const addSkill = (skill) => {
    const currentSkills = form.skills ? form.skills.split(',').map(s => s.trim()) : [];
    if (!currentSkills.includes(skill)) {
      const newSkills = [...currentSkills, skill].join(', ');
      setForm({ ...form, skills: newSkills });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError("File size must be < 5MB");
      return;
    }
    setCvFile(file);
    setErrors({ ...errors, cv: "" });
  };

  const submit = async () => {
    const validationErrors = validateReferralForm(form);

    if (!cvFile) validationErrors.cv = "CV required";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return showError("Fill all required fields");
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      Object.keys(form).forEach((k) => formData.append(k, form[k]));
      formData.append("cv", cvFile);

      const res = await fetch(
        "http://localhost:5000/api/referral/create",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Submission failed");

      showSuccess("Referral submitted 🎉");

      setSubmitted(true);
      setForm({
        name: "",
        email: "",
        phone: "",
        industry: "",
        department: "",
        skills: "",
        experience: "",
        company: "",
        linkedin: "",
      });
      setCvFile(null);
      setShowForm(false);
      fetchStats();
      fetchReferrals();

      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#000", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
            Referrer Dashboard
          </h1>
          <p style={{ fontSize: "1rem", color: "#666", lineHeight: "1.6" }}>
            Track your referrals and earn rewards for successful placements
          </p>
        </div>

        {/* STATS CARDS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem"
        }}>
          <div style={{
            backgroundColor: "#f8f9fa",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            border: "1px solid #e9ecef",
            textAlign: "center"
          }}>
            <Users style={{ width: "2rem", height: "2rem", margin: "0 auto 0.5rem", color: "#007bff" }} />
            <h3 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
              {loadingStats ? "..." : stats.totalReferred}
            </h3>
            <p style={{ color: "#666", fontSize: "0.9rem" }}>Total Candidates Referred</p>
          </div>

          <div style={{
            backgroundColor: "#f8f9fa",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            border: "1px solid #e9ecef",
            textAlign: "center"
          }}>
            <Trophy style={{ width: "2rem", height: "2rem", margin: "0 auto 0.5rem", color: "#28a745" }} />
            <h3 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
              {loadingStats ? "..." : stats.successfulJoinings}
            </h3>
            <p style={{ color: "#666", fontSize: "0.9rem" }}>Successful Joinings</p>
          </div>

          <div style={{
            backgroundColor: "#f8f9fa",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            border: "1px solid #e9ecef",
            textAlign: "center"
          }}>
            <DollarSign style={{ width: "2rem", height: "2rem", margin: "0 auto 0.5rem", color: "#ffc107" }} />
            <h3 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
              ${loadingStats ? "..." : stats.totalIncentives}
            </h3>
            <p style={{ color: "#666", fontSize: "0.9rem" }}>Total Incentives Earned</p>
          </div>
        </div>

        {/* REFER CANDIDATE BUTTON */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: showForm ? "#dc3545" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.3s"
            }}
          >
            {showForm ? <EyeOff style={{ width: "1rem", height: "1rem" }} /> : <Plus style={{ width: "1rem", height: "1rem" }} />}
            {showForm ? "Hide Form" : "Refer Candidate"}
          </button>
        </div>

        {/* REFERRAL FORM */}
        {showForm && (
          <div style={{
            backgroundColor: "#f9f9f9",
            borderRadius: "0.75rem",
            border: "1px solid #ddd",
            padding: "2rem",
            marginBottom: "2rem"
          }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem", textAlign: "center" }}>
              Refer a New Candidate
            </h2>

            <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* Name & Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                    Full Name <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: errors.name ? "2px solid #dc2626" : "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border 0.3s"
                    }}
                  />
                  {errors.name && (
                    <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <AlertCircle style={{ width: "1rem", height: "1rem" }} /> {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                    Email <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: errors.email ? "2px solid #dc2626" : "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  {errors.email && (
                    <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <AlertCircle style={{ width: "1rem", height: "1rem" }} /> {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Phone & Industry */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                    Phone <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    placeholder="9876543210"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: errors.phone ? "2px solid #dc2626" : "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  {errors.phone && (
                    <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <AlertCircle style={{ width: "1rem", height: "1rem" }} /> {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                    Industry
                  </label>
                  <select
                    name="industry"
                    value={form.industry}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  >
                    <option value="">Select Industry</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Education">Education</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail">Retail</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Department & Skills */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                    Department/Function
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={form.department}
                    onChange={handleInputChange}
                    placeholder="e.g., Engineering, Marketing, Sales"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                    Skills <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="skills"
                    value={form.skills}
                    onChange={handleSkillsChange}
                    placeholder="e.g., JavaScript, React, Python"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: errors.skills ? "2px solid #dc2626" : "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  {errors.skills && (
                    <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <AlertCircle style={{ width: "1rem", height: "1rem" }} /> {errors.skills}
                    </p>
                  )}
                  {/* Skills suggestions */}
                  <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {skillSuggestions.slice(0, 8).map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => addSkill(skill)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          backgroundColor: "#e9ecef",
                          border: "1px solid #dee2e6",
                          borderRadius: "0.25rem",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          color: "#495057"
                        }}
                      >
                        + {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Experience & Company */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                    Experience <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    name="experience"
                    value={form.experience}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: errors.experience ? "2px solid #dc2626" : "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  >
                    <option value="">Select Experience</option>
                    <option value="fresher">Fresher (0-1 years)</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5-8">5-8 years</option>
                    <option value="8+">8+ years</option>
                  </select>
                  {errors.experience && (
                    <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <AlertCircle style={{ width: "1rem", height: "1rem" }} /> {errors.experience}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                    Current Company <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleInputChange}
                    placeholder="Current company name"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: errors.company ? "2px solid #dc2626" : "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  {errors.company && (
                    <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <AlertCircle style={{ width: "1rem", height: "1rem" }} /> {errors.company}
                    </p>
                  )}
                </div>
              </div>

              {/* LinkedIn URL */}
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  name="linkedin"
                  value={form.linkedin}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/username"
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* CV Upload */}
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                  Upload CV/Resume <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: errors.cv ? "2px solid #dc2626" : cvFile ? "2px solid #16a34a" : "2px dashed #ddd",
                    borderRadius: "0.75rem",
                    padding: "2rem",
                    textAlign: "center",
                    cursor: "pointer",
                    backgroundColor: errors.cv ? "#fee2e2" : cvFile ? "#f0fdf4" : "#fafafa",
                    transition: "all 0.3s"
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {cvFile ? (
                    <div>
                      <CheckCircle2 style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto 0.5rem", color: "#16a34a" }} />
                      <p style={{ color: "#16a34a", fontWeight: "600" }}>{cvFile.name}</p>
                      <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>Click to change file</p>
                    </div>
                  ) : (
                    <div>
                      <Upload style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto 0.5rem", color: "#999" }} />
                      <p style={{ fontWeight: "600", color: "#333" }}>Click to upload CV</p>
                      <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>PDF or DOC (max 5MB)</p>
                    </div>
                  )}
                </div>
                {errors.cv && (
                  <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <AlertCircle style={{ width: "1rem", height: "1rem" }} /> {errors.cv}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={submit}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "1rem",
                  backgroundColor: loading ? "#9ca3af" : "#f97316",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
                onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = "#ea580c"; }}
                onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = "#f97316"; }}
              >
                <Upload style={{ width: "1rem", height: "1rem" }} />
                {loading ? "Submitting..." : "Submit Referral"}
              </button>
            </form>
          </div>
        )}

        {/* REFERRED CANDIDATES LIST */}
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
            Your Referred Candidates
          </h2>

          {referrals.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "3rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "0.75rem",
              border: "1px solid #e9ecef"
            }}>
              <Users style={{ width: "3rem", height: "3rem", margin: "0 auto 1rem", color: "#6c757d" }} />
              <p style={{ color: "#6c757d", fontSize: "1.1rem" }}>No candidates referred yet</p>
              <p style={{ color: "#6c757d", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                Click "Refer Candidate" to get started!
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {referrals.map((referral) => (
                <div key={referral.id} style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: "0.75rem",
                  border: "1px solid #e9ecef",
                  padding: "1.5rem",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "1rem",
                  alignItems: "center"
                }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                      {referral.name}
                    </h3>
                    <p style={{ color: "#666", marginBottom: "0.25rem" }}>{referral.email}</p>
                    <p style={{ color: "#666", marginBottom: "0.25rem" }}>{referral.phone}</p>
                    <p style={{ color: "#666", fontSize: "0.9rem" }}>
                      {referral.company} • {referral.experience} • {referral.status}
                    </p>
                    {referral.skills && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.25rem" }}>Skills:</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                          {Array.isArray(referral.skills) ? referral.skills.map((skill, index) => (
                            <span key={index} style={{
                              backgroundColor: "#e9ecef",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.25rem",
                              fontSize: "0.8rem",
                              color: "#495057"
                            }}>
                              {skill}
                            </span>
                          )) : (
                            <span style={{
                              backgroundColor: "#e9ecef",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.25rem",
                              fontSize: "0.8rem",
                              color: "#495057"
                            }}>
                              {referral.skills}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "1rem",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      backgroundColor: referral.verified ? "#d4edda" : "#fff3cd",
                      color: referral.verified ? "#155724" : "#856404"
                    }}>
                      {referral.verified ? "Verified" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Success Message */}
        {submitted && (
          <div style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "1.5rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            color: "#16a34a",
            zIndex: 1000,
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
          }}>
            <CheckCircle2 style={{ width: "1.5rem", height: "1.5rem", flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: "600" }}>Referral Submitted!</p>
              <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>We'll review the candidate soon.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
