"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

export default function AcceptReferral() {
  const params = useParams();
  const referralId = params?.referralId;
  
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
  });

  useEffect(() => {
    if (!referralId) return;
    
    fetchReferralDetails();
  }, [referralId]);

  const fetchReferralDetails = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/referral/${referralId}`);
      if (!res.ok) throw new Error("Failed to fetch referral");
      
      const data = await res.json();
      setReferral(data);
      setFormData({
        name: data.name,
        email: data.email,
        phone: data.phone,
        linkedin: data.linkedin,
      });
    } catch (err) {
      showError(err.message || "Failed to fetch referral details");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/referral/${referralId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to accept referral");
      }

      showSuccess("Referral accepted! The recruiter will review your profile.");
      setAccepting(false);
      setEditMode(false);
      
      // Clear old token to avoid JWT signature mismatch
      localStorage.removeItem("token");
      
      setTimeout(() => {
        // Redirect to create profile (they need to set up their account first)
        window.location.href = "/create-profile";
      }, 2000);
    } catch (err) {
      showError(err.message || "Failed to accept referral");
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1rem", color: "#666" }}>Loading referral details...</div>
      </div>
    );
  }

  if (!referral) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle style={{ width: "3rem", height: "3rem", margin: "0 auto 1rem", color: "#dc2626" }} />
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#dc2626", marginBottom: "1rem" }}>Referral Not Found</h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>This referral link may have expired or is invalid.</p>
          <a
            href="/"
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: "#000",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "0.5rem",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#1f2937"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#000"}
          >
            Go to Home
            <ArrowRight style={{ width: "1rem", height: "1rem" }} />
          </a>
        </div>
      </div>
    );
  }

  if (referral.candidate_accepted) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#fff", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: "500px", textAlign: "center" }}>
          <CheckCircle2 style={{ width: "4rem", height: "4rem", margin: "0 auto 1.5rem", color: "#16a34a" }} />
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#000", marginBottom: "0.5rem" }}>Already Accepted!</h1>
          <p style={{ color: "#666", marginBottom: "2rem", lineHeight: "1.6" }}>
            You have already accepted this referral. The recruiter will review your profile shortly.
          </p>
          <a
            href="/dashboard"
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: "#000",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "0.5rem",
              fontWeight: "600",
              display: "inline-block",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#1f2937"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#000"}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#000", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        
        {/* HEADER */}
        <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
            Great News! 🎉
          </h1>
          <p style={{ fontSize: "1rem", color: "#666", lineHeight: "1.6" }}>
            You've been referred for an exciting opportunity
          </p>
        </div>

        {/* JOB DETAILS CARD */}
        <div style={{
          backgroundColor: "#f9f9f9",
          borderRadius: "0.75rem",
          border: "1px solid #ddd",
          padding: "1.5rem",
          marginBottom: "1.5rem"
        }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem", color: "#000" }}>Job Details</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem"
          }}>
            <div>
              <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.25rem" }}>Company</p>
              <p style={{ fontSize: "1rem", fontWeight: "600", color: "#000" }}>{referral.company}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.25rem" }}>Experience Required</p>
              <p style={{ fontSize: "1rem", fontWeight: "600", color: "#000" }}>{referral.experience} years</p>
            </div>
          </div>
        </div>

        {/* YOUR INFORMATION CARD */}
        <div style={{
          backgroundColor: "#f9f9f9",
          borderRadius: "0.75rem",
          border: "1px solid #ddd",
          padding: "1.5rem",
          marginBottom: "1.5rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#000" }}>Your Information</h2>
            <button
              onClick={() => setEditMode(!editMode)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: editMode ? "#16a34a" : "#f3f4f6",
                color: editMode ? "#fff" : "#000",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = editMode ? "#15803d" : "#e5e7eb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = editMode ? "#16a34a" : "#f3f4f6";
              }}
            >
              {editMode ? "Done Editing" : "Edit Info"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Name */}
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!editMode}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: editMode ? "#fff" : "#f3f4f6",
                  cursor: editMode ? "text" : "not-allowed",
                  opacity: editMode ? 1 : 0.7,
                  transition: "all 0.3s"
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!editMode}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: editMode ? "#fff" : "#f3f4f6",
                  cursor: editMode ? "text" : "not-allowed",
                  opacity: editMode ? 1 : 0.7,
                  transition: "all 0.3s"
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!editMode}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: editMode ? "#fff" : "#f3f4f6",
                  cursor: editMode ? "text" : "not-allowed",
                  opacity: editMode ? 1 : 0.7,
                  transition: "all 0.3s"
                }}
              />
            </div>

            {/* LinkedIn */}
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#333" }}>
                LinkedIn Profile
              </label>
              <input
                type="url"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                disabled={!editMode}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #ddd",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: editMode ? "#fff" : "#f3f4f6",
                  cursor: editMode ? "text" : "not-allowed",
                  opacity: editMode ? 1 : 0.7,
                  transition: "all 0.3s"
                }}
              />
            </div>
          </div>
        </div>

        {/* WHAT HAPPENS NEXT */}
        <div style={{
          backgroundColor: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          marginBottom: "2rem"
        }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "#1e40af", marginBottom: "1rem" }}>What Happens Next?</h3>
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <li style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", color: "#0c4a6e", fontSize: "0.95rem" }}>
              <span style={{ fontWeight: "bold", marginTop: "0.125rem" }}>✓</span>
              <span>Once you accept, the recruiter will review your profile</span>
            </li>
            <li style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", color: "#0c4a6e", fontSize: "0.95rem" }}>
              <span style={{ fontWeight: "bold", marginTop: "0.125rem" }}>✓</span>
              <span>You'll receive updates on your referral status</span>
            </li>
            <li style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", color: "#0c4a6e", fontSize: "0.95rem" }}>
              <span style={{ fontWeight: "bold", marginTop: "0.125rem" }}>✓</span>
              <span>If shortlisted, you'll be contacted for an interview</span>
            </li>
          </ul>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem"
        }}>
          <button
            onClick={handleAccept}
            disabled={accepting}
            style={{
              padding: "1rem",
              backgroundColor: accepting ? "#9ca3af" : "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: accepting ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
            onMouseEnter={(e) => { if (!accepting) e.target.style.backgroundColor = "#15803d"; }}
            onMouseLeave={(e) => { if (!accepting) e.target.style.backgroundColor = "#16a34a"; }}
          >
            <CheckCircle2 style={{ width: "1rem", height: "1rem" }} />
            {accepting ? "Accepting..." : "Accept Referral"}
          </button>

          <button
            onClick={() => window.history.back()}
            style={{
              padding: "1rem",
              backgroundColor: "#f3f4f6",
              color: "#000",
              border: "1px solid #ddd",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#e5e7eb"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#f3f4f6"}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
