"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Upload, FileText, Search, Zap, X, ChevronRight,
  Users, Filter, CheckCircle2, TrendingUp, Award, Briefcase,
  Building2, Clock, MessageSquare, Sparkles
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#EBEBEB";

const WEIGHT_LABELS = {
  skills_match: "Skills Match",
  experience_relevance: "Experience Relevance",
  project_quality: "Project Quality",
  company_background: "Company Background",
  stability: "Stability (Tenure)",
  communication_screening: "Communication / Screening",
  availability: "Availability / Notice Period",
};

const getInitials = name =>
  !name ? "?" : name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

const scoreColor = score => {
  if (score >= 75) return { bg: "#EAF3DE", color: "#3B6D11", border: "#97C459" };
  if (score >= 50) return { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" };
  return { bg: "#FEF2F2", color: "#dc2626", border: "#FECACA" };
};

export default function JDMatchPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: upload JD, 2: filters, 3: candidate list, 4: results

  // Step 1 - JD
  const [jdMode, setJdMode] = useState("text"); // text | file
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState(null);
  const [jdParsed, setJdParsed] = useState(null);
  const [jdFullText, setJdFullText] = useState("");
  const [uploadingJD, setUploadingJD] = useState(false);

  // Step 2 - Filters
  const [minExp, setMinExp] = useState("");
  const [maxExp, setMaxExp] = useState("");
  const [skillsFilter, setSkillsFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Step 3 - Candidate list
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [filtering, setFiltering] = useState(false);

  // Step 4 - Results
  const [results, setResults] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [sortBy, setSortBy] = useState("score");
  const [minScoreFilter, setMinScoreFilter] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  // ─── STEP 1: Upload / parse JD ────────────────────────────────
  const submitJD = async () => {
    if (jdMode === "text" && !jdText.trim()) return showError("Please paste a job description");
    if (jdMode === "file" && !jdFile) return showError("Please select a file");

    setUploadingJD(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      if (jdMode === "file") fd.append("jd_file", jdFile);
      else fd.append("job_description", jdText);

      const res = await fetch(`${API_BASE_URL}/api/recruiter/jd/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process JD");

      setJdParsed(data.parsed);
      setJdFullText(data.jd_text);
      setSkillsFilter((data.parsed.required_skills || []).slice(0, 5).join(", "));
      setMinExp(data.parsed.min_experience?.toString() || "");
      setMaxExp(data.parsed.max_experience?.toString() || "");
      setRoleFilter(data.parsed.department || "");
      setStep(2);
    } catch (err) { showError(err.message); }
    finally { setUploadingJD(false); }
  };

  // ─── STEP 2: Filter candidates ─────────────────────────────────
  const runFilter = async () => {
    setFiltering(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/recruiter/jd/filter-candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          min_experience: minExp || null,
          max_experience: maxExp || null,
          skills: skillsFilter,
          role: roleFilter,
          source: sourceFilter,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Filter failed");
      setCandidates(data.candidates);
      setSelected(new Set(data.candidates.map(c => `${c.source_type}-${c.id}`)));
      setStep(3);
    } catch (err) { showError(err.message); }
    finally { setFiltering(false); }
  };

  const toggleSelect = key => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  // ─── STEP 3 → 4: Run bulk analysis ──────────────────────────────
  const startAnalyzing = async () => {
    const chosen = candidates.filter(c => selected.has(`${c.source_type}-${c.id}`));
    if (chosen.length === 0) return showError("Select at least one candidate");

    setAnalyzing(true);
    setAnalyzeProgress(0);
    setStep(4);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/recruiter/jd/bulk-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          jd_text: jdFullText,
          job_title: jdParsed?.job_title,
          candidates: chosen.map(c => ({ id: c.id, source_type: c.source_type })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResults(data.results);
      setAnalyzeProgress(100);
      showSuccess(`Analyzed ${data.results.length} candidates!`);
    } catch (err) { showError(err.message); setStep(3); }
    finally { setAnalyzing(false); }
  };

  const filteredResults = results
    .filter(r => r.weighted_score >= minScoreFilter)
    .sort((a, b) => sortBy === "score" ? b.weighted_score - a.weighted_score : a.name.localeCompare(b.name));

  const Stepper = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
      {[
        { n: 1, label: "Upload JD" },
        { n: 2, label: "Set Filters" },
        { n: 3, label: "Select Candidates" },
        { n: 4, label: "Results" },
      ].map((s, i) => (
        <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
              backgroundColor: step >= s.n ? O : "#F1F5F9", color: step >= s.n ? "#fff" : "#94a3b8" }}>
              {step > s.n ? <CheckCircle2 size={14} /> : s.n}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: step >= s.n ? "#0f172a" : "#94a3b8" }}>{s.label}</span>
          </div>
          {i < 3 && <ChevronRight size={14} color="#CBD5E1" />}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>
      {/* NAV */}
      <nav style={{ backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 48px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200 }}>
        <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "0.04em" }}>PICK<span style={{ color: O }}>YOUR</span>HIRE</span>
        <button onClick={() => router.push("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", fontSize: 14, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>
          <ArrowLeft size={15} /> Back to Dashboard
        </button>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 48px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: O, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>JD ↔ CV Match</h1>
        </div>
        <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>Upload a job description, filter candidates, then run AI-powered matching with weighted scoring</p>

        <Stepper />

        {/* ─── STEP 1: Upload JD ─── */}
        {step === 1 && (
          <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "28px 32px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["text", "file"].map(m => (
                <button key={m} onClick={() => setJdMode(m)}
                  style={{ padding: "8px 20px", borderRadius: 9, border: `1.5px solid ${jdMode === m ? O : BORDER}`, backgroundColor: jdMode === m ? O_LITE : "#fff", color: jdMode === m ? O : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {m === "text" ? "Paste Text" : "Upload File"}
                </button>
              ))}
            </div>

            {jdMode === "text" ? (
              <textarea value={jdText} onChange={e => setJdText(e.target.value)} rows={10} placeholder="Paste the full job description here..."
                style={{ width: "100%", padding: "14px 16px", border: `1.5px solid ${BORDER}`, borderRadius: 12, fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
            ) : (
              <div onClick={() => document.getElementById("jdFileInput").click()}
                style={{ border: `2px dashed ${jdFile ? O : BORDER}`, borderRadius: 12, padding: "36px", textAlign: "center", cursor: "pointer", backgroundColor: jdFile ? O_LITE : "#FAFAFA" }}>
                <Upload style={{ width: 32, height: 32, margin: "0 auto 10px", color: jdFile ? O : "#94a3b8" }} />
                {jdFile ? (
                  <p style={{ fontSize: 14, fontWeight: 600, color: O, margin: 0 }}>✓ {jdFile.name}</p>
                ) : (
                  <div>
                    <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 4px" }}>Click to upload JD (PDF, DOCX, or TXT)</p>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Max 5MB</p>
                  </div>
                )}
                <input id="jdFileInput" type="file" accept=".pdf,.doc,.docx,.txt" onChange={e => setJdFile(e.target.files[0])} style={{ display: "none" }} />
              </div>
            )}

            <button onClick={submitJD} disabled={uploadingJD}
              style={{ marginTop: 20, padding: "12px 32px", backgroundColor: uploadingJD ? O_LITE : O, color: uploadingJD ? O : "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: uploadingJD ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, boxShadow: uploadingJD ? "none" : "0 4px 14px rgba(232,119,34,0.28)" }}>
              {uploadingJD ? "Processing..." : <><Zap size={15} /> Extract Requirements</>}
            </button>
          </div>
        )}

        {/* ─── STEP 2: Filters ─── */}
        {step === 2 && jdParsed && (
          <div>
            {/* JD summary card */}
            <div style={{ backgroundColor: O_LITE, border: `1.5px solid ${O_MID}`, borderRadius: 14, padding: "18px 22px", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{jdParsed.job_title}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>{jdParsed.summary}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(jdParsed.required_skills || []).map((s, i) => (
                  <span key={i} style={{ fontSize: 11, backgroundColor: "#fff", color: O, padding: "3px 10px", borderRadius: 999, border: `1px solid ${O_MID}`, fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <Filter size={16} color={O} />
                <span style={{ fontSize: 15, fontWeight: 700 }}>Candidate Filters</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Min Experience (years)</label>
                  <input type="number" value={minExp} onChange={e => setMinExp(e.target.value)} placeholder="0"
                    style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${BORDER}`, borderRadius: 9, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Max Experience (years)</label>
                  <input type="number" value={maxExp} onChange={e => setMaxExp(e.target.value)} placeholder="10"
                    style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${BORDER}`, borderRadius: 9, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Required Skills (comma separated, matches any)</label>
                <input value={skillsFilter} onChange={e => setSkillsFilter(e.target.value)} placeholder="React, Node.js, Python"
                  style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${BORDER}`, borderRadius: 9, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Role / Department keyword</label>
                  <input value={roleFilter} onChange={e => setRoleFilter(e.target.value)} placeholder="e.g. Engineering"
                    style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${BORDER}`, borderRadius: 9, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = BORDER} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Candidate Source</label>
                  <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${BORDER}`, borderRadius: 9, fontSize: 14, fontFamily: "inherit", outline: "none", backgroundColor: "#fff", cursor: "pointer", boxSizing: "border-box" }}>
                    <option value="all">All candidates</option>
                    <option value="referred">Referred only</option>
                    <option value="bulk">Bulk uploaded only</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ padding: "12px 24px", border: `1.5px solid ${BORDER}`, borderRadius: 10, backgroundColor: "#fff", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Back</button>
                <button onClick={runFilter} disabled={filtering}
                  style={{ flex: 1, padding: "12px 24px", backgroundColor: filtering ? O_LITE : O, color: filtering ? O : "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: filtering ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {filtering ? "Searching..." : <><Search size={15} /> Find Matching Candidates</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Candidate selection ─── */}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>{candidates.length} candidates found</h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{selected.size} selected for analysis</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep(2)} style={{ padding: "10px 20px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Adjust Filters</button>
                <button onClick={() => setSelected(selected.size === candidates.length ? new Set() : new Set(candidates.map(c => `${c.source_type}-${c.id}`)))}
                  style={{ padding: "10px 20px", border: `1.5px solid ${O_MID}`, borderRadius: 9, backgroundColor: O_LITE, color: O, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {selected.size === candidates.length ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", backgroundColor: "#fff", borderRadius: 14, border: `1.5px solid ${BORDER}` }}>
                <Users size={36} color="#E5E7EB" style={{ display: "block", margin: "0 auto 10px" }} />
                <p style={{ color: "#94a3b8", margin: 0 }}>No candidates match these filters. Try adjusting them.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {candidates.map(c => {
                  const key = `${c.source_type}-${c.id}`;
                  const isSelected = selected.has(key);
                  return (
                    <div key={key} onClick={() => toggleSelect(key)}
                      style={{ backgroundColor: "#fff", border: `1.5px solid ${isSelected ? O : BORDER}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isSelected ? O : "#CBD5E1"}`, backgroundColor: isSelected ? O : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isSelected && <CheckCircle2 size={14} color="#fff" />}
                      </div>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(c.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.email} {c.experience ? `· ${c.experience} yrs` : ""} {c.company ? `· ${c.company}` : ""}</div>
                      </div>
                      {c.referrer_name && <span style={{ fontSize: 11, color: O, fontWeight: 600, backgroundColor: O_LITE, padding: "2px 9px", borderRadius: 6 }}>Referred</span>}
                      <span style={{ fontSize: 11, color: "#94a3b8", backgroundColor: "#F1F5F9", padding: "2px 9px", borderRadius: 6 }}>{c.source_type === "bulk" ? "Bulk" : "Referral"}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={startAnalyzing} disabled={selected.size === 0}
              style={{ width: "100%", padding: "14px 24px", backgroundColor: selected.size === 0 ? "#E5E7EB" : O, color: selected.size === 0 ? "#94a3b8" : "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: selected.size === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: selected.size === 0 ? "none" : "0 4px 14px rgba(232,119,34,0.28)" }}>
              <Zap size={16} /> Start Analyzing {selected.size} Candidate{selected.size !== 1 ? "s" : ""}
            </button>
          </div>
        )}

        {/* ─── STEP 4: Results ─── */}
        {step === 4 && (
          <div>
            {analyzing && (
              <div style={{ textAlign: "center", padding: "64px 0", backgroundColor: "#fff", borderRadius: 16, border: `1.5px solid ${BORDER}` }}>
                <div style={{ width: 56, height: 56, border: "4px solid #FFF3E8", borderTop: `4px solid ${O}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: "0 0 4px" }}>Analyzing candidates against JD...</p>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>This may take a minute for larger batches</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {!analyzing && results.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>{filteredResults.length} of {results.length} candidates</h2>
                    <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Sorted by weighted match score</p>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <label style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Min score: {minScoreFilter}</label>
                    <input type="range" min="0" max="100" value={minScoreFilter} onChange={e => setMinScoreFilter(parseInt(e.target.value))} style={{ width: 120 }} />
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                      style={{ padding: "8px 12px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", backgroundColor: "#fff", cursor: "pointer" }}>
                      <option value="score">Sort: Score</option>
                      <option value="name">Sort: Name</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredResults.map(r => {
                    const sc = scoreColor(r.weighted_score);
                    const isExpanded = expandedId === `${r.source_type}-${r.candidate_id}`;
                    return (
                      <div key={`${r.source_type}-${r.candidate_id}`} style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderLeft: `4px solid ${sc.color}`, borderRadius: 14, overflow: "hidden" }}>
                        <div onClick={() => setExpandedId(isExpanded ? null : `${r.source_type}-${r.candidate_id}`)}
                          style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
                          <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                            {getInitials(r.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</div>
                            <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.source_type === "bulk" ? "Bulk uploaded" : "Referral"}</div>
                          </div>
                          {/* Score on right */}
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: sc.color, lineHeight: 1 }}>{r.weighted_score}</div>
                            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Score</div>
                          </div>
                          <ChevronRight size={18} color="#94a3b8" style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                        </div>

                        {isExpanded && (
                          <div style={{ padding: "0 20px 20px", borderTop: `1px solid #F8FAFC` }}>
                            {/* Subscores */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, margin: "16px 0" }}>
                              {Object.entries(r.subscores).map(([key, val]) => (
                                <div key={key} style={{ backgroundColor: "#F8FAFC", borderRadius: 10, padding: "10px 12px" }}>
                                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{WEIGHT_LABELS[key]}</div>
                                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{val}<span style={{ fontSize: 11, color: "#94a3b8" }}>/100</span></div>
                                </div>
                              ))}
                            </div>

                            {/* Matched/missing skills */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#3B6D11", textTransform: "uppercase", marginBottom: 6 }}>Matched Skills</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                  {r.matched_skills?.map((s, i) => <span key={i} style={{ fontSize: 11, backgroundColor: "#EAF3DE", color: "#3B6D11", padding: "2px 9px", borderRadius: 6 }}>✓ {s}</span>)}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", marginBottom: 6 }}>Missing Skills</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                  {r.missing_skills?.map((s, i) => <span key={i} style={{ fontSize: 11, backgroundColor: "#FEF2F2", color: "#dc2626", padding: "2px 9px", borderRadius: 6 }}>✗ {s}</span>)}
                                </div>
                              </div>
                            </div>

                            {/* Why shortlist */}
                            {r.why_shortlist?.length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Why Shortlist</div>
                                {r.why_shortlist.map((w, i) => (
                                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                                    <span style={{ color: "#3B6D11" }}>✓</span>
                                    <span style={{ fontSize: 13, color: "#475569" }}>{w}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Concerns */}
                            {r.concerns?.length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#C2410C", textTransform: "uppercase", marginBottom: 8 }}>Concerns</div>
                                {r.concerns.map((c, i) => (
                                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                                    <span style={{ color: "#C2410C" }}>⚠</span>
                                    <span style={{ fontSize: 13, color: "#475569" }}>{c}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <button onClick={() => router.push(r.source_type === "bulk" ? `/bulk-candidates/${r.candidate_id}` : `/candidate-details/${r.candidate_id}`)}
                              style={{ padding: "8px 20px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              View Full Profile
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => { setStep(1); setJdParsed(null); setJdText(""); setJdFile(null); setResults([]); setCandidates([]); setSelected(new Set()); }}
                  style={{ marginTop: 24, padding: "10px 24px", border: `1.5px solid ${BORDER}`, borderRadius: 10, backgroundColor: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Start New Match
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
