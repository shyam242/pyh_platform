"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle2, Plus, X } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

const AVAILABLE_SKILLS = ["React", "Node.js", "Python", "Java", "AWS", "UI/UX", "TypeScript", "MongoDB"];

export default function CandidateDashboard() {
  const [resume, setResume] = useState(null);
  const [skills, setSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef(null);

  const toggleSkill = (s) => {
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const addSkill = () => {
    if (customSkill.trim() && !skills.includes(customSkill)) {
      setSkills([...skills, customSkill]);
      setCustomSkill("");
    }
  };

  const removeSkill = (s) => {
    setSkills(skills.filter(x => x !== s));
  };

  const submit = async () => {
    if (!resume) return showError("Upload resume first");
    if (skills.length === 0) return showError("Select at least one skill");

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("resume", resume);
      fd.append("skills", JSON.stringify(skills));

      const res = await fetch("http://localhost:5000/api/recruiter/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });

      if (!res.ok) throw new Error("Verification failed");

      showSuccess("Profile verified successfully! 🎉");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#000", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        
        {/* HEADER */}
        <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
            Complete Your Profile
          </h1>
          <p style={{ fontSize: "1rem", color: "#666", lineHeight: "1.6" }}>
            Upload your resume and showcase your skills to top recruiters
          </p>
        </div>

        {/* FORM CARD */}
        <div style={{
          backgroundColor: "#f9f9f9",
          borderRadius: "0.75rem",
          border: "1px solid #ddd",
          padding: "2rem",
          marginBottom: "2rem"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Resume Upload */}
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                Upload Resume <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: resume ? "2px solid #16a34a" : "2px dashed #ddd",
                  borderRadius: "0.75rem",
                  padding: "2rem",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: resume ? "#f0fdf4" : "#fafafa",
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
                        showError("File size must be < 5MB");
                        return;
                      }
                      setResume(file);
                      showSuccess("Resume uploaded!");
                    }
                  }}
                />
                {resume ? (
                  <div>
                    <CheckCircle2 style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto 0.5rem", color: "#16a34a" }} />
                    <p style={{ color: "#16a34a", fontWeight: "600" }}>{resume.name}</p>
                    <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>Click to change</p>
                  </div>
                ) : (
                  <div>
                    <Upload style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto 0.5rem", color: "#999" }} />
                    <p style={{ fontWeight: "600", color: "#333" }}>Click to upload resume</p>
                    <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>PDF or DOC (max 5MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Skills Selection */}
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "1rem", color: "#333" }}>
                Select Your Skills <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "1rem"
              }}>
                {AVAILABLE_SKILLS.map(skill => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    style={{
                      padding: "0.5rem 1rem",
                      border: skills.includes(skill) ? "2px solid #000" : "1px solid #ddd",
                      backgroundColor: skills.includes(skill) ? "#000" : "#fff",
                      color: skills.includes(skill) ? "#fff" : "#000",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      transition: "all 0.3s"
                    }}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Skill */}
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                Add Custom Skill
              </label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <input
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSkill()}
                  placeholder="e.g., GraphQL"
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                <button
                  onClick={addSkill}
                  style={{
                    padding: "0.75rem 1rem",
                    backgroundColor: "#000",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.3s"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#1f2937"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#000"}
                >
                  <Plus style={{ width: "1rem", height: "1rem" }} /> Add
                </button>
              </div>
            </div>

            {/* Selected Skills Display */}
            {skills.length > 0 && (
              <div style={{ padding: "1rem", backgroundColor: "#f0fdf4", borderRadius: "0.5rem", border: "1px solid #d1fae5" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: "600", color: "#333", marginBottom: "0.75rem" }}>
                  Selected Skills ({skills.length})
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {skills.map(skill => (
                    <div
                      key={skill}
                      style={{
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "#dcfce7",
                        border: "1px solid #86efac",
                        borderRadius: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                        color: "#166534"
                      }}
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "0",
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        <X style={{ width: "1rem", height: "1rem" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={submit}
              disabled={loading || !resume || skills.length === 0}
              style={{
                width: "100%",
                padding: "1rem",
                backgroundColor: loading || !resume || skills.length === 0 ? "#d1d5db" : "#000",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: loading || !resume || skills.length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.3s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem"
              }}
              onMouseEnter={(e) => { if (!loading && resume && skills.length > 0) e.target.style.backgroundColor = "#1f2937"; }}
              onMouseLeave={(e) => { if (!loading && resume && skills.length > 0) e.target.style.backgroundColor = "#000"; }}
            >
              <CheckCircle2 style={{ width: "1rem", height: "1rem" }} />
              {loading ? "Verifying..." : "Complete Verification"}
            </button>
          </div>
        </div>

        {/* Success Message */}
        {submitted && (
          <div style={{
            padding: "1.5rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            color: "#16a34a"
          }}>
            <CheckCircle2 style={{ width: "1.5rem", height: "1.5rem", flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: "600" }}>Profile Verified!</p>
              <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>Your profile is now visible to recruiters.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}