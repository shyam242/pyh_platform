"use client";

import { useEffect, useState } from "react";
import { showSuccess, showError } from "@/utils/toast";
import ReferrerDashboard from "@/components/ReferrerDashboard";
import RecruiterDashboard from "@/components/RecruiterDashboard";
import CandidateDashboard from "@/components/CandidateDashboard";

export default function DashboardRouter() {
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/signin"; return; }

    try {
      const base64Payload = token.split(".")[1];
      const payload = JSON.parse(
        decodeURIComponent(
          atob(base64Payload)
            .split("")
            .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        )
      );

      if (payload.role === "admin") { window.location.href = "/admin"; return; }
      setRole(payload.role);
    } catch {
      localStorage.removeItem("token");
      window.location.href = "/signin";
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <div style={{ width: "2rem", height: "2rem", border: "3px solid #E87722", borderTop: "3px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      {role === "referrer"  && <ReferrerDashboard />}
      {role === "recruiter" && <RecruiterDashboard />}
      {role === "candidate" && <CandidateDashboard />}
      {!role && (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 15 }}>
          Invalid role. Please sign in again.
        </div>
      )}
    </>
  );
}