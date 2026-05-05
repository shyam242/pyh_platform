"use client";

import { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { validateReferralForm } from "@/utils/validation";

export default function ReferrerDashboard() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    experience: "",
    company: "",
    linkedin: "",
  });

  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
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
      return showError("Fill all fields");
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
        experience: "",
        company: "",
        linkedin: "",
      });
      setCvFile(null);
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
            Refer a Candidate
          </h1>
          <p style={{ fontSize: "1rem", color: "#666", lineHeight: "1.6" }}>
            Help us find exceptional talent and earn rewards!
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

            {/* Phone & Experience */}
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
                  Years of Experience <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="number"
                  name="experience"
                  value={form.experience}
                  onChange={handleInputChange}
                  placeholder="5"
                  min="0"
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: errors.experience ? "2px solid #dc2626" : "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                {errors.experience && (
                  <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <AlertCircle style={{ width: "1rem", height: "1rem" }} /> {errors.experience}
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                  Company <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleInputChange}
                  placeholder="PYH Consultants"
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

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                  LinkedIn Profile <span style={{ color: "#dc2626" }}>*</span>
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
                    border: errors.linkedin ? "2px solid #dc2626" : "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                {errors.linkedin && (
                  <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <AlertCircle style={{ width: "1rem", height: "1rem" }} /> {errors.linkedin}
                  </p>
                )}
              </div>
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
                backgroundColor: loading ? "#9ca3af" : "#000",
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
              onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = "#1f2937"; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = "#000"; }}
            >
              <Upload style={{ width: "1rem", height: "1rem" }} />
              {loading ? "Submitting..." : "Submit Referral"}
            </button>
          </form>
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
              <p style={{ fontWeight: "600" }}>Referral Submitted!</p>
              <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>We'll review the candidate soon.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
