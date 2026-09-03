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
      borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", height: "100%",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
          {getInitials(c.name)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} onClick={goToProfile}>{c.name}</div>
            {st && (
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}`, flexShrink: 0, whiteSpace: "nowrap" }}>
                {c.myStatus}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.role || c.current_role || c.job_role || "—"}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10.5, color: "#94a3b8", marginTop: 8 }}>
        {c.experience && <span>{c.experience} yrs exp</span>}
        {c.current_location && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10} />{c.current_location}</span>}
        {c.expected_ctc && <span style={{ display: "flex", alignItems: "center", gap: 2 }}><IndianRupee size={10} />{c.expected_ctc} LPA</span>}
      </div>

      {skills.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
          {skills.slice(0, 3).map((s, i) => (
            <span key={i} style={{ fontSize: 10, backgroundColor: "#EFF6FF", color: "#1d4ed8", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{s}</span>
          ))}
          {skills.length > 3 && <span style={{ fontSize: 10, color: "#94a3b8" }}>+{skills.length - 3}</span>}
        </div>
      )}

      {c.referrer_name && (
        <div style={{ backgroundColor: O_LITE, borderRadius: 8, padding: "6px 10px", marginTop: 8 }}>
          <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Referred by</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a" }}>{c.referrer_name}</div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "#94a3b8", marginTop: 8 }}>
        <Calendar size={10} />{dateLabel} {fmtDate(c.created_at || c.upload_date)}
      </div>
      {extraMeta}

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 10, borderTop: `1px dashed ${BORDER}`, flexWrap: "wrap" }}>
        <button onClick={goToProfile} style={btnStyle("#fff", "#334155", BORDER)}>View</button>
        <button onClick={() => actions?.onDownload?.(c)} style={{ ...btnStyle("#fff", "#334155", BORDER), display: "flex", alignItems: "center", gap: 4 }}>
          <Download size={11} /> CV
        </button>
        {actions?.buttons?.map(b => (
          <button key={b.label} onClick={() => b.onClick(c)} style={btnStyle(b.bg, b.color, b.border)}>{b.label}</button>
        ))}
      </div>
    </div>
  );
}

const btnStyle = (bg, color, border) => ({
  padding: "6px 10px", borderRadius: 7, border: `1.5px solid ${border}`, backgroundColor: bg,
  color, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
});
