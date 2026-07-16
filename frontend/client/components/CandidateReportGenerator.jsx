"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft, FileText, Search, CheckSquare, Square, Download, RefreshCw,
  Briefcase, History, Info, CheckCircle2, XCircle, Zap,
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#EBEBEB";

export default function CandidateReportGenerator() {
  const [tab, setTab] = useState("generate"); // "generate" | "history"

  const [jobs, setJobs] = useState([]);
  const [jdMode, setJdMode] = useState("job"); // "job" | "text"
  const [selectedJobId, setSelectedJobId] = useState("");
  const [jdText, setJdText] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({}); // key `${source_type}:${id}` -> true

  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null); // last generate() response

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/jobs`);
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      } catch {
        // non-fatal — recruiter can still paste JD text
      }
    })();
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/recruiter/reports/candidates`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setCandidates(data.candidates || []);
    } catch (err) {
      showError("Failed to load candidates");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/recruiter/reports/history`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setHistory(data.reports || []);
    } catch {
      showError("Failed to load report history");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (tab === "history") loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filteredCandidates = useMemo(() => {
    if (!search.trim()) return candidates;
    const q = search.trim().toLowerCase();
    return candidates.filter((c) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.skills || "").toLowerCase().includes(q) ||
      (c.current_company_name || "").toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggleOne = (key) => setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAllFiltered = () => {
    const allSelected = filteredCandidates.every((c) => selected[`${c.source_type}:${c.id}`]);
    setSelected((prev) => {
      const next = { ...prev };
      filteredCandidates.forEach((c) => { next[`${c.source_type}:${c.id}`] = !allSelected; });
      return next;
    });
  };

  const downloadPdf = async (reportId, name) => {
    setDownloadingId(reportId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/recruiter/reports/${reportId}/download`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(name || "candidate").replace(/[^a-z0-9]+/gi, "_")}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err.message || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const generate = async () => {
    if (selectedCount === 0) return showError("Select at least one candidate");
    if (jdMode === "job" && !selectedJobId) return showError("Choose a job posting, or switch to pasted JD text");
    if (jdMode === "text" && !jdText.trim()) return showError("Paste a job description, or choose a job posting");

    setGenerating(true);
    setResults(null);
    try {
      const selectedCandidates = Object.keys(selected)
        .filter((k) => selected[k])
        .map((k) => {
          const [source_type, id] = k.split(":");
          return { id: Number(id), source_type };
        });

      const body = {
        candidates: selectedCandidates,
        job_id: jdMode === "job" ? Number(selectedJobId) : null,
        jd_text: jdMode === "text" ? jdText.trim() : null,
        job_title: jdMode === "text" ? jobTitle.trim() : (jobs.find((j) => j.id === Number(selectedJobId))?.job_title || ""),
      };

      const res = await fetch(`${API_BASE_URL}/api/recruiter/reports/generate`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Report generation failed");

      // Merge candidate names into results for display
      const withNames = data.results.map((r) => {
        const cand = candidates.find((c) => c.id === r.candidate_id && c.source_type === r.source_type);
        return { ...r, name: cand?.name || `Candidate #${r.candidate_id}` };
      });
      setResults({ ...data, results: withNames });

      showSuccess(`${data.generated} generated, ${data.reused_from_cache} reused from cache${data.failed ? `, ${data.failed} failed` : ""}`);
    } catch (err) {
      showError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>
      <nav style={{ backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 48px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.04em" }}>PICK<span style={{ color: O }}>YOUR</span>HIRE</span>
        <a href="/recruiter" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#64748b", textDecoration: "none", fontWeight: 500 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = O)} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>
          <ArrowLeft size={16} /> Back to Dashboard
        </a>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 48px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 27, fontWeight: 700, margin: 0 }}>Candidate Report Generator</h1>
          <span style={{ fontSize: 10, backgroundColor: O, color: "#fff", borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>AI</span>
        </div>
        <p style={{ fontSize: 14.5, color: "#64748b", margin: "0 0 4px" }}>
          Pick candidates and a job, generate a PDF evaluation report for each — cached per candidate+job so re-downloading never re-runs the AI.
        </p>
        <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "0 0 24px", display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={13} /> Reports do not include recruiter remarks. Once generated for a candidate+job pairing, it's reused automatically — no extra API cost.
        </p>

        {/* TABS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          {[["generate", "Generate Reports", Zap], ["history", "Report History", History]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: `1.5px solid ${tab === id ? O : BORDER}`, backgroundColor: tab === id ? O_LITE : "#fff", color: tab === id ? O : "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {tab === "generate" && (
          <>
            {/* JD SELECTION */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: 22, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 10 }}>1. Job to evaluate against</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[["job", "Existing job posting"], ["text", "Paste JD text"]].map(([mode, label]) => (
                  <button key={mode} onClick={() => setJdMode(mode)}
                    style={{ padding: "7px 16px", borderRadius: 8, border: `1.5px solid ${jdMode === mode ? O : BORDER}`, backgroundColor: jdMode === mode ? O_LITE : "#fff", color: jdMode === mode ? O : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
              {jdMode === "job" && (
                <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}
                  style={{ width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: "inherit" }}>
                  <option value="">Select a job posting…</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.job_title} — {j.department} ({j.location})</option>)}
                </select>
              )}
              {jdMode === "text" && (
                <>
                  <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job title (for labeling reports)"
                    style={{ width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" }} />
                  <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} rows={5} placeholder="Paste the job description here..."
                    style={{ width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: 10, fontSize: 12.5, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
                </>
              )}
            </div>

            {/* CANDIDATE PICKER */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: 22, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>2. Select candidates ({selectedCount} selected)</div>
                <button onClick={toggleAllFiltered} style={{ fontSize: 12, color: O, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                  {filteredCandidates.length > 0 && filteredCandidates.every((c) => selected[`${c.source_type}:${c.id}`]) ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div style={{ position: "relative", marginBottom: 12 }}>
                <Search size={15} color="#94a3b8" style={{ position: "absolute", left: 12, top: 10 }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, skills, company..."
                  style={{ width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px 8px 34px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>

              {loadingCandidates ? (
                <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", fontSize: 13 }}>Loading candidates…</div>
              ) : filteredCandidates.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", fontSize: 13 }}>No candidates found.</div>
              ) : (
                <div style={{ maxHeight: 380, overflowY: "auto", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                  {filteredCandidates.map((c, i) => {
                    const key = `${c.source_type}:${c.id}`;
                    const isSel = !!selected[key];
                    return (
                      <div key={key} onClick={() => toggleOne(key)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", backgroundColor: isSel ? O_LITE : "#fff", borderBottom: i < filteredCandidates.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                        {isSel ? <CheckSquare size={17} color={O} /> : <Square size={17} color="#cbd5e1" />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{c.name}</div>
                          <div style={{ fontSize: 11.5, color: "#64748b" }}>{c.email} {c.current_company_name ? `· ${c.current_company_name}` : ""} {c.experience ? `· ${c.experience} yrs` : ""}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{c.source_type}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button onClick={generate} disabled={generating || selectedCount === 0}
              style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", backgroundColor: generating || selectedCount === 0 ? "#cbd5e1" : O, color: "#fff", fontSize: 14, fontWeight: 700, cursor: generating || selectedCount === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}>
              {generating ? <><RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> Generating {selectedCount} report(s)…</> : <><FileText size={16} /> Generate {selectedCount || ""} Report{selectedCount !== 1 ? "s" : ""}</>}
            </button>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

            {/* RESULTS */}
            {results && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                  Results — {results.generated} generated, {results.reused_from_cache} reused from cache{results.failed ? `, ${results.failed} failed` : ""}
                </div>
                {results.results.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: `1.5px solid ${r.success ? BORDER : "#FECACA"}`, borderRadius: 12, marginBottom: 8, backgroundColor: r.success ? "#fff" : "#FEF2F2" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {r.success ? <CheckCircle2 size={16} color="#3B6D11" /> : <XCircle size={16} color="#dc2626" />}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                        {r.success ? (
                          <div style={{ fontSize: 11.5, color: "#64748b" }}>{r.cached ? "Reused cached report (no API cost)" : "Newly generated"}</div>
                        ) : (
                          <div style={{ fontSize: 11.5, color: "#dc2626" }}>{r.error}</div>
                        )}
                      </div>
                    </div>
                    {r.success && (
                      <button onClick={() => downloadPdf(r.report_id, r.name)} disabled={downloadingId === r.report_id}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "none", backgroundColor: O, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        <Download size={13} /> {downloadingId === r.report_id ? "Downloading…" : "Download PDF"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <div>
            {loadingHistory ? (
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>Loading history…</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: "center", padding: 50, color: "#94a3b8", fontSize: 13.5 }}>
                <History size={34} color="#cbd5e1" style={{ marginBottom: 10 }} />
                <div>No reports generated yet.</div>
              </div>
            ) : (
              history.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: `1.5px solid ${BORDER}`, borderRadius: 12, marginBottom: 8, backgroundColor: "#fff" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{r.candidate_name}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                      <Briefcase size={11} /> {r.job_title || "Untitled JD"} · {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <button onClick={() => downloadPdf(r.id, r.candidate_name)} disabled={downloadingId === r.id}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${O}`, backgroundColor: "#fff", color: O, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    <Download size={13} /> {downloadingId === r.id ? "Downloading…" : "Download PDF"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
