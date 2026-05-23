"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, User, ChevronDown } from "lucide-react";

export default function DashboardLayout({ children, title, subtitle }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/signin";
  };

  return (
    <div style={{ minHeight: "100%", backgroundColor: "#fff", color: "#000" }}>
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

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Profile Button */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{
                  background: "#f5f5f5",
                  border: "1px solid #ddd",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  transition: "all 0.2s",
                  backgroundColor: showProfileMenu ? "#e8f4f8" : "#f5f5f5",
                  borderColor: showProfileMenu ? "#1e88e5" : "#ddd",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#e8f4f8";
                  e.currentTarget.style.borderColor = "#1e88e5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = showProfileMenu ? "#e8f4f8" : "#f5f5f5";
                  e.currentTarget.style.borderColor = showProfileMenu ? "#1e88e5" : "#ddd";
                }}
                title="Profile Menu"
              >
                <User size={16} style={{ color: "#1e88e5" }} />
                <ChevronDown size={12} style={{ color: "#666" }} />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    minWidth: "180px",
                    marginTop: "8px",
                    zIndex: 1000,
                  }}
                >
                  <Link
                    href="/profile"
                    style={{
                      display: "block",
                      padding: "12px 16px",
                      color: "#333",
                      textDecoration: "none",
                      borderBottom: "1px solid #eee",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = "#f9f9f9")}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                    onClick={() => setShowProfileMenu(false)}
                  >
                    View Profile
                  </Link>
                  <Link
                    href="/edit-profile"
                    style={{
                      display: "block",
                      padding: "12px 16px",
                      color: "#333",
                      textDecoration: "none",
                      borderBottom: "1px solid #eee",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = "#f9f9f9")}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Edit Profile
                  </Link>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#d32f2f",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = "#ffebee")}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{
                padding: "0.75rem 2rem",
                backgroundColor: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main style={{ paddingTop: "6rem", padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          {title && (
            <div style={{ marginBottom: "2rem" }}>
              <h1
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                  marginBottom: "0.5rem",
                }}
              >
                {title}
              </h1>
              <p style={{ color: "#666" }}>{subtitle}</p>
            </div>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}
