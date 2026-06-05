"use client";
import { useState, useEffect } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { Upload, ArrowRight, User, Phone, Briefcase, Award } from "lucide-react";
import { API_BASE_URL } from "@/utils/api";

export default function ReferralForm(){
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    experience: "",
    company: "",
    industry: "",
    department: "",
    linkedin: "",
    skills: "",
    cv: null,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.log("Could not fetch user info");
    }
  };

  const submit = async() => {
    try {
      setLoading(true);
      
      // Validate form
      if (!form.name || !form.email || !form.phone || !form.experience || !form.company || !form.skills || !form.cv) {
        showError("Please fill in all required fields");
        return;
      }

      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("experience", form.experience);
      formData.append("company", form.company);
      formData.append("industry", form.industry || "");
      formData.append("department", form.department || "");
      formData.append("linkedin", form.linkedin || "");
      formData.append("skills", form.skills);
      formData.append("cv", form.cv);

      const response = await fetch(`${API_BASE_URL}/api/referral/create`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token
        },
        body: formData
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to submit referral");
      }

      showSuccess("Referral submitted successfully!");
      setForm({
        name: "",
        email: "",
        phone: "",
        experience: "",
        company: "",
        industry: "",
        department: "",
        linkedin: "",
        skills: "",
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
        padding: "1rem 0",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <a
            href="/"
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#000",
              textDecoration: "none",
              cursor: "pointer"
            }}
          >
            PICKYOURHIRE
          </a>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            style={{
              padding: "0.75rem 1.75rem",
              backgroundColor: "#f97316",
              color: "#fff",
              border: "none",
              borderRadius: "999px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 12px 24px rgba(249, 115, 22, 0.18)"
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
          <div style={{ maxWidth: "1000px", width: "100%", display: "grid", gridTemplateColumns: "1fr 350px", gap: "2rem" }}>
            {/* Left - Form */}
            <div>
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
                      Phone (10 digits) <span style={{ color: "#dc2626" }}>*</span>
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
                      Experience (years) <span style={{ color: "#dc2626" }}>*</span>
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
                    Current Company <span style={{ color: "#dc2626" }}>*</span>
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

                {/* Two Column - Industry and Department */}
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
                      Industry
                    </label>
                    <input 
                      placeholder="e.g. Technology, Finance"
                      value={form.industry}
                      onChange={e => setForm({...form, industry: e.target.value})}
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
                      Department
                    </label>
                    <input 
                      placeholder="e.g. Engineering, Sales"
                      value={form.department}
                      onChange={e => setForm({...form, department: e.target.value})}
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
                    Skills <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input 
                    placeholder="e.g. JavaScript, React, Node.js (comma separated)"
                    value={form.skills}
                    onChange={e => setForm({...form, skills: e.target.value})}
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
                    backgroundColor: "#f97316",
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
                      e.target.style.backgroundColor = "#ea580c";
                      e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                      e.target.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#f97316";
                    e.target.style.boxShadow = "none";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  {loading ? "Submitting..." : "Submit Referral"}
                  {!loading && <ArrowRight style={{ width: "1rem", height: "1rem" }} />}
                </button>
              </div>
            </div>

            {/* Right - Profile Card */}
            {user && (
              <div style={{
                position: "sticky",
                top: "6rem",
                height: "fit-content"
              }}>
                <div style={{
                  background: "#f9f9f9",
                  borderRadius: "0.75rem",
                  border: "1px solid #ddd",
                  padding: "1.5rem",
                  textAlign: "center"
                }}>
                  <div style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "#f97316",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                    color: "white"
                  }}>
                    <User size={40} />
                  </div>
                  
                  <h3 style={{
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    margin: "0 0 0.5rem 0",
                    color: "#333"
                  }}>
                    {user.name || "Your Profile"}
                  </h3>

                  <p style={{
                    fontSize: "0.85rem",
                    color: "#666",
                    margin: "0 0 1.5rem 0"
                  }}>
                    Referrer
                  </p>

                  {/* Profile Details */}
                  <div style={{
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid #ddd"
                  }}>
                    {user.phone && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem"
                      }}>
                        <Phone size={18} style={{ color: "#f97316", flexShrink: 0 }} />
                        <div>
                          <p style={{
                            fontSize: "0.75rem",
                            color: "#999",
                            margin: 0,
                            fontWeight: "600"
                          }}>
                            Phone
                          </p>
                          <p style={{
                            fontSize: "0.9rem",
                            color: "#333",
                            margin: 0,
                            fontWeight: "600"
                          }}>
                            {user.phone}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.company && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem"
                      }}>
                        <Briefcase size={18} style={{ color: "#f97316", flexShrink: 0 }} />
                        <div>
                          <p style={{
                            fontSize: "0.75rem",
                            color: "#999",
                            margin: 0,
                            fontWeight: "600"
                          }}>
                            Company
                          </p>
                          <p style={{
                            fontSize: "0.9rem",
                            color: "#333",
                            margin: 0,
                            fontWeight: "600"
                          }}>
                            {user.company}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.experience && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem"
                      }}>
                        <Award size={18} style={{ color: "#f97316", flexShrink: 0 }} />
                        <div>
                          <p style={{
                            fontSize: "0.75rem",
                            color: "#999",
                            margin: 0,
                            fontWeight: "600"
                          }}>
                            Experience
                          </p>
                          <p style={{
                            fontSize: "0.9rem",
                            color: "#333",
                            margin: 0,
                            fontWeight: "600"
                          }}>
                            {user.experience} years
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
