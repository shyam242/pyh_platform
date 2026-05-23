"use client";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { validateForm } from "@/utils/validation";

const roleCards = [
  {
    id: "referrer",
    title: "Referrer",
    description: "Refer talented candidates for opportunities",
  },
  {
    id: "candidate",
    title: "Candidate",
    description: "Find and apply for job opportunities",
  },
  {
    id: "recruiter",
    title: "Recruiter",
    description: "Hire talent and manage your pipeline",
  },
];

export default function CreateProfile() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [experience, setExperience] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = async () => {
    const validationErrors = validateForm({ name, role }, ["name", "role"]);

    // Additional validation for referrer
    if (role === "referrer") {
      if (!company) validationErrors.company = "Company name is required";
      if (!experience) validationErrors.experience = "Experience is required";
      if (!phone) validationErrors.phone = "Mobile number is required";
    }

    // Additional validation for recruiter
    if (role === "recruiter") {
      if (!companyName) validationErrors.companyName = "Company name is required";
      if (!phone) validationErrors.phone = "Phone number is required";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Object.values(validationErrors).forEach((err) => showError(err));
      return;
    }

    setLoading(true);
    try {
      const email = localStorage.getItem("email");

      if (!email) {
        showError("Email not found. Please login again.");
        window.location.href = "/signin";
        return;
      }

      const payload = { name, role, email, company, experience, phone };
      
      // Add recruiter-specific fields
      if (role === "recruiter") {
        payload.company_name = companyName;
        payload.company_website = companyWebsite;
      }

      const res = await fetch("http://localhost:5000/api/profile/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create profile");

      const data = await res.json();

      localStorage.setItem("token", data.token);
      showSuccess("Profile created successfully! Redirecting to your dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    } catch (err) {
      showError(err.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#000" }}>
      {/* NAVBAR */}
      <nav style={{
        position: "fixed",
        top: 0,
        width: "100%",
        zIndex: 50,
        backgroundColor: "#fff",
        borderBottom: "1px solid #ddd",
        padding: "1rem 0"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer"
            }}
          >
            PickYourHire
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("email");
              window.location.href = "/signin";
            }}
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Back
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: "5rem" }}>
        <section style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem"
        }}>
          <div style={{ maxWidth: "700px", width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <h1 style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                marginBottom: "0.5rem"
              }}>
                Welcome to PickYourHire
              </h1>
              <p style={{
                fontSize: "1rem",
                color: "#666"
              }}>
                Let's set up your profile to get started
              </p>
            </div>

            {/* Name Input Section */}
            <div style={{
              padding: "1.5rem",
              border: "1px solid #ddd",
              borderRadius: "0.75rem",
              backgroundColor: "#f9f9f9",
              marginBottom: "1.5rem"
            }}>
              <label style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
                color: "#333"
              }}>
                What's your name?
              </label>
              <input
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors({ ...errors, name: "" });
                }}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: errors.name ? "2px solid #dc2626" : "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  outline: "none"
                }}
                onFocus={(e) => {
                  if (!errors.name) e.target.style.borderColor = "#000";
                }}
                onBlur={(e) => {
                  if (!errors.name) e.target.style.borderColor = "#ddd";
                }}
              />
              {errors.name && (
                <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div style={{ marginBottom: "2rem" }}>
              <label style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "#333"
              }}>
                Choose your role to continue
              </label>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "1rem"
              }}>
                {roleCards.map((roleCard) => (
                  <button
                    key={roleCard.id}
                    onClick={() => {
                      setRole(roleCard.id);
                      setErrors({ ...errors, role: "" });
                    }}
                    style={{
                      padding: "1.5rem",
                      border: role === roleCard.id ? "2px solid #000" : "1px solid #ddd",
                      borderRadius: "0.75rem",
                      backgroundColor: role === roleCard.id ? "#f0f0f0" : "#f9f9f9",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (role !== roleCard.id) {
                        e.currentTarget.style.borderColor = "#666";
                        e.currentTarget.style.backgroundColor = "#f3f3f3";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (role !== roleCard.id) {
                        e.currentTarget.style.borderColor = "#ddd";
                        e.currentTarget.style.backgroundColor = "#f9f9f9";
                      }
                    }}
                  >
                    <h3 style={{
                      fontSize: "1rem",
                      fontWeight: "bold",
                      marginBottom: "0.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}>
                      {roleCard.title}
                      {role === roleCard.id && (
                        <Check style={{ width: "1rem", height: "1rem" }} />
                      )}
                    </h3>
                    <p style={{
                      color: "#666",
                      fontSize: "0.85rem",
                      lineHeight: "1.4"
                    }}>
                      {roleCard.description}
                    </p>
                  </button>
                ))}
              </div>
              {errors.role && (
                <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  {errors.role}
                </p>
              )}
            </div>
            {role === "referrer" && (
              <div style={{ marginBottom: "2rem" }}>
                <div style={{
                  padding: "1.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.75rem",
                  backgroundColor: "#f9f9f9",
                  marginBottom: "1rem"
                }}>
                  <label style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#333"
                  }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Google, Microsoft, Amazon"
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      setErrors({ ...errors, company: "" });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: errors.company ? "2px solid #dc2626" : "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      if (!errors.company) e.target.style.borderColor = "#000";
                    }}
                    onBlur={(e) => {
                      if (!errors.company) e.target.style.borderColor = "#ddd";
                    }}
                  />
                  {errors.company && (
                    <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                      {errors.company}
                    </p>
                  )}
                </div>

                <div style={{
                  padding: "1.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.75rem",
                  backgroundColor: "#f9f9f9"
                }}>
                  <label style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#333"
                  }}>
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 5"
                    min="0"
                    max="50"
                    value={experience}
                    onChange={(e) => {
                      setExperience(e.target.value);
                      setErrors({ ...errors, experience: "" });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: errors.experience ? "2px solid #dc2626" : "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      if (!errors.experience) e.target.style.borderColor = "#000";
                    }}
                    onBlur={(e) => {
                      if (!errors.experience) e.target.style.borderColor = "#ddd";
                    }}
                  />
                  {errors.experience && (
                    <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                      {errors.experience}
                    </p>
                  )}
                </div>
                <div style={{
                  padding: "1.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.75rem",
                  backgroundColor: "#f9f9f9",
                  marginTop: "1rem"
                }}>
                  <label style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#333"
                  }}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +919876543210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors({ ...errors, phone: "" });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: errors.phone ? "2px solid #dc2626" : "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      if (!errors.phone) e.target.style.borderColor = "#000";
                    }}
                    onBlur={(e) => {
                      if (!errors.phone) e.target.style.borderColor = "#ddd";
                    }}
                  />
                  {errors.phone && (
                    <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {role === "recruiter" && (
              <div style={{ marginBottom: "2rem" }}>
                <div style={{
                  padding: "1.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.75rem",
                  backgroundColor: "#f9f9f9",
                  marginBottom: "1rem"
                }}>
                  <label style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#333"
                  }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Tech Corp, Hiring Inc."
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setErrors({ ...errors, companyName: "" });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: errors.companyName ? "2px solid #dc2626" : "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      if (!errors.companyName) e.target.style.borderColor = "#000";
                    }}
                    onBlur={(e) => {
                      if (!errors.companyName) e.target.style.borderColor = "#ddd";
                    }}
                  />
                  {errors.companyName && (
                    <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                      {errors.companyName}
                    </p>
                  )}
                </div>

                <div style={{
                  padding: "1.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.75rem",
                  backgroundColor: "#f9f9f9",
                  marginBottom: "1rem"
                }}>
                  <label style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#333"
                  }}>
                    Company Website
                  </label>
                  <input
                    type="url"
                    placeholder="e.g., https://techcorp.com"
                    value={companyWebsite}
                    onChange={(e) => {
                      setCompanyWebsite(e.target.value);
                      setErrors({ ...errors, companyWebsite: "" });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#000"}
                    onBlur={(e) => e.target.style.borderColor = "#ddd"}
                  />
                </div>

                <div style={{
                  padding: "1.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.75rem",
                  backgroundColor: "#f9f9f9",
                  marginBottom: "1rem"
                }}>
                  <label style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#333"
                  }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +91 9999999999"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors({ ...errors, phone: "" });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: errors.phone ? "2px solid #dc2626" : "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      if (!errors.phone) e.target.style.borderColor = "#000";
                    }}
                    onBlur={(e) => {
                      if (!errors.phone) e.target.style.borderColor = "#ddd";
                    }}
                  />
                  {errors.phone && (
                    <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div style={{
                  padding: "1rem",
                  backgroundColor: "#fef3c7",
                  borderRadius: "0.5rem",
                  border: "1px solid #fcd34d",
                  color: "#92400e",
                  fontSize: "0.9rem"
                }}>
                  Your profile is pending admin approval. You'll receive an email confirmation once approved.
                </div>
              </div>
            )}

            <button
              onClick={submit}
              disabled={loading || !name || !role}
              style={{
                width: "100%",
                padding: "0.75rem 2rem",
                backgroundColor: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: loading || !name || !role ? "not-allowed" : "pointer",
                opacity: loading || !name || !role ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem"
              }}
            >
              {loading ? "Creating Profile..." : "Continue to Dashboard"}
              {!loading && <ArrowRight style={{ width: "1rem", height: "1rem" }} />}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
