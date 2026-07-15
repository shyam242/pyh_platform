// backend/server/services/fakeExperienceService.js
//
// Node.js port of the Python Fake_Experience_Detector tool, adapted to this
// codebase's existing Claude-call pattern (see controllers/aiController.js
// and controllers/jdMatchController.js).
//
// For each resume it produces, in one Claude call:
//   - a rubric score (skill match, experience, company tier, project quality;
//     stability is computed deterministically, not by the model)
//   - an authenticity/fake-experience analysis: inflated designations,
//     implausible role jumps, chronologically impossible skill claims,
//     unexplained employment/education gaps or overlaps, other red flags
//
// Gaps/overlaps and total-experience cross-checks are computed independently
// in plain JS from the start/end dates Claude extracts (not just trusted
// from the model), exactly like gap_analysis.py did.

import fetch from "node-fetch";

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = process.env.FAKE_EXPERIENCE_CLAUDE_MODEL || "claude-sonnet-4-5";

// ─── TEXT EXTRACTION (buffers only — nothing touches disk) ───────────────────

export async function extractTextFromBuffer(buffer, filename, mimetype) {
  const ext = (filename.split(".").pop() || "").toLowerCase();

  if (ext === "pdf" || mimetype === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text || "";
  }

  if (
    ext === "docx" ||
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  if (ext === "txt" || ext === "md" || mimetype === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: .${ext || "unknown"}`);
}

// ─── CLAUDE CALL ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a meticulous technical recruiter and fraud-detection analyst. You read a candidate resume against a specific job description and:

1. Extract a clean, structured work and education history.
2. Score the candidate against the scoring rubric below.
3. Hunt for signs of a FAKE or EXAGGERATED resume: inflated designations, implausible role jumps, skill claims that are chronologically impossible, unexplained employment/education gaps, overlapping jobs, and a "level of work described" that doesn't match the seniority claimed.

You must be skeptical but fair. Do not invent red flags that aren't supported by the resume text. If something is ambiguous, say so with "low" severity rather than asserting fraud.

DATES: For any job or degree that is CURRENTLY ONGOING (resume says "Present", "Current", "Ongoing", or gives no end date for what is clearly their most recent/active role or degree), you MUST set "end" to the literal string "present" — never null and never a guessed date. Only use null for "end" when the resume genuinely gives no information at all about whether the role/degree ended (rare). Getting this wrong causes ongoing roles to be miscounted as having ended the same month they started.

SCORING RUBRIC (total 100, but Communication and Availability cannot be judged from a resume alone — leave them as null, a human fills those in after a call/interview):

- skill_match_score (/30): score = (matched_skills / required_skills) * 30, based on the JD's required skills vs candidate's demonstrated skills. If no JD was provided, estimate based on general role fit and note that in projects_quality_notes.
- experience_score (/20): relevant years of experience vs required years (if no JD, vs a typical bar for the role implied by the resume). >= required -> 20, exactly 1 year short -> 15, 2 years short -> 10, more than 2 years short -> proportionally lower (use judgement, never below 0).
- company_score (/10): based on the BEST/dominant company tier the candidate worked at. Tier 1 (recognizable product companies) -> 10, Tier 2 (established service/IT companies) -> 7, Tier 3 (unknown/small/unverifiable) -> 4.
- stability_score: leave as null — it is computed deterministically from the work history dates you extract. Do not compute it yourself.
- projects_quality_score (/15): based on evidence of production-grade, scalable, API/cloud/microservices work described in the resume vs vague or purely academic projects.
- communication_score: null (manual, post-interview)
- availability_score: null (manual, post-interview)

AUTHENTICITY ANALYSIS — be concrete and cite the evidence from the resume text for every flag you raise:

- designation_inflation_flags: For each job, judge whether the claimed title is plausible given (a) total years of experience at that point in their career, (b) company size/tier, (c) the seniority of the work actually described under that title. Flag jumps like "Software Engineer" to "Architect"/"Director"/"VP" in under 2-3 years, or a senior title with junior-sounding day-to-day duties.
- skill_anachronism_flags: Flag any skill/technology claim that is chronologically impossible or highly improbable (e.g., claiming years of experience with a technology before it existed or before it was widely adopted, or claiming a long tenure with a tool/framework that's only a couple of years old).
- experience_inflation_flags: Flag if the headline "X years of experience" claimed at the top of the resume doesn't add up against the sum of the listed job durations. Also flag a role with a start or end date genuinely after TODAY'S ACTUAL DATE given to you in the user message — but only compare against that given date, never against your own assumption of "now".
- other_red_flags: anything else suspicious (vague company names, no verifiable details, generic copy-pasted project descriptions repeated across unrelated roles, suspiciously perfect/uniform job durations, etc).

Each flag object must have: type, severity ("low"|"medium"|"high"), evidence (a short quote or specific fact from the resume), explanation.

Respond with ONLY a single JSON object, no markdown fences, no commentary, matching exactly this schema:

{
  "candidate_name": string,
  "claimed_total_experience_years": number|null,
  "work_history": [
    {"company": string, "designation": string, "start": "YYYY-MM"|"YYYY"|null,
     "end": "YYYY-MM"|"YYYY"|"present"|null, "tech_used": [string],
     "responsibilities_summary": string}
  ],
  "education": [
    {"degree": string, "institution": string, "start": "YYYY-MM"|"YYYY"|null,
     "end": "YYYY-MM"|"YYYY"|"present"|null}
  ],
  "required_skills": [string],
  "matched_skills": [string],
  "skill_match_score": number,
  "required_experience_years": number|null,
  "relevant_experience_years": number|null,
  "experience_score": number,
  "company_tier_assessment": [{"company": string, "tier": 1|2|3, "reasoning": string}],
  "company_score": number,
  "projects_quality_score": number,
  "projects_quality_notes": string,
  "designation_inflation_flags": [{"type": string, "severity": string, "evidence": string, "explanation": string}],
  "skill_anachronism_flags": [{"type": string, "severity": string, "evidence": string, "explanation": string}],
  "experience_inflation_flags": [{"type": string, "severity": string, "evidence": string, "explanation": string}],
  "other_red_flags": [{"type": string, "severity": string, "evidence": string, "explanation": string}],
  "authenticity_risk_score": number,
  "recommendation": string
}

authenticity_risk_score is 0-100 where 0 = no concerns, 100 = strong signs of a fabricated resume. Base it on the number and severity of flags above (rough guide: 0 flags -> 0-10, only low severity -> 10-30, any medium -> 30-60, any high or 2+ medium -> 60-100). recommendation is a 1-2 sentence plain-English note for the recruiter.`;

const stripJSONFences = (text) =>
  text.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim();

async function callClaude(prompt, { system = SYSTEM_PROMPT, maxTokens = 4000 } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server");
  }
  const res = await fetch(CLAUDE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Claude API error");
  return data.content.map((b) => b.text || "").join("");
}

async function analyzeResumeWithClaude(resumeText, jdText, maxRetries = 1) {
  // IMPORTANT: the model's own training cutoff is NOT reliable "now" — without
  // this, it will misjudge recent-but-real dates (e.g. "May 2026 – Present")
  // as impossible future dates just because its training data ends earlier.
  // Always tell it the real current date explicitly.
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let userContent = `TODAY'S ACTUAL DATE: ${todayStr}\nUse this as ground truth for "present"/"current" and for judging whether any date in the resume is genuinely in the future. Do NOT rely on your own training cutoff to decide what "now" is.\n\nJOB DESCRIPTION:\n${jdText || "(No job description provided — score generally for role fit.)"}\n\n---\n\nCANDIDATE RESUME:\n${resumeText}`;

  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const raw = await callClaude(userContent);
    const cleaned = stripJSONFences(raw);
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      lastErr = e;
      userContent = `Your previous response was not valid JSON. Re-send ONLY the corrected JSON object, no markdown fences, no commentary.\n\nPrevious response:\n${raw}`;
    }
  }
  throw new Error(`Could not parse JSON from Claude after retries: ${lastErr?.message}`);
}

// ─── DETERMINISTIC DATE-MATH GAP/OVERLAP ANALYSIS ─────────────────────────────
// Ported 1:1 from app/gap_analysis.py

const GAP_THRESHOLD_MONTHS = 2;

function parseFlexDate(value) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim().toLowerCase();
  if (["present", "current", "now", "till date", "ongoing", ""].includes(v)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  let m = v.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, 1);
  m = v.match(/^(\d{4})$/);
  if (m) return new Date(parseInt(m[1]), 0, 1);
  return null;
}

function monthDiff(d1, d2) {
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function sortedPeriods(entries, startKey = "start", endKey = "end") {
  const periods = [];
  for (const e of entries || []) {
    const s = parseFlexDate(e[startKey]);
    let en = parseFlexDate(e[endKey]);
    if (s === null) continue;
    // If no end date was given, DO NOT assume it ended the same month it
    // started — that silently invents a phantom completion date and causes
    // false "gap" flags against whatever comes next. Treat unstated end as
    // "still ongoing" (now) instead, which is the far more common real case
    // (e.g. a current job/degree the model failed to mark "present" for).
    if (en === null) en = parseFlexDate("present");
    periods.push({
      label: e.company || e.institution || e.designation || "?",
      start: s,
      end: en,
      raw: e,
    });
  }
  periods.sort((a, b) => a.start - b.start);
  return periods;
}

function detectEmploymentGaps(workHistory) {
  const periods = sortedPeriods(workHistory);
  const gaps = [];
  const overlaps = [];
  for (let i = 1; i < periods.length; i++) {
    const prev = periods[i - 1];
    const cur = periods[i];
    const gapMonths = monthDiff(prev.end, cur.start);
    if (gapMonths > GAP_THRESHOLD_MONTHS) {
      gaps.push({
        type: "employment_gap",
        between: `${prev.label} -> ${cur.label}`,
        duration_months: gapMonths,
      });
    } else if (gapMonths < 0) {
      overlaps.push({
        type: "employment_overlap",
        between: `${prev.label} & ${cur.label}`,
        overlap_months: Math.abs(gapMonths),
        severity: Math.abs(gapMonths) > 2 ? "high" : "low",
      });
    }
  }
  return { gaps, overlaps };
}

function detectEducationGaps(education, workHistory) {
  const eduPeriods = sortedPeriods(education);
  const gaps = [];
  for (let i = 1; i < eduPeriods.length; i++) {
    const prev = eduPeriods[i - 1];
    const cur = eduPeriods[i];
    const gapMonths = monthDiff(prev.end, cur.start);
    if (gapMonths > GAP_THRESHOLD_MONTHS * 6) {
      gaps.push({
        type: "education_gap",
        between: `${prev.label} -> ${cur.label}`,
        duration_months: gapMonths,
      });
    }
  }

  const workPeriods = sortedPeriods(workHistory);
  if (eduPeriods.length && workPeriods.length) {
    const lastEduEnd = eduPeriods[eduPeriods.length - 1].end;
    const firstJobStart = workPeriods[0].start;
    const gapMonths = monthDiff(lastEduEnd, firstJobStart);
    if (gapMonths > GAP_THRESHOLD_MONTHS * 6) {
      gaps.push({
        type: "education_to_work_gap",
        between: `${eduPeriods[eduPeriods.length - 1].label} -> ${workPeriods[0].label}`,
        duration_months: gapMonths,
      });
    }
  }
  return gaps;
}

function computeStability(workHistory) {
  const periods = sortedPeriods(workHistory);
  if (!periods.length) return { avgTenureYears: 0, stabilityScore: 0 };
  const totalMonths = periods.reduce((sum, p) => sum + Math.max(monthDiff(p.start, p.end), 1), 0);
  const avgTenureYears = Math.round(((totalMonths / periods.length) / 12) * 100) / 100;
  let stabilityScore;
  if (avgTenureYears >= 3) stabilityScore = 10;
  else if (avgTenureYears >= 2) stabilityScore = 7;
  else if (avgTenureYears >= 1) stabilityScore = 4;
  else stabilityScore = 2;
  return { avgTenureYears, stabilityScore };
}

function computeTotalExperienceYears(workHistory) {
  const periods = sortedPeriods(workHistory);
  if (!periods.length) return 0;
  const start = periods.reduce((min, p) => (p.start < min ? p.start : min), periods[0].start);
  const end = periods.reduce((max, p) => (p.end > max ? p.end : max), periods[0].end);
  return Math.round((monthDiff(start, end) / 12) * 100) / 100;
}

// ─── ASSEMBLE FULL PER-CANDIDATE RESULT (mirrors main.py process_candidate) ──

export async function analyzeSingleResume({ resumeText, jdText, filename }) {
  const data = await analyzeResumeWithClaude(resumeText, jdText);

  const workHistory = data.work_history || [];
  const education = data.education || [];

  const { gaps: empGaps, overlaps } = detectEmploymentGaps(workHistory);
  const eduGaps = detectEducationGaps(education, workHistory);
  const gaps = [...empGaps, ...eduGaps];

  const { avgTenureYears, stabilityScore } = computeStability(workHistory);
  const detTotalExp = computeTotalExperienceYears(workHistory);

  const tiers = (data.company_tier_assessment || []).map((t) => t.tier).filter(Boolean);
  const dominantTier = tiers.length ? Math.min(...tiers) : null;

  const skillMatch = data.skill_match_score || 0;
  const expScore = data.experience_score || 0;
  const companyScore = data.company_score || 0;
  const projectsScore = data.projects_quality_score || 0;
  const autoScore = Math.round((skillMatch + expScore + companyScore + stabilityScore + projectsScore) * 10) / 10;

  const experienceInflationFlags = [...(data.experience_inflation_flags || [])];
  const claimed = data.claimed_total_experience_years;
  if (claimed != null && detTotalExp && Math.abs(claimed - detTotalExp) > 1.5) {
    experienceInflationFlags.push({
      type: "experience_mismatch",
      severity: "medium",
      evidence: `Claimed ${claimed} yrs total experience`,
      explanation: `Deterministic calculation from listed job dates gives ~${detTotalExp} yrs, a difference of ${Math.round(Math.abs(claimed - detTotalExp) * 10) / 10} yrs.`,
    });
  }

  const riskScore = data.authenticity_risk_score ?? null;
  const riskLevel = riskScore == null ? "N/A" : riskScore < 30 ? "Low" : riskScore < 60 ? "Medium" : "High";

  return {
    file_name: filename,
    candidate_name: data.candidate_name || filename,
    work_history: workHistory,
    education,
    required_skills_count: (data.required_skills || []).length,
    matched_skills_count: (data.matched_skills || []).length,
    skill_match_score: skillMatch,
    required_experience_years: data.required_experience_years ?? null,
    relevant_experience_years: data.relevant_experience_years ?? null,
    experience_score: expScore,
    deterministic_total_experience_years: detTotalExp,
    dominant_company_tier: dominantTier,
    company_score: companyScore,
    num_companies: workHistory.length,
    avg_tenure_years: avgTenureYears,
    stability_score: stabilityScore,
    projects_quality_score: projectsScore,
    projects_quality_notes: data.projects_quality_notes || "",
    auto_score: autoScore,
    auto_score_max: 85,
    authenticity_risk_score: riskScore,
    risk_level: riskLevel,
    designation_inflation_flags: data.designation_inflation_flags || [],
    skill_anachronism_flags: data.skill_anachronism_flags || [],
    experience_inflation_flags: experienceInflationFlags,
    other_red_flags: data.other_red_flags || [],
    gaps,
    overlaps,
    recommendation: data.recommendation || "",
  };
}

// Small concurrency limiter so a batch of resumes doesn't fire N simultaneous
// Claude calls at once (rate-limit friendly), but still runs in parallel.
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const idx = next++;
      try {
        results[idx] = { status: "fulfilled", value: await worker(items[idx], idx) };
      } catch (err) {
        results[idx] = { status: "rejected", reason: err };
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, run);
  await Promise.all(workers);
  return results;
}
