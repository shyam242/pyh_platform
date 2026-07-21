"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import RecruiterSidebarLayout, { O, O_LITE, BORDER } from "@/components/recruiter/RecruiterSidebarLayout";
import { API_BASE_URL } from "@/utils/api";
import { showError } from "@/utils/toast";

const getInitials = name => !name ? "?" : name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

export default function SearchByProjectPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return showError("Enter a project keyword or technology");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/recruiter/projects/search?query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.candidates || []);
    } catch (err) {
      showError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RecruiterSidebarLayout active="projects">
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>Search by Project</h1>
      <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 22px" }}>
        Find candidates by the projects they've built, not just their listed skills.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", border: `1.5px solid ${BORDER}`, borderRadius: 12, backgroundColor: "#fff" }}>
          <Search size={16} color="#94a3b8" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="e.g. e-commerce checkout, real-time chat, payment gateway..."
            style={{ flex: 1, border: "none", outline: "none", padding: "12px 0", fontSize: 13.5, fontFamily: "inherit" }}
          />
        </div>
        <button
          onClick={search}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 22px", borderRadius: 12, border: "none", backgroundColor: O, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Search
        </button>
      </div>

      {results === null ? (
        <div style={{ backgroundColor: "#fff", border: `1.5px dashed ${BORDER}`, borderRadius: 16, padding: "56px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Search size={24} />
          </div>
          <p style={{ fontSize: 13.5, color: "#94a3b8", maxWidth: 360, margin: "0 auto" }}>
            Try a technology, domain, or project type — we'll match it against parsed resume projects.
          </p>
        </div>
      ) : results.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "#94a3b8" }}>No candidates matched that project keyword.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {results.map(c => (
            <div key={c.id} style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {getInitials(c.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>{c.role || c.job_role || ""} {c.current_location ? `· ${c.current_location}` : ""}</div>
                {c.skills && <div style={{ fontSize: 12, color: "#475569" }}>{c.skills}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </RecruiterSidebarLayout>
  );
}
