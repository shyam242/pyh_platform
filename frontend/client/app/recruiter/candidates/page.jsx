"use client";

import { useMemo, useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Users, Star, PauseCircle, XCircle } from "lucide-react";
import RecruiterSidebarLayout, { O, O_LITE, BORDER } from "@/components/recruiter/RecruiterSidebarLayout";
import CandidateCard from "@/components/recruiter/CandidateCard";
import { useRecruiterCandidates } from "@/components/recruiter/useRecruiterCandidates";

const PER_PAGE = 10;

export default function CandidatesPage() {
  const { candidates, loading, setStatus, downloadCV } = useRecruiterCandidates();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return candidates.filter(c => {
      if (statusFilter !== "all" && c.myStatus !== statusFilter) return false;
      if (search) {
        const hay = [c.name, c.email, c.skills, c.role, c.current_location, c.referrer_name].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.created_at || b.upload_date || 0) - new Date(a.created_at || a.upload_date || 0));
  }, [candidates, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const counts = useMemo(() => ({
    total: candidates.length,
    shortlisted: candidates.filter(c => c.myStatus === "Shortlisted").length,
    onHold: candidates.filter(c => c.myStatus === "On Hold").length,
    rejected: candidates.filter(c => c.myStatus === "Rejected").length,
  }), [candidates]);

  const stats = [
    { label: "Total Candidates", value: counts.total,       Icon: Users,       accent: "#2563EB", lite: "#EFF6FF" },
    { label: "Shortlisted",      value: counts.shortlisted, Icon: Star,        accent: "#16A34A", lite: "#F0FDF4" },
    { label: "On Hold",          value: counts.onHold,      Icon: PauseCircle, accent: "#D97706", lite: "#FFFBEB" },
    { label: "Rejected",         value: counts.rejected,    Icon: XCircle,     accent: "#DC2626", lite: "#FEF2F2" },
  ];

  return (
    <RecruiterSidebarLayout active="candidates">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#0f172a" }}>All Candidates</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>{filtered.length} candidates</p>
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 10, margin: "18px 0" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", border: `1.5px solid ${BORDER}`, borderRadius: 10, backgroundColor: "#fff" }}>
          <Search size={15} color="#94a3b8" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by skills, experience, location, designation..."
            style={{ flex: 1, border: "none", outline: "none", padding: "10px 0", fontSize: 13, fontFamily: "inherit" }}
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="all">All statuses</option>
          {["Shortlisted", "In Process", "On Hold", "Offer Given", "Rejected"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button style={{ ...selectStyle, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <Filter size={14} /> Filters
        </button>
      </div>

      {/* Stat cards */}
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

      {/* Candidate list */}
      {loading ? (
        <p style={{ fontSize: 13.5, color: "#94a3b8" }}>Loading candidates…</p>
      ) : pageItems.length === 0 ? (
        <div style={{ backgroundColor: "#fff", border: `1.5px dashed ${BORDER}`, borderRadius: 16, padding: "56px 24px", textAlign: "center", fontSize: 13.5, color: "#94a3b8" }}>
          No candidates match your filters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pageItems.map(c => (
            <CandidateCard
              key={`${c.source}:${c.id}`}
              candidate={c}
              actions={{
                onDownload: downloadCV,
                buttons: [
                  { label: "Shortlist", bg: "#fff", color: "#16A34A", border: "#16A34A", onClick: cc => setStatus(cc.source, cc.id, "Shortlisted") },
                  { label: "Hold",      bg: "#fff", color: "#D97706", border: "#D97706", onClick: cc => setStatus(cc.source, cc.id, "On Hold") },
                ],
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
          <span style={{ fontSize: 12.5, color: "#94a3b8" }}>
            Showing {(page - 1) * PER_PAGE + 1} to {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} candidates
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

const selectStyle = {
  padding: "0 14px", border: `1.5px solid ${BORDER}`, borderRadius: 10, backgroundColor: "#fff",
  fontSize: 12.5, fontFamily: "inherit", color: "#334155", fontWeight: 600,
};

const pageBtn = disabled => ({
  width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${BORDER}`, backgroundColor: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.4 : 1,
});
