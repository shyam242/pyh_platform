"use client";
import { useState } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { Upload, ArrowRight } from "lucide-react";

export default function ReferralForm(){

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    experience: "",
    company: "",
    linkedin: "",
    cv: null,
  });

  const [loading, setLoading] = useState(false);

  const submit = async() => {
    try {
      setLoading(true);
      
      // Validate form
      if (!form.name || !form.email) {
        showError("Please fill in required fields");
        return;
      }

      const token = localStorage.getItem("token");

      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (form[key]) {
          formData.append(key, form[key]);
        }
      });

      const response = await fetch("http://localhost:5000/api/referral/create", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Failed to submit referral");
      }

      showSuccess("Referral submitted successfully!");
      setForm({
        name: "",
        email: "",
        phone: "",
        experience: "",
        company: "",
        linkedin: "",
        cv: null,
      });
    } catch (error) {
      showError(error.message || "Error submitting referral");
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
            onClick={() => (window.location.href = "/dashboard")}
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
            Dashboard
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
            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
              <h1 style={{ 
                fontSize: "2.5rem", 
                fontWeight: "bold",
                marginBottom: "0.5rem" 
              }}>
                Refer Candidate
              </h1>
              <p style={{ 
                fontSize: "1rem", 
                color: "#666"
              }}>
                Help us find the best talent for great opportunities
              </p>
            </div>

            {/* Form Container */}
            <div style={{
              background: "#f9f9f9",
              borderRadius: "0.75rem",
              border: "1px solid #ddd",
              padding: "2rem"
            }}>
              {/* Full Width Fields */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "0.5rem"
                }}>
                  Candidate Name <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input 
                  placeholder="Full name"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    fontSize: "1rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#000"}
                  onBlur={(e) => e.target.style.borderColor = "#ddd"}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "0.5rem"
                }}>
                  Email Address <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input 
                  placeholder="email@example.com"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    fontSize: "1rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#000"}
                  onBlur={(e) => e.target.style.borderColor = "#ddd"}
                />
              </div>

              {/* Two Column Layout */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "1.5rem"
              }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#333",
                    marginBottom: "0.5rem"
                  }}>
                    Phone (10 digits)
                  </label>
                  <input 
                    placeholder="10 digit number"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      fontSize: "1rem",
                      border: "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#000"}
                    onBlur={(e) => e.target.style.borderColor = "#ddd"}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#333",
                    marginBottom: "0.5rem"
                  }}>
                    Experience (years)
                  </label>
                  <input 
                    placeholder="Years of experience"
                    type="number"
                    value={form.experience}
                    onChange={e => setForm({...form, experience: e.target.value})}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      fontSize: "1rem",
                      border: "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#000"}
                    onBlur={(e) => e.target.style.borderColor = "#ddd"}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "0.5rem"
                }}>
                  Current Company
                </label>
                <input 
                  placeholder="Company name"
                  value={form.company}
                  onChange={e => setForm({...form, company: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    fontSize: "1rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#000"}
                  onBlur={(e) => e.target.style.borderColor = "#ddd"}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "0.5rem"
                }}>
                  LinkedIn Profile URL
                </label>
                <input 
                  placeholder="https://linkedin.com/in/..."
                  value={form.linkedin}
                  onChange={e => setForm({...form, linkedin: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    fontSize: "1rem",
                    border: "1px solid #ddd",
                    borderRadius: "0.5rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#000"}
                  onBlur={(e) => e.target.style.borderColor = "#ddd"}
                />
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "0.5rem"
                }}>
                  Upload CV/Resume <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div 
                  style={{
                    border: "2px dashed #ddd",
                    borderRadius: "0.5rem",
                    padding: "2rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "#f9f9f9",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#000";
                    e.currentTarget.style.background = "#f3f3f3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#ddd";
                    e.currentTarget.style.background = "#f9f9f9";
                  }}
                  onClick={() => document.getElementById("cvInput").click()}
                >
                  <Upload style={{
                    width: "2rem",
                    height: "2rem",
                    margin: "0 auto 0.5rem",
                    color: "#999"
                  }} />
                  <p style={{ fontSize: "1rem", color: "#666", marginBottom: "0.25rem" }}>
                    Click to upload CV
                  </p>
                  <p style={{ fontSize: "0.85rem", color: "#999" }}>
                    PDF or DOC (max 5MB)
                  </p>
                </div>
                <input 
                  id="cvInput"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={e => setForm({...form, cv: e.target.files[0]})}
                  style={{ display: "none" }}
                />
                {form.cv && (
                  <p style={{ fontSize: "0.85rem", color: "#059669", marginTop: "0.5rem" }}>
                    ✓ {form.cv.name} selected
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button 
                onClick={submit}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.75rem 2rem",
                  background: "#000",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
                  opacity: loading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                    e.target.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = "none";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                {loading ? "Submitting..." : "Submit Referral"}
                {!loading && <ArrowRight style={{ width: "1rem", height: "1rem" }} />}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
