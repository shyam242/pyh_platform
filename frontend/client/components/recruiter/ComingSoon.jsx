"use client";

import { BORDER, O, O_LITE } from "./RecruiterSidebarLayout";

export default function ComingSoon({ title, description, Icon }) {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>{title}</h1>
      <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>{description}</p>
      <div style={{
        backgroundColor: "#fff", border: `1.5px dashed ${BORDER}`, borderRadius: 16,
        padding: "64px 24px", textAlign: "center",
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {Icon && <Icon size={26} />}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>This page is being rebuilt</div>
        <p style={{ fontSize: 13.5, color: "#94a3b8", maxWidth: 380, margin: "0 auto" }}>
          We're rolling out the new recruiter portal page by page — this section is coming next.
          In the meantime this data still lives on the classic dashboard.
        </p>
      </div>
    </div>
  );
}
