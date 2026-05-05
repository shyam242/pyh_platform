"use client";
import { LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Set initial mobile state
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/signin";
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#fff", color: "#000" }}>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          display: isMobile ? "block" : "none",
          position: "fixed",
          top: "1rem",
          left: "1rem",
          zIndex: 50,
          padding: "0.5rem",
          backgroundColor: "#f3f4f6",
          border: "none",
          borderRadius: "0.5rem",
          cursor: "pointer"
        }}
      >
        {sidebarOpen ? <X style={{ width: "1.5rem", height: "1.5rem" }} /> : <Menu style={{ width: "1.5rem", height: "1.5rem" }} />}
      </button>

      {/* SIDEBAR */}
      <div
        style={{
          position: isMobile && !sidebarOpen ? "fixed" : "relative",
          left: isMobile && !sidebarOpen ? "-18rem" : "0",
          top: 0,
          zIndex: 40,
          width: "18rem",
          height: "100vh",
          backgroundColor: "#f9f9f9",
          borderRight: "1px solid #ddd",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          transition: "all 0.3s ease",
          overflowY: "auto"
        }}
      >
        {/* Logo and Navigation */}
        <div>
          <h2 style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            marginBottom: "3rem",
            color: "#000"
          }}>
            PickYourHire
          </h2>

          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <a
              href="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                color: "#333",
                textDecoration: "none",
                transition: "all 0.3s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#333";
              }}
            >
              <LayoutDashboard style={{ width: "1.25rem", height: "1.25rem", color: "#000" }} />
              <span style={{ fontWeight: "500" }}>Dashboard</span>
            </a>
          </nav>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            width: "100%",
            padding: "0.75rem 1rem",
            backgroundColor: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#b91c1c";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#dc2626";
          }}
        >
          <LogOut style={{ width: "1.25rem", height: "1.25rem" }} />
          Logout
        </button>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Top Navbar for Mobile */}
        <div style={{
          display: isMobile ? "block" : "none",
          position: "sticky",
          top: 0,
          zIndex: 30,
          backgroundColor: "#f9f9f9",
          borderBottom: "1px solid #ddd",
          padding: "1.5rem",
          marginTop: "3rem"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#000" }}>Dashboard</h1>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          padding: "2rem",
          paddingTop: isMobile ? "2rem" : "2rem"
        }}>
          {children}
        </div>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && isMobile && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 30
          }}
        />
      )}
    </div>
  );
}
