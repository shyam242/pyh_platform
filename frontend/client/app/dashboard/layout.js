"use client";

import Topbar from "./components/Topbar";

export default function DashboardLayout({ children }) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#000" }}>
      <Topbar title="Dashboard" />
      <div style={{ padding: "2rem" }}>
        {children}
      </div>
    </div>
  );
}
