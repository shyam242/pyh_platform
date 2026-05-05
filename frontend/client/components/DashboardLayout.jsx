"use client";

import { ArrowRight } from "lucide-react";

export default function DashboardLayout({ children, title, subtitle }) {
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

          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/signin";
            }}
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
