"use client";

import { useMemo, useState } from "react";
import { Search, Filter, Users, Star, CalendarCheck, PauseCircle } from "lucide-react";
import RecruiterSidebarLayout, { BORDER } from "@/components/recruiter/RecruiterSidebarLayout";
import CandidateTable from "@/components/recruiter/CandidateTable";
import { useRecruiterCandidates } from "@/components/recruiter/useRecruiterCandidates";

export default function OnHoldPage() {
  const { candidates, loading, setStatus } = useRecruiterCandidates();
  const [search, setSearch] = useState("");

  const onHold = useMemo(() => candidates.filter(c => c.myStatus === "On Hold"), [candidates]);

  const filtered = useMemo(() => {
    return onHold.filter(c => {
      if (!search) return true;
      const hay = [c.name, c.email, c.skills, c.role, c.current_location].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(search.toLowerCase());
    }).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [onHold, search]);

  const counts = useMemo(() => ({
    total: candidates.length,
    shortlisted: candidates.filter(c => c.myStatus === "Shortlisted").length,
    interviews: candidates.filter(c => c.myStatus === "In Process").length,
    onHold: onHold.length,
  }), [candidates, onHold]);

  const stats = [
    { label: "All Candidates",         value: counts.total,       Icon: Users,         accent: "#2563EB", lite: "#EFF6FF" },
    { label: "Shortlisted Candidates", value: counts.shortlisted, Icon: Star,          accent: "#16A34A", lite: "#F0FDF4" },
    { label: "Interviews Scheduled",   value: counts.interviews, Icon: CalendarCheck, accent: "#7C3AED", lite: "#F5F3FF" },
    { label: "On Hold",                value: counts.onHold,     Icon: PauseCircle,   accent: "#D97706", lite: "#FFFBEB" },
  ];

  return (
    <RecruiterSidebarLayout active="onhold">
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#0f172a" }}>On Hold</h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>{filtered.length} candidates</p>
      </div>

      <div style={{ display: "flex", gap: 10, margin: "18px 0" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", border: `1.5px solid ${BORDER}`, borderRadius: 10, backgroundColor: "#fff" }}>
          <Search size={15} color="#94a3b8" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, skills, experience, location..."
            style={{ flex: 1, border: "none", outline: "none", padding: "10px 0", fontSize: 13, fontFamily: "inherit" }}
          />
        </div>
        <button style={{ padding: "0 14px", border: `1.5px solid ${BORDER}`, borderRadius: 10, backgroundColor: "#fff", fontSize: 12.5, fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <Filter size={14} /> Filters
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {stats.map(s => (
          <div key={s.label} style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderTop: `3px solid ${s.accent}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: s.lite, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <s.Icon size={16} color={s.accent} />
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: 13.5, color: "#94a3b8" }}>Loading…</p>
      ) : (
        <CandidateTable
          candidates={filtered}
          columns={{ headers: ["Candidate", "Held On", "Status", "Actions"], gridTemplate: "2.2fr 1fr 1fr 1.6fr" }}
          actions={[
            { label: "Shortlist",         bg: "#fff", color: "#16A34A", border: "#16A34A", onClick: c => setStatus(c.source, c.id, "Shortlisted") },
            { label: "Move to Interview", bg: "#fff", color: "#7C3AED", border: "#7C3AED", onClick: c => setStatus(c.source, c.id, "In Process") },
          ]}
        />
      )}
    </RecruiterSidebarLayout>
  );
}
