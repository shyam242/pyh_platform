"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Upload, FileText, ShieldAlert, ShieldCheck, ShieldQuestion,
  X, ChevronDown, ChevronUp, AlertTriangle, Clock, Trash2, RefreshCw,
  FileWarning, Briefcase, GraduationCap, Info,
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#EBEBEB";

const RISK_STYLE = {
  Low: { bg: "#EAF3DE", color: "#3B6D11", border: "#97C459", icon: ShieldCheck },
  Medium: { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA", icon: ShieldQuestion },
  High: { bg: "#FEF2F2", color: "#dc2626", border: "#FECACA", icon: ShieldAlert },
  "N/A": { bg: "#F1F5F9", color: "#64748b", border: BORDER, icon: Info },
};

const SEVERITY_STYLE = {
  low: { bg: "#F1F5F9", color: "#475569" },
  medium: { bg: "#FFF7ED", color: "#C2410C" },
  high: { bg: "#FEF2F2", color: "#dc2626" },
};

const timeAgo = (iso) => {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

function FlagList({ title, icon: Icon, flags }) {
  if (!flags || flags.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
        <Icon size={14} color={O} /> {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {flags.map((f, i) => {
          const sev = SEVERITY_STYLE[f.severity] || SEVERITY_STYLE.low;
          return (
            <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", backgroundColor: "#fafafa" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", padding: "1px 8px", borderRadius: 999, backgroundColor: sev.bg, color: sev.color }}>
                  {f.severity || "low"}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{f.type}</span>
              </div>
              {f.evidence && <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic", marginBottom: 2 }}>&ldquo;{f.evidence}&rdquo;</div>}
              {f.explanation && <div style={{ fontSize: 12, color: "#64748b" }}>{f.explanation}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GapsOverlaps({ gaps, overlaps }) {
  if ((!gaps || gaps.length === 0) && (!overlaps || overlaps.length === 0)) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
        <Clock size={14} color={O} /> Gaps &amp; Overlaps
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(gaps || []).map((g, i) => (
          <div key={`g${i}`} style={{ fontSize: 12, color: "#475569", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", backgroundColor: "#fafafa" }}>
            <b style={{ color: "#C2410C" }}>GAP</b> ({g.duration_months} mo): {g.between}
          </div>
        ))}
        {(overlaps || []).map((o, i) => (
          <div key={`o${i}`} style={{ fontSize: 12, color: "#475569", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", backgroundColor: "#fafafa" }}>
            <b style={{ color: "#dc2626" }}>OVERLAP</b> ({o.overlap_months} mo, {o.severity}): {o.between}
          </div>
        ))}
      </div>
    </div>
  );
}

function CandidateCard({ c, expanded, onToggle }) {
  if (c.error) {
    return (
      <div style={{ border: `1.5px solid #FECACA`, borderRadius: 14, padding: "16px 20px", backgroundColor: "#FEF2F2", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileWarning size={16} color="#dc2626" />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{c.file_name}</span>
        </div>
        <div style={{ fontSize: 12.5, color: "#b91c1c", marginTop: 6 }}>{c.error}</div>
      </div>
    );
  }

  const risk = RISK_STYLE[c.risk_level] || RISK_STYLE["N/A"];
  const RiskIcon = risk.icon;
  const totalFlags =
    (c.designation_inflation_flags?.length || 0) +
    (c.skill_anachronism_flags?.length || 0) +
    (c.experience_inflation_flags?.length || 0) +
    (c.other_red_flags?.length || 0);

  return (
    <div style={{ border: `1.5px solid ${risk.border}`, borderRadius: 14, backgroundColor: "#fff", marginBottom: 12, overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: risk.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <RiskIcon size={18} color={risk.color} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.candidate_name}</div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>{c.file_name}{c.num_companies != null ? ` · ${c.num_companies} companies` : ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#64748b" }}>Auto Score</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{c.auto_score}/{c.auto_score_max}</div>
          </div>
          <div style={{ padding: "5px 12px", borderRadius: 999, backgroundColor: risk.bg, color: risk.color, border: `1px solid ${risk.border}`, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            Risk {c.authenticity_risk_score ?? "—"} · {c.risk_level}
          </div>
          {totalFlags > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#FEF2F2", color: "#dc2626", borderRadius: 999, padding: "3px 9px" }}>{totalFlags} flag{totalFlags !== 1 ? "s" : ""}</span>
          )}
          {expanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${BORDER}` }}>
          {c.recommendation && (
            <div style={{ marginTop: 16, marginBottom: 16, padding: "12px 14px", borderRadius: 10, backgroundColor: O_LITE, border: `1px solid ${O_MID}`, fontSize: 13, color: "#7c3f0d" }}>
              <b>Recommendation:</b> {c.recommendation}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 16, marginBottom: 16 }}>
            {[
              ["Skill Match", `${c.skill_match_score}/30`],
              ["Experience", `${c.experience_score}/20`],
              ["Company Tier", `${c.company_score}/10`],
              ["Stability", `${c.stability_score}/10`],
              ["Projects", `${c.projects_quality_score}/15`],
            ].map(([label, val]) => (
              <div key={label} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 24, fontSize: 12, color: "#64748b", marginBottom: 16, flexWrap: "wrap" }}>
            <span>Deterministic total exp: <b style={{ color: "#0f172a" }}>{c.deterministic_total_experience_years} yrs</b></span>
            <span>Avg tenure: <b style={{ color: "#0f172a" }}>{c.avg_tenure_years} yrs</b></span>
            {c.dominant_company_tier != null && <span>Best company tier: <b style={{ color: "#0f172a" }}>Tier {c.dominant_company_tier}</b></span>}
          </div>

          <FlagList title="Designation / Title Inflation" icon={Briefcase} flags={c.designation_inflation_flags} />
          <FlagList title="Skill Anachronisms" icon={AlertTriangle} flags={c.skill_anachronism_flags} />
          <FlagList title="Experience Inflation" icon={GraduationCap} flags={c.experience_inflation_flags} />
          <FlagList title="Other Red Flags" icon={FileWarning} flags={c.other_red_flags} />
          <GapsOverlaps gaps={c.gaps} overlaps={c.overlaps} />

          {totalFlags === 0 && (!c.gaps || c.gaps.length === 0) && (!c.overlaps || c.overlaps.length === 0) && (
            <div style={{ fontSize: 12.5, color: "#3B6D11", display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={14} /> No authenticity concerns detected.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Shared "Fake Experience Check" screen.
 *
 * apiPrefix: "/api/recruiter" or "/api/admin" — the two backend route
 * namespaces are functionally identical, kept separate only so a
 * recruiter's "last batch" and an admin's "last batch" don't collide.
 * backHref: where the "Back to Dashboard" link goes.
 */
export default function FakeExperienceCheck({ apiPrefix, backHref }) {
  const [jobTitle, setJobTitle] = useState("");
  const [jdMode, setJdMode] = useState("text"); // "text" | "file" | "none"
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState(null);
  const [resumeFiles, setResumeFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [batch, setBatch] = useState(null);
  const [loadingLast, setLoadingLast] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [minRisk, setMinRisk] = useState(0);
  const resumeInputRef = useRef(null);
  const jdInputRef = useRef(null);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  // On load, pull the last-uploaded batch (if any) for this user — this IS
  // the "view result for last uploaded CVs" behavior. Nothing is fetched
  // from the database; the server just hands back whatever is still in memory.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}${apiPrefix}/fake-experience/last`, { headers: authHeaders() });
        const data = await res.json();
        if (res.ok && data.batch) setBatch(data.batch);
      } catch {
        // silent — just means no prior batch to show
      } finally {
        setLoadingLast(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addResumeFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    const valid = incoming.filter((f) => /\.(pdf|docx|txt|md)$/i.test(f.name));
    const invalid = incoming.length - valid.length;
    if (invalid > 0) showError(`${invalid} file(s) skipped — only .pdf, .docx, .txt are supported`);
    setResumeFiles((prev) => {
      const merged = [...prev, ...valid];
      if (merged.length > 20) {
        showError("Maximum 20 resumes per batch — extra files were not added");
        return merged.slice(0, 20);
      }
      return merged;
    });
  };

  const removeResumeFile = (idx) => setResumeFiles((prev) => prev.filter((_, i) => i !== idx));

  const runAnalysis = async () => {
    if (resumeFiles.length === 0) return showError("Add at least one resume to check");
    if (jdMode === "file" && !jdFile) return showError("Select a job description file, or switch to pasted text / no JD");
    if (jdMode === "text" && !jdText.trim() && !jobTitle.trim()) {
      // Allow proceeding with no JD at all, but nudge if truly empty
    }

    setAnalyzing(true);
    try {
      const fd = new FormData();
      resumeFiles.forEach((f) => fd.append("resumes", f));
      if (jdMode === "file" && jdFile) fd.append("jd_file", jdFile);
      if (jdMode === "text" && jdText.trim()) fd.append("job_description", jdText.trim());
      if (jobTitle.trim()) fd.append("job_title", jobTitle.trim());

      const res = await fetch(`${API_BASE_URL}${apiPrefix}/fake-experience/analyze`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setBatch(data.batch);
      setResumeFiles([]);
      setExpandedId(null);
      showSuccess(`Checked ${data.batch.succeeded}/${data.batch.total} resume(s)${data.batch.failed ? ` — ${data.batch.failed} failed` : ""}`);
    } catch (err) {
      showError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const clearLast = async () => {
    if (!confirm("Clear the last check result? This only removes it from this session — nothing was ever saved permanently.")) return;
    try {
      await fetch(`${API_BASE_URL}${apiPrefix}/fake-experience/last`, { method: "DELETE", headers: authHeaders() });
      setBatch(null);
      showSuccess("Cleared");
    } catch (err) {
      showError(err.message || "Failed to clear");
    }
  };

  const visibleCandidates = (batch?.candidates || []).filter(
    (c) => c.error || (c.authenticity_risk_score ?? 0) >= minRisk
  );

  const summary = batch
    ? {
        high: (batch.candidates || []).filter((c) => c.risk_level === "High").length,
        medium: (batch.candidates || []).filter((c) => c.risk_level === "Medium").length,
        low: (batch.candidates || []).filter((c) => c.risk_level === "Low").length,
      }
    : null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>
      <nav style={{ backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 48px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.04em" }}>PICK<span style={{ color: O }}>YOUR</span>HIRE</span>
        <a href={backHref} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#64748b", textDecoration: "none", fontWeight: 500 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = O)} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>
          <ArrowLeft size={16} /> Back to Dashboard
        </a>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 48px 64px" }}>
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontSize: 27, fontWeight: 700, margin: 0 }}>Fake Experience Check</h1>
          <span style={{ fontSize: 10, backgroundColor: O, color: "#fff", borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>AI</span>
        </div>
        <p style={{ fontSize: 14.5, color: "#64748b", margin: "0 0 8px" }}>
          Upload resumes to screen for inflated titles, chronologically impossible skill claims, and unexplained employment gaps or overlaps.
        </p>
        <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "0 0 28px", display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={13} /> Nothing here is saved permanently — only your single most recent upload is kept (in memory) so you can revisit it. Uploading a new batch replaces it.
        </p>

        {/* UPLOAD PANEL */}
        <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: 24, marginBottom: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Resumes */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8, display: "block" }}>
                Resumes to check ({resumeFiles.length}/20)
              </label>
              <div
                onClick={() => resumeInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); addResumeFiles(e.dataTransfer.files); }}
                style={{ border: `1.5px dashed ${O_MID}`, borderRadius: 12, padding: "22px 16px", textAlign: "center", cursor: "pointer", backgroundColor: O_LITE }}
              >
                <Upload size={20} color={O} style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 13, color: "#7c3f0d", fontWeight: 600 }}>Click or drag resumes here</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>.pdf, .docx, .txt — up to 20 files, 10MB each</div>
              </div>
              <input ref={resumeInputRef} type="file" multiple accept=".pdf,.docx,.txt,.md" style={{ display: "none" }}
                onChange={(e) => { addResumeFiles(e.target.files); e.target.value = ""; }} />
              {resumeFiles.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                  {resumeFiles.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <FileText size={13} color={O} /> {f.name}
                      </span>
                      <button onClick={() => removeResumeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", flexShrink: 0 }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* JD */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8, display: "block" }}>
                Job description <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional — improves skill-match accuracy)</span>
              </label>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {[["text", "Paste text"], ["file", "Upload file"], ["none", "Skip"]].map(([mode, label]) => (
                  <button key={mode} onClick={() => setJdMode(mode)}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1.5px solid ${jdMode === mode ? O : BORDER}`, backgroundColor: jdMode === mode ? O_LITE : "#fff", color: jdMode === mode ? O : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
              {jdMode === "text" && (
                <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} rows={5}
                  placeholder="Paste the job description here..."
                  style={{ width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: 10, fontSize: 12.5, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
              )}
              {jdMode === "file" && (
                <div onClick={() => jdInputRef.current?.click()} style={{ border: `1.5px dashed ${O_MID}`, borderRadius: 12, padding: "18px 16px", textAlign: "center", cursor: "pointer", backgroundColor: O_LITE }}>
                  <FileText size={18} color={O} style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: 12.5, color: "#7c3f0d", fontWeight: 600 }}>{jdFile ? jdFile.name : "Click to select JD file (.pdf/.docx/.txt)"}</div>
                </div>
              )}
              <input ref={jdInputRef} type="file" accept=".pdf,.docx,.txt,.md" style={{ display: "none" }}
                onChange={(e) => setJdFile(e.target.files?.[0] || null)} />
              {jdMode === "none" && (
                <div style={{ fontSize: 12, color: "#94a3b8", padding: "10px 0" }}>No JD — scoring will be based on general role fit only.</div>
              )}

              <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job title (optional, for labeling this batch)"
                style={{ width: "100%", marginTop: 10, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "8px 10px", fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          </div>

          <button onClick={runAnalysis} disabled={analyzing || resumeFiles.length === 0}
            style={{ marginTop: 18, width: "100%", padding: "12px 0", borderRadius: 10, border: "none", backgroundColor: analyzing || resumeFiles.length === 0 ? "#cbd5e1" : O, color: "#fff", fontSize: 14, fontWeight: 700, cursor: analyzing || resumeFiles.length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {analyzing ? <><RefreshCw size={16} className="spin-icon" style={{ animation: "spin 1s linear infinite" }} /> Checking {resumeFiles.length} resume(s)… this can take a minute</> : <><ShieldAlert size={16} /> Run Fake Experience Check</>}
          </button>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* RESULTS */}
        {loadingLast && !batch && (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>Loading last result…</div>
        )}

        {batch && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {batch.job_title ? `Results for "${batch.job_title}"` : "Last Check Results"}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  {batch.total} resume{batch.total !== 1 ? "s" : ""} · analyzed {timeAgo(batch.analyzed_at)}
                  {batch.failed > 0 && ` · ${batch.failed} failed to process`}
                </div>
              </div>
              <button onClick={clearLast} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#94a3b8", background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>
                <Trash2 size={13} /> Clear
              </button>
            </div>

            {summary && (
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                {[["High Risk", summary.high, RISK_STYLE.High], ["Medium Risk", summary.medium, RISK_STYLE.Medium], ["Low Risk", summary.low, RISK_STYLE.Low]].map(([label, count, style]) => (
                  <div key={label} style={{ flex: 1, backgroundColor: style.bg, border: `1px solid ${style.border}`, borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: style.color }}>{count}</div>
                    <div style={{ fontSize: 11.5, color: style.color, fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <label style={{ fontSize: 12.5, color: "#64748b" }}>Min. risk score to show: <b>{minRisk}</b></label>
              <input type="range" min="0" max="100" value={minRisk} onChange={(e) => setMinRisk(Number(e.target.value))} style={{ flex: 1, maxWidth: 220 }} />
            </div>

            {visibleCandidates.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", fontSize: 13 }}>No candidates match this filter.</div>
            )}

            {visibleCandidates.map((c, i) => (
              <CandidateCard key={c.file_name + i} c={c} expanded={expandedId === c.file_name + i} onToggle={() => setExpandedId(expandedId === c.file_name + i ? null : c.file_name + i)} />
            ))}
          </div>
        )}

        {!loadingLast && !batch && (
          <div style={{ textAlign: "center", padding: 50, color: "#94a3b8", fontSize: 13.5 }}>
            <ShieldQuestion size={34} color="#cbd5e1" style={{ marginBottom: 10 }} />
            <div>No check run yet. Upload resumes above to get started.</div>
          </div>
        )}
      </div>
    </div>
  );
}
