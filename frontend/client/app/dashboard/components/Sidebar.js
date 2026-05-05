"use client";
import { motion } from "framer-motion";

export default function Sidebar() {
  return (
    <motion.div
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      style={{
        width: 260,
        background:
          "linear-gradient(180deg, #0A66C2, #004182)",
        color: "white",
        padding: 30,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
      }}
    >
      <div>
        <h2 style={{ marginBottom: 40, fontSize: 18, fontWeight: 700 }}>PickYourHire</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Nav label="Dashboard" href="/dashboard" />
          <Nav label="Referrals" href="/dashboard/referrals" />
          <Nav label="Verification" href="/dashboard/verification" />
          <Nav label="Analytics" href="/dashboard/analytics" />
        </nav>
      </div>
    </motion.div>
  );
}

const Nav = ({ label, href }) => (
  <a
    href={href}
    style={{
      cursor: "pointer",
      padding: "10px 12px",
      borderRadius: 6,
      opacity: 0.9,
      fontSize: 14,
      fontWeight: 500,
      color: "white",
      textDecoration: "none",
      transition: "background 0.2s",
      display: "block",
    }}
    onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
    onMouseLeave={(e) => e.target.style.background = "transparent"}
  >
    {label}
  </a>
);
