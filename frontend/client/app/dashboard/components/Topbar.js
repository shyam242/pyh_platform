"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, User } from "lucide-react";

export default function Topbar({ title = "Dashboard" }) {
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/signin";
  };

  return (
    <div
      style={{
        background: "white",
        padding: "20px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <h3 style={{ margin: 0 }}>{title}</h3>

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
              padding: "10px 14px",
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
            <User size={18} style={{ color: "#1e88e5", fontWeight: "bold" }} />
            <ChevronDown size={14} style={{ color: "#666" }} />
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
            padding: "8px 14px",
            backgroundColor: "#d32f2f",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "500",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#b71c1c")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#d32f2f")}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
