"use client";
import { useState, useRef } from "react";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";

export default function PostJobPage() {
  const [form, setForm] = useState({
    job_title: "",
    department: "",
    location: "",
    job_type: "full-time",
    salary_range: "",
    experience_required: "",
    job_description: "",
    responsibilities: "",
    qualifications: "",
    benefits: ""
  });

  const [loading, setLoading] = useState(false);
  const descriptionRef = useRef(null);
  const responsibilitiesRef = useRef(null);
  const qualificationsRef = useRef(null);
  const benefitsRef = useRef(null);

  const fieldRefs = {
    job_description: descriptionRef,
    responsibilities: responsibilitiesRef,
    qualifications: qualificationsRef,
    benefits: benefitsRef
  };

  const applyFormatting = (field, prefix, suffix = prefix) => {
    const ref = fieldRefs[field]?.current;
    const value = form[field] || "";
    const selectionStart = ref?.selectionStart ?? value.length;
    const selectionEnd = ref?.selectionEnd ?? value.length;
    const selectedText = value.slice(selectionStart, selectionEnd) || "";
    const newValue = `${value.slice(0, selectionStart)}${prefix}${selectedText}${suffix}${value.slice(selectionEnd)}`;

    setForm((prev) => ({ ...prev, [field]: newValue }));
    setTimeout(() => {
      if (ref) {
        const position = selectionStart + prefix.length + selectedText.length + suffix.length;
        ref.selectionStart = ref.selectionEnd = position;
        ref.focus();
      }
    }, 0);
  };

  const applyListFormatting = (field, type) => {
    const ref = fieldRefs[field]?.current;
    const value = form[field] || "";
    const start = ref?.selectionStart ?? value.length;
    const end = ref?.selectionEnd ?? value.length;
    const selectedText = value.slice(start, end);

    let formatted;
    if (!selectedText) {
      formatted = type === "numbered" ? "1. " : "- ";
    } else {
      const lines = selectedText.split("\n");
      formatted = lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        return type === "numbered"
          ? `${index + 1}. ${trimmed}`
          : `- ${trimmed}`;
      }).join("\n");
    }

    const newValue = `${value.slice(0, start)}${formatted}${value.slice(end)}`;
    setForm((prev) => ({ ...prev, [field]: newValue }));

    setTimeout(() => {
      if (ref) {
        const position = start + formatted.length;
        ref.selectionStart = ref.selectionEnd = position;
        ref.focus();
      }
    }, 0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Validate required fields
      if (!form.job_title || !form.department || !form.location || !form.job_type || 
          !form.experience_required || !form.job_description) {
        showError("Please fill in all required fields");
        return;
      }

      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE_URL}/api/jobs`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess("Job posting created successfully!");
      setTimeout(() => {
        window.location.href = "/admin";
      }, 1500);
    } catch (error) {
      console.error("Error posting job:", error);
      showError(error.response?.data?.message || "Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      {/* NAVBAR */}
      <nav style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        padding: "1.25rem 0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <div style={{
          maxWidth: "1000px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "0 1rem"
        }}>
          <button
            onClick={() => window.location.href = "/admin"}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #e5e7eb",
              color: "#1f2937",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.95rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.375rem"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f3f4f6" }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
          >
            <ArrowLeft style={{ width: "1rem", height: "1rem" }} />
            Back
          </button>
          <h1 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#1f2937" }}>Create New Job Posting</h1>
        </div>
      </nav>

      {/* FORM */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1rem" }}>
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: "#fff",
            borderRadius: "0.75rem",
            padding: "2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}
        >
          {/* Two Column Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
            {/* JOB TITLE */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#333" }}>
                Job Title <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                name="job_title"
                value={form.job_title}
                onChange={handleChange}
                placeholder="e.g., Senior Developer"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* DEPARTMENT */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#333" }}>
                Department <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="e.g., Engineering"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* LOCATION */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#333" }}>
                Location <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g., Noida, Sector 60"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* JOB TYPE */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#333" }}>
                Job Type <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                name="job_type"
                value={form.job_type}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  color: "#0f172a",
                  boxSizing: "border-box"
                }}
              >
                <option value="full-time" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>Full-time</option>
                <option value="part-time" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>Part-time</option>
                <option value="contract" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>Contract</option>
                <option value="internship" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>Internship</option>
              </select>
            </div>

            {/* SALARY RANGE */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#333" }}>
                Salary Range
              </label>
              <input
                type="text"
                name="salary_range"
                value={form.salary_range}
                onChange={handleChange}
                placeholder="e.g., $80,000 - $120,000"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* EXPERIENCE REQUIRED */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#333" }}>
                Experience Required <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                name="experience_required"
                value={form.experience_required}
                onChange={handleChange}
                placeholder="e.g., 3+ years"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          {/* FULL WIDTH FIELDS */}
          {/* JOB DESCRIPTION */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#333" }}>
              Job Description <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {[
                { label: "Bold", onClick: () => applyFormatting("job_description", "**") },
                { label: "Italic", onClick: () => applyFormatting("job_description", "*") },
                { label: "Bullet", onClick: () => applyListFormatting("job_description", "bullet") },
                { label: "Numbered", onClick: () => applyListFormatting("job_description", "numbered") }
              ].map((button) => (
                <button
                  key={button.label}
                  type="button"
                  onClick={button.onClick}
                  style={{
                    backgroundColor: "#f97316",
                    border: "1px solid #f97316",
                    color: "#fff",
                    borderRadius: "0.5rem",
                    padding: "0.5rem 0.9rem",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    minWidth: "84px"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#ea580c"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f97316"}
                >
                  {button.label}
                </button>
              ))}
            </div>
            <textarea
              ref={descriptionRef}
              name="job_description"
              value={form.job_description}
              onChange={handleChange}
              placeholder="Describe the role and responsibilities..."
              rows="4"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontFamily: "inherit",
                boxSizing: "border-box"
              }}
            />
            <p style={{ marginTop: "0.75rem", color: "#6b7280", fontSize: "0.9rem" }}>
              Use the toolbar buttons to mark important parts of the role. Bold and italic text will be saved as markdown.
            </p>
          </div>

          {/* RESPONSIBILITIES */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#333" }}>
              Key Responsibilities
            </label>
            <textarea
              name="responsibilities"
              value={form.responsibilities}
              onChange={handleChange}
              placeholder="Line 1&#10;Line 2&#10;Line 3..."
              rows="4"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontFamily: "inherit",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* QUALIFICATIONS */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#333" }}>
              Qualifications
            </label>
            <textarea
              name="qualifications"
              value={form.qualifications}
              onChange={handleChange}
              placeholder="Line 1&#10;Line 2&#10;Line 3..."
              rows="4"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontFamily: "inherit",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* BENEFITS */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#333" }}>
              Benefits
            </label>
            <textarea
              name="benefits"
              value={form.benefits}
              onChange={handleChange}
              placeholder="Line 1&#10;Line 2&#10;Line 3..."
              rows="4"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontFamily: "inherit",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* SUBMIT BUTTON */}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "#f97316",
                color: "#fff",
                border: "none",
                padding: "0.75rem 2rem",
                borderRadius: "0.75rem",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "700",
                opacity: loading ? 0.75 : 1,
                boxShadow: loading ? "none" : "0 10px 25px rgba(249,115,22,0.18)"
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#ea580c";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#f97316";
              }}
            >
              {loading ? "Posting..." : "Post Job"}
            </button>
            <button
              type="button"
              onClick={() => window.location.href = "/admin"}
              style={{
                backgroundColor: "#f97316",
                color: "#fff",
                border: "none",
                padding: "0.75rem 2rem",
                borderRadius: "0.75rem",
                cursor: "pointer",
                fontWeight: "700",
                boxShadow: "0 8px 20px rgba(249,115,22,0.12)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#ea580c"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f97316"}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
