"use client";

import { useMemo, useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Users, CalendarCheck, PauseCircle, Award } from "lucide-react";
import RecruiterSidebarLayout, { O, BORDER } from "@/components/recruiter/RecruiterSidebarLayout";
import CandidateCard from "@/components/recruiter/CandidateCard";
import { useRecruiterCandidates } from "@/components/recruiter/useRecruiterCandidates";

const PER_PAGE = 10;

export default function ShortlistedPage() {
  const { candidates, loading, setStatus, downloadCV } = useRecruiterCandidates();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const shortlisted = useMemo(() => candidates.filter(c => c.myStatus === "Shortlisted"), [candidates]);

  const filtered = useMemo(() => {
    return shortlisted.filter(c => {
      if (!search) return true;
      const hay = [c.name, c.email, c.skills, c.role, c.current_location].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(search.toLowerCase());
    }).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [shortlisted, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const counts = useMemo(() => ({
    total: shortlisted.length,
    interviews: candidates.filter(c => c.myStatus === "In Process").length,
    onHold: candidates.filter(c => c.myStatus === "On Hold").length,
    offers: candidates.filter(c => c.myStatus === "Offer Given").length,
  }), [shortlisted, candidates]);

  const stats = [
    { label: "Total Shortlisted",     value: counts.total,      Icon: Users,         accent: "#16A34A", lite: "#F0FDF4" },
    { label: "Interviews Scheduled",  value: counts.interviews, Icon: CalendarCheck, accent: "#2563EB", lite: "#EFF6FF" },
    { label: "On Hold",               value: counts.onHold,     Icon: PauseCircle,   accent: "#D97706", lite: "#FFFBEB" },
    { label: "Offers Extended",       value: counts.offers,     Icon: Award,         accent: "#7C3AED", lite: "#F5F3FF" },
  ];

  return (
    <RecruiterSidebarLayout active="shortlisted">
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#0f172a" }}>Shortlisted Candidates</h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>{filtered.length} candidates</p>
      </div>

      <div style={{ display: "flex", gap: 10, margin: "18px 0" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", border: `1.5px solid ${BORDER}`, borderRadius: 10, backgroundColor: "#fff" }}>
          <Search size={15} color="#94a3b8" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
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
      ) : pageItems.length === 0 ? (
        <div style={{ backgroundColor: "#fff", border: `1.5px dashed ${BORDER}`, borderRadius: 16, padding: "56px 24px", textAlign: "center", fontSize: 13.5, color: "#94a3b8" }}>
          No shortlisted candidates yet — shortlist someone from the Candidates page.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pageItems.map(c => (
            <CandidateCard
              key={`${c.source}:${c.id}`}
              candidate={c}
              dateLabel="Shortlisted on"
              actions={{
                onDownload: downloadCV,
                buttons: [
                  { label: "Move to Interview", bg: "#fff", color: "#7C3AED", border: "#7C3AED", onClick: cc => setStatus(cc.source, cc.id, "In Process") },
                  { label: "Move to Hold",      bg: "#fff", color: "#D97706", border: "#D97706", onClick: cc => setStatus(cc.source, cc.id, "On Hold") },
                ],
              }}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
          <span style={{ fontSize: 12.5, color: "#94a3b8" }}>
            Showing {(page - 1) * PER_PAGE + 1} to {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} shortlisted candidates
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(page === 1)}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: O, padding: "0 10px" }}>{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(page === totalPages)}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </RecruiterSidebarLayout>
  );
}

const pageBtn = disabled => ({
  width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${BORDER}`, backgroundColor: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.4 : 1,
});
