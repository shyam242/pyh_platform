"use client";

import { useEffect, useState } from "react";
import ReferrerDashboard from "@/components/ReferrerDashboard";
import RecruiterDashboard from "@/components/RecruiterDashboard";
import CandidateDashboard from "@/components/CandidateDashboard";

export default function DashboardRouter() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/signin";
      return;
    }

    try {
      // ✅ SAFE JWT decode (fixes your atob error)
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
    } catch (err) {
      console.log("Invalid token");
      localStorage.removeItem("token");
      window.location.href = "/signin";
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 Loading UI SAME STYLE AS HOME PAGE
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

  // 🔥 ROLE BASED RENDER
  return (
    <div style={{ backgroundColor: "#fff", minHeight: "100vh" }}>
      {/* Navbar SAME AS HOME */}
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
              background: "transparent",
              cursor: "pointer",
            }}
          >
            PickYourHire
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/signin";
            }}
            style={{
              padding: "0.6rem 1.5rem",
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* DASHBOARD CONTENT */}
      <div style={{ paddingTop: "6rem", maxWidth: "1200px", margin: "0 auto", padding: "6rem 1.5rem 2rem" }}>
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
