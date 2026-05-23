"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, X } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import ReferrerDashboard from "@/components/ReferrerDashboard";
import RecruiterDashboard from "@/components/RecruiterDashboard";
import CandidateDashboard from "@/components/CandidateDashboard";

export default function DashboardRouter() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [stats, setStats] = useState({
    totalReferred: 0,
    successfulJoinings: 0,
    totalIncentives: 0
  });
  const [bankDetails, setBankDetails] = useState({ account_number: "", ifsc_code: "" });
  const [editingBank, setEditingBank] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ name: "", company: "", experience: "" });
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/signin";
      return;
    }

    try {
      const base64Payload = token.split(".")[1];
      const payload = JSON.parse(
        decodeURIComponent(
          atob(base64Payload)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        )
      );

      setRole(payload.role);
      if (payload.role === "admin") {
        window.location.href = "/admin";
        return;
      }

      fetchUserData(token);
    } catch (err) {
      console.log("Invalid token");
      localStorage.removeItem("token");
      window.location.href = "/signin";
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      const res = await fetch("http://localhost:5000/api/profile/user", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const error = await res.json();
        if (error.error === "TOKEN_INVALID") {
          showError("Session expired. Please sign in again.");
          localStorage.removeItem("token");
          window.location.href = "/signin";
          return;
        }
      }
      
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
  };

  const fetchStats = async (token) => {
    try {
      const res = await fetch("http://localhost:5000/api/referral/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const error = await res.json();
        if (error.error === "TOKEN_INVALID") {
          showError("Session expired. Please sign in again.");
          localStorage.removeItem("token");
          window.location.href = "/signin";
          return;
        }
      }
      
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchBankDetails = async (token) => {
    try {
      const res = await fetch("http://localhost:5000/api/profile/bank-details", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const error = await res.json();
        if (error.error === "TOKEN_INVALID") {
          showError("Session expired. Please sign in again.");
          localStorage.removeItem("token");
          window.location.href = "/signin";
          return;
        }
      }
      
      if (res.ok) {
        const data = await res.json();
        setBankDetails({
          account_number: data.account_number || "",
          ifsc_code: data.ifsc_code || ""
        });
      }
    } catch (err) {
      console.error("Failed to fetch bank details:", err);
    }
  };

  const handleProfileClick = async () => {
    const token = localStorage.getItem("token");
    if (!showProfilePanel) {
      // Fetch stats and bank details when opening panel
      if (role === "referrer") {
        await fetchStats(token);
        await fetchBankDetails(token);
      }
    }
    setShowProfilePanel(!showProfilePanel);
  };

  const handleSaveBankDetails = async () => {
    if (!bankDetails.account_number || !bankDetails.ifsc_code) {
      showError("Please fill in all bank details");
      return;
    }

    setBankLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/profile/bank-details", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bankDetails)
      });

      if (res.ok) {
        showSuccess("Bank details saved successfully");
        setEditingBank(false);
      } else {
        const error = await res.json();
        showError(error.error || "Failed to save bank details");
      }
    } catch (err) {
      showError("Error saving bank details");
      console.error(err);
    } finally {
      setBankLoading(false);
    }
  };

  const handleEditProfile = () => {
    setProfileFormData({
      name: userData?.name || "",
      company: userData?.company || "",
      experience: userData?.experience || ""
    });
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!profileFormData.name) {
      showError("Name is required");
      return;
    }

    setProfileLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/profile/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileFormData.name,
          company: profileFormData.company || undefined,
          experience: profileFormData.experience ? parseInt(profileFormData.experience) : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setUserData(data.user);
        showSuccess("Profile updated successfully");
        setEditingProfile(false);
      } else {
        const error = await res.json();
        showError(error.error || "Failed to update profile");
      }
    } catch (err) {
      showError("Error updating profile");
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/signin";
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{
            width: "2rem",
            height: "2rem",
            border: "3px solid #000",
            borderTop: "3px solid transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#fff", minHeight: "100vh" }}>
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
          <a
            href="/"
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#000",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            PICKYOURHIRE
          </a>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
            {/* User Profile Button - Simple icon + name */}
            <button
              onClick={handleProfileClick}
              style={{
                background: "#fff",
                backgroundColor: "#fff",
                color: "#333",
                border: "1px solid #ddd",
                borderColor: "#ddd",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "6px",
                transition: "all 0.2s",
              }}
              className="profile-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
                e.currentTarget.style.borderColor = "#1e88e5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#fff";
                e.currentTarget.style.borderColor = "#ddd";
              }}
              title="Profile"
            >
              <User size={20} style={{ color: "#1e88e5" }} />
              <span style={{ color: "#333", fontSize: "14px", fontWeight: "500" }}>
                {userData?.name || "Profile"}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Profile Panel Overlay */}
      {showProfilePanel && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 40,
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={() => setShowProfilePanel(false)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              width: "100%",
              maxWidth: "450px",
              height: "100vh",
              overflowY: "auto",
              boxShadow: "-2px 0 8px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowProfilePanel(false)}
              style={{
                alignSelf: "flex-end",
                background: "none",
                border: "none",
                padding: "1rem",
                cursor: "pointer",
                color: "#666",
              }}
            >
              <X size={24} />
            </button>

            {/* Profile Content */}
            <div style={{ padding: "0 2rem 2rem" }}>
              {/* User Avatar and Name */}
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    backgroundColor: "#e3f2fd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                  }}
                >
                  <User size={40} style={{ color: "#1e88e5" }} />
                </div>
                <h2 style={{ margin: "0 0 0.5rem", color: "#333" }}>{userData?.name}</h2>
                <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                  {role?.toUpperCase()}
                </p>
              </div>

              {/* User Details */}
              <div style={{ marginBottom: "2rem", borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ color: "#333", fontSize: "14px", fontWeight: "600", margin: 0 }}>
                    Profile Details
                  </h3>
                  {!editingProfile && (
                    <button
                      onClick={handleEditProfile}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#1e88e5",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingProfile ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", color: "#666", fontSize: "12px", marginBottom: "4px" }}>
                        Name
                      </label>
                      <input
                        type="text"
                        value={profileFormData.name}
                        onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                        placeholder="Enter your name"
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    {role === "referrer" && (
                      <>
                        <div>
                          <label style={{ display: "block", color: "#666", fontSize: "12px", marginBottom: "4px" }}>
                            Company
                          </label>
                          <input
                            type="text"
                            value={profileFormData.company}
                            onChange={(e) => setProfileFormData({ ...profileFormData, company: e.target.value })}
                            placeholder="Enter your company"
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              fontSize: "14px",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", color: "#666", fontSize: "12px", marginBottom: "4px" }}>
                            Experience (years)
                          </label>
                          <input
                            type="number"
                            value={profileFormData.experience}
                            onChange={(e) => setProfileFormData({ ...profileFormData, experience: e.target.value })}
                            placeholder="Enter years of experience"
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              fontSize: "14px",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </>
                    )}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={handleSaveProfile}
                        disabled={profileLoading}
                        style={{
                          flex: 1,
                          padding: "8px",
                          backgroundColor: "#1e88e5",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: profileLoading ? "not-allowed" : "pointer",
                          fontSize: "14px",
                          opacity: profileLoading ? 0.6 : 1,
                        }}
                      >
                        {profileLoading ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingProfile(false)}
                        style={{
                          flex: 1,
                          padding: "8px",
                          backgroundColor: "#f5f5f5",
                          color: "#333",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <p style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>Email</p>
                      <p style={{ color: "#333", margin: 0 }}>{userData?.email}</p>
                    </div>
                    {userData?.company && (
                      <div>
                        <p style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>Company</p>
                        <p style={{ color: "#333", margin: 0 }}>{userData.company}</p>
                      </div>
                    )}
                    {userData?.experience && (
                      <div>
                        <p style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>Experience</p>
                        <p style={{ color: "#333", margin: 0 }}>{userData.experience} years</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stats for Referrer */}
              {role === "referrer" && (
                <div style={{ marginBottom: "2rem", borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
                  <h3 style={{ color: "#333", fontSize: "14px", fontWeight: "600", marginBottom: "1rem" }}>
                    Referral Stats
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div
                      style={{
                        backgroundColor: "#f5f5f5",
                        padding: "12px",
                        borderRadius: "6px",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>Total Referrals</p>
                      <p style={{ color: "#1e88e5", fontSize: "20px", fontWeight: "bold", margin: 0 }}>
                        {stats.totalReferred}
                      </p>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#f5f5f5",
                        padding: "12px",
                        borderRadius: "6px",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>Successful</p>
                      <p style={{ color: "#4caf50", fontSize: "20px", fontWeight: "bold", margin: 0 }}>
                        {stats.successfulJoinings}
                      </p>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#f5f5f5",
                        padding: "12px",
                        borderRadius: "6px",
                        textAlign: "center",
                        gridColumn: "1 / -1",
                      }}
                    >
                      <p style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>Total Incentives</p>
                      <p style={{ color: "#ff9800", fontSize: "20px", fontWeight: "bold", margin: 0 }}>
                        ₹{stats.totalIncentives}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Details for Referrer */}
              {role === "referrer" && (
                <div style={{ marginBottom: "2rem", borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ color: "#333", fontSize: "14px", fontWeight: "600", margin: 0 }}>
                      Bank Details
                    </h3>
                    {!editingBank && (
                      <button
                        onClick={() => setEditingBank(true)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#1e88e5",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {editingBank ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div>
                        <label style={{ display: "block", color: "#666", fontSize: "12px", marginBottom: "4px" }}>
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={bankDetails.account_number}
                          onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                          placeholder="Enter account number"
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", color: "#666", fontSize: "12px", marginBottom: "4px" }}>
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          value={bankDetails.ifsc_code}
                          onChange={(e) => setBankDetails({ ...bankDetails, ifsc_code: e.target.value })}
                          placeholder="Enter IFSC code"
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={handleSaveBankDetails}
                          disabled={bankLoading}
                          style={{
                            flex: 1,
                            padding: "8px",
                            backgroundColor: "#1e88e5",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: bankLoading ? "not-allowed" : "pointer",
                            fontSize: "14px",
                            opacity: bankLoading ? 0.6 : 1,
                          }}
                        >
                          {bankLoading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingBank(false)}
                          style={{
                            flex: 1,
                            padding: "8px",
                            backgroundColor: "#f5f5f5",
                            color: "#333",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div>
                        <p style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>Account Number</p>
                        <p style={{ color: "#333", margin: 0, fontWeight: "500" }}>
                          {bankDetails.account_number || "Not added"}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>IFSC Code</p>
                        <p style={{ color: "#333", margin: 0, fontWeight: "500" }}>
                          {bankDetails.ifsc_code || "Not added"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Logout Button in Panel */}
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#d32f2f",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginTop: "1rem",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD CONTENT */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 1.5rem 2rem" }}>
        {role === "referrer" && <ReferrerDashboard />}
        {role === "recruiter" && <RecruiterDashboard />}
        {role === "candidate" && <CandidateDashboard />}

        {!role && (
          <p style={{ textAlign: "center", color: "#666" }}>
            Invalid role. Please sign in again.
          </p>
        )}
      </div>
    </div>
  );
}
