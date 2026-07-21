"use client";

import { useRouter } from "next/navigation";
import { MapPin, Download, IndianRupee, Calendar } from "lucide-react";
import { BORDER, O, O_LITE } from "./RecruiterSidebarLayout";

const getInitials = name => !name ? "?" : name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

const AVATAR_COLORS = [
  ["#EFF6FF", "#1d4ed8"], ["#F3E8FF", "#7c3aed"], ["#DCFCE7", "#15803d"],
  ["#FFF7ED", "#C2410C"], ["#FDF2F8", "#DB2777"], ["#F0FDFA", "#0D9488"],
];
const avatarColor = name => AVATAR_COLORS[(name || "?").charCodeAt(0) % AVATAR_COLORS.length];

const STATUS_STYLE = {
  "Shortlisted":  { bg: "#EFF6FF", color: "#1d4ed8", border: "#BFDBFE" },
  "In Process":   { bg: "#F3E8FF", color: "#7c3aed", border: "#DDD6FE" },
  "On Hold":      { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
  "Offer Given":  { bg: "#DCFCE7", color: "#15803d", border: "#86efac" },
  "Rejected":     { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
};
const BORDER_COLOR = {
  "Shortlisted": "#16A34A", "In Process": "#7c3aed", "On Hold": "#D97706",
  "Offer Given": "#15803d", "Rejected": "#DC2626", default: "#CBD5E1",
};

const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function CandidateCard({ candidate: c, actions, dateLabel = "Added on", extraMeta }) {
  const router = useRouter();
  const [bg, fg] = avatarColor(c.name);
  const st = c.myStatus ? STATUS_STYLE[c.myStatus] : null;
  const borderColor = c.myStatus ? BORDER_COLOR[c.myStatus] : BORDER_COLOR.default;
  const skills = (c.skills || "").split(",").map(s => s.trim()).filter(Boolean);

  const goToProfile = () => router.push(c.is_bulk ? `/bulk-candidates/${c.id}` : `/candidate-details/${c.id}`);

  return (
    <div style={{
      backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderLeft: `4px solid ${borderColor}`,
      borderRadius: 14, padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        {/* Avatar + core info */}
        <div style={{ display: "flex", gap: 12, minWidth: 220, flex: "1 1 240px" }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
            {getInitials(c.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 3, cursor: "pointer" }} onClick={goToProfile}>{c.name}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{c.role || c.current_role || c.job_role || "—"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11.5, color: "#94a3b8" }}>
              {c.experience && <span>{c.experience} yrs exp</span>}
              {c.current_location && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={11} />{c.current_location}</span>}
              {c.expected_ctc && <span style={{ display: "flex", alignItems: "center", gap: 2 }}><IndianRupee size={11} />{c.expected_ctc} LPA expected</span>}
            </div>
            {skills.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>
                {skills.slice(0, 5).map((s, i) => (
                  <span key={i} style={{ fontSize: 10.5, backgroundColor: "#EFF6FF", color: "#1d4ed8", padding: "2px 9px", borderRadius: 6, fontWeight: 600 }}>{s}</span>
                ))}
                {skills.length > 5 && <span style={{ fontSize: 10.5, color: "#94a3b8" }}>+{skills.length - 5}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Referral box — only ever shown when the candidate was actually referred */}
        {c.referrer_name && (
          <div style={{ minWidth: 170, flex: "0 0 auto" }}>
            <div style={{ backgroundColor: O_LITE, borderRadius: 10, padding: "8px 12px" }}>
              <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Referred by</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>{c.referrer_name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.referrer_company || ""}</div>
            </div>
          </div>
        )}

        {/* Date added */}
        <div style={{ minWidth: 140, flex: "0 0 auto", fontSize: 11.5, color: "#94a3b8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}><Calendar size={11} />{dateLabel} {fmtDate(c.created_at || c.upload_date)}</div>
          {extraMeta}
        </div>

        {/* Status badge */}
        {st && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}`, flexShrink: 0 }}>
            {c.myStatus}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${BORDER}`, flexWrap: "wrap" }}>
        <button onClick={goToProfile} style={btnStyle("#fff", "#334155", BORDER)}>View Profile</button>
        <button onClick={() => actions?.onDownload?.(c)} style={{ ...btnStyle("#fff", "#334155", BORDER), display: "flex", alignItems: "center", gap: 5 }}>
          <Download size={12} /> Download CV
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {actions?.buttons?.map(b => (
            <button key={b.label} onClick={() => b.onClick(c)} style={btnStyle(b.bg, b.color, b.border)}>{b.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

const btnStyle = (bg, color, border) => ({
  padding: "7px 16px", borderRadius: 8, border: `1.5px solid ${border}`, backgroundColor: bg,
  color, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
});
