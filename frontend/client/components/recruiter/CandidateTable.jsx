"use client";

import { useRouter } from "next/navigation";
import { BORDER, O_LITE } from "./RecruiterSidebarLayout";

const getInitials = name => !name ? "?" : name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

const AVATAR_COLORS = [
  ["#EFF6FF", "#1d4ed8"], ["#F3E8FF", "#7c3aed"], ["#DCFCE7", "#15803d"],
  ["#FFF7ED", "#C2410C"], ["#FDF2F8", "#DB2777"], ["#F0FDFA", "#0D9488"],
];
const avatarColor = name => AVATAR_COLORS[(name || "?").charCodeAt(0) % AVATAR_COLORS.length];

const STATUS_STYLE = {
  "Shortlisted":  { bg: "#EFF6FF", color: "#1d4ed8" },
  "In Process":   { bg: "#F3E8FF", color: "#7c3aed" },
  "On Hold":      { bg: "#FFF7ED", color: "#C2410C" },
  "Offer Given":  { bg: "#DCFCE7", color: "#15803d" },
  "Rejected":     { bg: "#FEF2F2", color: "#DC2626" },
};

const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function CandidateTable({ candidates, columns, actions }) {
  const router = useRouter();
  const goToProfile = c => router.push(c.is_bulk ? `/bulk-candidates/${c.id}` : `/candidate-details/${c.id}`);

  return (
    <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: columns.gridTemplate, gap: 12, padding: "12px 20px", backgroundColor: "#F8FAFC", borderBottom: `1.5px solid ${BORDER}` }}>
        {columns.headers.map(h => (
          <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
        ))}
      </div>

      {candidates.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center", fontSize: 13.5, color: "#94a3b8" }}>No candidates in this stage yet.</div>
      ) : candidates.map(c => {
        const [bg, fg] = avatarColor(c.name);
        const st = c.myStatus ? STATUS_STYLE[c.myStatus] : null;
        const skills = (c.skills || "").split(",").map(s => s.trim()).filter(Boolean);
        return (
          <div key={`${c.source}:${c.id}`} style={{ display: "grid", gridTemplateColumns: columns.gridTemplate, gap: 12, padding: "14px 20px", borderBottom: `1px solid #F8FAFC`, alignItems: "center" }}>
            {/* Candidate col */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0, cursor: "pointer" }} onClick={() => goToProfile(c)}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {getInitials(c.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.role || c.job_role || "—"} {c.current_location ? `· ${c.current_location}` : ""}
                </div>
                {skills.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                    {skills.slice(0, 3).map((s, i) => (
                      <span key={i} style={{ fontSize: 9.5, backgroundColor: "#EFF6FF", color: "#1d4ed8", padding: "1.5px 7px", borderRadius: 5, fontWeight: 600 }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date col */}
            <span style={{ fontSize: 12.5, color: "#475569" }}>{fmtDate(c.myStatusUpdatedAt || c.created_at)}</span>

            {/* Source col */}
            <span style={{ fontSize: 12.5, color: "#475569" }}>{c.sourceLabel}</span>

            {/* Status / reason col */}
            {columns.showReason ? (
              <span style={{ fontSize: 12.5, color: "#475569" }}>{c.holdReason || "—"}</span>
            ) : (
              st && <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 999, backgroundColor: st.bg, color: st.color, width: "fit-content" }}>{c.myStatus}</span>
            )}

            {/* Actions col */}
            <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
              <button onClick={() => goToProfile(c)} style={tblBtn("#fff", "#334155", BORDER)}>View Profile</button>
              {actions.map(a => (
                <button key={a.label} onClick={() => a.onClick(c)} style={tblBtn(a.bg, a.color, a.border)}>{a.label}</button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const tblBtn = (bg, color, border) => ({
  padding: "6px 12px", borderRadius: 7, border: `1.5px solid ${border}`, backgroundColor: bg,
  color, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
});
