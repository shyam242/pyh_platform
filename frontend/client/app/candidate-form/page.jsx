"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Upload } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

export default function CandidateFormPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    job_role: "",
    contact: "",
    skills: "",
    cctc: "",
    ectc: "",
    current_location: "",
    preferred_location: "",
    notice_period: "",
    offer_in_hand: "No",
    reason_for_change: "",
    current_company_name: "",
    highest_qualification: "",
    address_aadhaar: "",
    technical_skills: "",
    soft_skills: "",
    linkedin_profile: "",
    resume_file_path: "",
  });

  const qualifications = [
    "10th",
    "12th",
    "Bachelor's",
    "Master's",
    "PhD",
    "Diploma",
    "Certificate",
  ];

  const noticePeriods = ["Immediate", "15 days", "30 days", "60 days", "90 days"];

  useEffect(() => {
    const checkToken = localStorage.getItem("token");
    if (!checkToken) {
      router.push("/signin");
    }
  }, [router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = { ...prev };
      updated[name] = type === 'checkbox' ? checked : value;
      return updated;
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formDataFile = new FormData();
      formDataFile.append("file", file);

      const response = await fetch("http://localhost:5000/api/profile/upload-resume", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formDataFile,
      });

      if (!response.ok) throw new Error("Failed to upload resume");

      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        resume_file_path: data.filePath,
      }));
      showSuccess("Resume uploaded successfully!");
    } catch (err) {
      showError(err.message || "Failed to upload resume");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (
        !formData.job_role ||
        !formData.contact ||
        !formData.current_location ||
        !formData.preferred_location
      ) {
        showError("Please fill in all required fields");
        setLoading(false);
        return;
      }

      const response = await fetch("http://localhost:5000/api/profile/candidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create profile");

      const data = await response.json();
      showSuccess("Profile created successfully! Redirecting to dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err) {
      showError(err.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* NAVBAR */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 50,
          backgroundColor: "#fff",
          borderBottom: "1px solid #ddd",
          padding: "1rem 0",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            PickYourHire
          </button>
          <button
            onClick={() => router.back()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#f0f0f0",
              color: "#000",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: "5rem", paddingBottom: "2rem" }}>
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "2rem 1.5rem",
          }}
        >
          <div style={{ marginBottom: "2rem" }}>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              Complete Your Profile
            </h1>
            <p style={{ color: "#666", fontSize: "1rem" }}>
              Help us understand your career preferences and background
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: "#fff",
              borderRadius: "0.75rem",
              padding: "2rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {/* Row 1: Job Role & Contact */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Job Role *
                </label>
                <input
                  type="text"
                  name="job_role"
                  placeholder="e.g., Software Engineer, Product Manager"
                  value={formData.job_role}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Contact Number *
                </label>
                <input
                  type="tel"
                  name="contact"
                  placeholder="10-digit mobile number"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Row 2: Current Location & Preferred Location */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Current Location *
                </label>
                <input
                  type="text"
                  name="current_location"
                  placeholder="City, State"
                  value={formData.current_location}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Preferred Location *
                </label>
                <input
                  type="text"
                  name="preferred_location"
                  placeholder="City, State"
                  value={formData.preferred_location}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Row 3: CCTC & ECTC */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Current CTC (in LPA)
                </label>
                <input
                  type="number"
                  name="cctc"
                  placeholder="e.g., 10.50"
                  value={formData.cctc}
                  onChange={handleChange}
                  step="0.01"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Expected CTC (in LPA)
                </label>
                <input
                  type="number"
                  name="ectc"
                  placeholder="e.g., 15.00"
                  value={formData.ectc}
                  onChange={handleChange}
                  step="0.01"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Row 4: Notice Period & Offer in Hand */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Notice Period
                </label>
                <select
                  name="notice_period"
                  value={formData.notice_period}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Select notice period</option>
                  {noticePeriods.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Offer in Hand?
                </label>
                <select
                  name="offer_in_hand"
                  value={formData.offer_in_hand}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>

            {/* Row 5: Highest Qualification & Current Company */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Highest Qualification
                </label>
                <select
                  name="highest_qualification"
                  value={formData.highest_qualification}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Select qualification</option>
                  {qualifications.map((qual) => (
                    <option key={qual} value={qual}>
                      {qual}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Current Company Name
                </label>
                <input
                  type="text"
                  name="current_company_name"
                  placeholder="e.g., Tech Company Ltd"
                  value={formData.current_company_name}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Row 6: Skills */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                General Skills (comma-separated)
              </label>
              <textarea
                name="skills"
                placeholder="e.g., Leadership, Project Management, Communication"
                value={formData.skills}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  minHeight: "80px",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Row 7: Technical & Soft Skills */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Technical Skills (comma-separated)
                </label>
                <textarea
                  name="technical_skills"
                  placeholder="e.g., Python, JavaScript, React, Node.js"
                  value={formData.technical_skills}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                    minHeight: "80px",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Soft Skills (comma-separated)
                </label>
                <textarea
                  name="soft_skills"
                  placeholder="e.g., Communication, Teamwork, Problem Solving"
                  value={formData.soft_skills}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                    minHeight: "80px",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Row 8: Address & Reason for Change */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Address (as per Aadhaar)
                </label>
                <textarea
                  name="address_aadhaar"
                  placeholder="Enter your full address"
                  value={formData.address_aadhaar}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                    minHeight: "80px",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Reason for Change
                </label>
                <textarea
                  name="reason_for_change"
                  placeholder="Why are you looking for a new opportunity?"
                  value={formData.reason_for_change}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                    minHeight: "80px",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Row 9: LinkedIn & Resume */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  name="linkedin_profile"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={formData.linkedin_profile}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Resume File
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    border: "2px dashed #ddd",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    backgroundColor: "#fafafa",
                  }}
                >
                  <Upload size={20} />
                  <span style={{ color: "#666" }}>
                    {formData.resume_file_path ? "Resume uploaded" : "Upload PDF/DOC"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: "2rem",
              }}
            >
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "1rem",
                  backgroundColor: loading ? "#ccc" : "#000",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Creating Profile..." : "Create Profile & Continue"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
