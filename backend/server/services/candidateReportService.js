// backend/server/services/candidateReportService.js
//
// Generates the structured data behind a "Candidate Evaluation Report" PDF
// (JD-match score, skill/experience/responsibilities breakdown, employment
// timeline, profile summary, strengths/areas to consider, interview focus
// areas). Deliberately excludes recruiter remarks — that section is never
// requested from the model and never rendered in the PDF.
//
// Cost control: the Claude call happens ONCE per (candidate, JD) pair. The
// resulting JSON is persisted in candidate_reports.report_data. Every later
// request for that same pairing is served straight from the DB — buildPdf()
// below only ever reads from already-fetched JSON, it never calls Claude.

import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import pool from "../config/db.js";

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = process.env.REPORT_CLAUDE_MODEL || "claude-sonnet-4-5";

export const hashJdText = (text) => crypto.createHash("md5").update(text.trim()).digest("hex");

// ─── RESUME TEXT EXTRACTION (reuses the same file types as the rest of the app) ─

async function extractTextFromFile(filePath, mimetype) {
  if (mimetype === "text/plain") return fs.readFileSync(filePath, "utf-8");
  if (mimetype === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text;
  }
  if (mimetype.includes("word") || filePath.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  return "";
}

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

async function getResumeText(resumePathOrUrl) {
  if (!resumePathOrUrl) return "";
  if (resumePathOrUrl.startsWith("http")) return ""; // remote links aren't fetched here — score from profile fields only
  const candidates = [
    path.join(UPLOADS_ROOT, "resumes", path.basename(resumePathOrUrl)),
    path.join(UPLOADS_ROOT, path.basename(resumePathOrUrl)),
    resumePathOrUrl,
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const mime = p.endsWith(".pdf") ? "application/pdf" : p.endsWith(".docx") ? "application/word" : "text/plain";
      try {
        return await extractTextFromFile(p, mime);
      } catch {
        return "";
      }
    }
  }
  return "";
}

// ─── LOOK UP A CANDIDATE'S PROFILE + RESUME ACROSS THE THREE CANDIDATE SOURCES ──

export async function loadCandidateProfile(candidateId, sourceType) {
  let row;
  if (sourceType === "bulk") {
    const r = await pool.query(
      `SELECT id, name, email, contact, role as designation, experience, skills, technical_skills, soft_skills,
              current_ctc, expected_ctc, current_location, preferred_location, notice_period,
              current_company_name, highest_qualification, resume_link, linkedin
       FROM bulk_candidates WHERE id=$1`,
      [candidateId]
    );
    row = r.rows[0];
    if (row) row.resume_path = row.resume_link;
  } else if (sourceType === "referral") {
    const r = await pool.query(
      `SELECT id, name, email, NULL as contact, department as designation, experience, skills, NULL as technical_skills,
              NULL as soft_skills, NULL as current_ctc, NULL as expected_ctc, NULL as current_location,
              NULL as preferred_location, NULL as notice_period, company as current_company_name,
              NULL as highest_qualification, cv_file, linkedin
       FROM referrals WHERE id=$1`,
      [candidateId]
    );
    row = r.rows[0];
    if (row) row.resume_path = row.cv_file;
  } else {
    const r = await pool.query(
      `SELECT id, name, email, contact, job_role as designation, NULL as experience, skills, technical_skills,
              soft_skills, cctc as current_ctc, ectc as expected_ctc, current_location, preferred_location,
              notice_period, current_company_name, highest_qualification, resume_file_path, linkedin_profile as linkedin
       FROM users WHERE id=$1 AND role='candidate'`,
      [candidateId]
    );
    row = r.rows[0];
    if (row) row.resume_path = row.resume_file_path;
  }
  if (!row) throw new Error(`Candidate ${candidateId} (${sourceType}) not found`);
  row.resume_text = await getResumeText(row.resume_path);
  return row;
}

// ─── CLAUDE CALL ────────────────────────────────────────────────────────────

const stripFences = (t) => t.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim();

async function callClaude(prompt, maxTokens = 4000) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured on the server");
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
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Claude API error");
  return data.content.map((b) => b.text || "").join("");
}

const SCHEMA_INSTRUCTIONS = `Return ONLY a single JSON object, no markdown fences, no commentary, matching exactly this schema:

{
  "skills_match": { "score": <0-35>, "max": 35, "rows": [ {"skill": string, "required": string, "candidate": string, "match": boolean} ] , "overall_percent": <0-100> },
  "experience_match": { "score": <0-25>, "max": 25, "min_experience_years": number|null, "relevant_experience_years": number|null, "percent": <0-100> },
  "responsibilities_match": { "score": <0-20>, "max": 20, "rows": [ {"responsibility": string, "match": boolean} ], "percent": <0-100> },
  "domain_match": { "score": <0-10>, "max": 10, "domains": [string] },
  "education_match": { "score": <0-10>, "max": 10, "notes": string },
  "final_match_score": <0-100>,
  "match_label": "Excellent Match"|"Strong Match"|"Good Match"|"Partial Match"|"Weak Match",
  "recommendation": "Highly Recommended for Interview"|"Recommended for Interview"|"Consider with Reservations"|"Not Recommended",
  "employment_timeline": [ {"company": string, "designation": string, "start": string, "end": string, "duration": string} ],
  "top_skills": [string],
  "total_skills_identified": number,
  "certifications_count": number,
  "companies_worked_count": number,
  "employment_stability_score": <0-5>,
  "profile_strengths": [string],
  "areas_to_consider": [string],
  "interview_focus_areas": [string],
  "keyword_coverage_percent": <0-100>,
  "ats_compatibility_percent": <0-100>,
  "resume_quality_percent": <0-100>,
  "career_stability_percent": <0-100>,
  "interview_success_probability_percent": <0-100>,
  "overall_hire_probability_percent": <0-100>
}

Rules:
- Every *_percent and score field must be a plain number, never null.
- "rows" in skills_match must cover every explicitly required skill from the JD (or, if no JD given, the candidate's top listed skills).
- "match": true only if the candidate profile/resume genuinely demonstrates that skill/responsibility.
- final_match_score should roughly equal the sum of skills_match.score + experience_match.score + responsibilities_match.score + domain_match.score + education_match.score (all out of 100 total), adjusted if something is clearly missing.
- profile_strengths and areas_to_consider: 3-5 short bullet points each, specific to this candidate vs this JD.
- interview_focus_areas: 3-6 short topics an interviewer should probe.
- Do NOT include anything resembling a "recruiter remarks" or free-text summary paragraph field — it is intentionally excluded from this schema.`;

async function generateReportWithClaude(candidate, jdText, jobTitle) {
  const prompt = `You are a senior technical recruiter producing a structured candidate-vs-job evaluation report, in the same spirit as an ATS screening report.

JOB TITLE: ${jobTitle || "Not specified"}
JOB DESCRIPTION / REQUIREMENTS:
${jdText ? jdText.slice(0, 6000) : "(No JD provided — evaluate general profile strength and role fit based on the candidate's stated designation/skills.)"}

CANDIDATE PROFILE:
Name: ${candidate.name}
Current Designation: ${candidate.designation || "Not specified"}
Current Company: ${candidate.current_company_name || "Not specified"}
Experience: ${candidate.experience || "Not specified"} years
Skills: ${candidate.skills || "Not specified"}
Technical Skills: ${candidate.technical_skills || "Not specified"}
Soft Skills: ${candidate.soft_skills || "Not specified"}
Highest Qualification: ${candidate.highest_qualification || "Not specified"}
Current Location: ${candidate.current_location || "Not specified"}
Preferred Location: ${candidate.preferred_location || "Not specified"}
Notice Period: ${candidate.notice_period || "Not specified"}

${candidate.resume_text ? `RESUME TEXT (use this as the primary source of truth for skills, employment timeline, and depth of experience):\n${candidate.resume_text.slice(0, 8000)}` : "(No resume text available — base the evaluation on the profile fields above only, and be conservative/generic where resume detail would normally be needed.)"}

${SCHEMA_INSTRUCTIONS}`;

  const raw = await callClaude(prompt);
  const cleaned = stripFences(raw);
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Could not parse the AI report response as JSON");
  }
  return parsed;
}

// ─── CACHE-AWARE ENTRY POINT ─────────────────────────────────────────────────
// Returns { report, cached, reportId }. Only calls Claude when no matching
// row exists yet for this (candidate, source_type, job_id/jd_hash).

export async function getOrCreateReport({ candidateId, sourceType, jobId, jdText, jobTitle, generatedBy }) {
  const jdHash = jobId ? null : hashJdText(jdText || "");

  const existing = await pool.query(
    `SELECT id, report_data, candidate_name, candidate_email FROM candidate_reports
     WHERE candidate_id=$1 AND source_type=$2
       AND ${jobId ? "job_id=$3" : "job_id IS NULL AND jd_hash=$3"}
     ORDER BY created_at DESC LIMIT 1`,
    [candidateId, sourceType, jobId || jdHash]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    return {
      reportId: row.id,
      cached: true,
      report: typeof row.report_data === "string" ? JSON.parse(row.report_data) : row.report_data,
      candidateName: row.candidate_name,
      candidateEmail: row.candidate_email,
    };
  }

  const candidate = await loadCandidateProfile(candidateId, sourceType);
  const reportData = await generateReportWithClaude(candidate, jdText, jobTitle);

  // Attach the profile-derived fields the PDF needs but that don't come from
  // Claude (these are exact data, no reason to have the model guess them).
  reportData.candidate_profile = {
    name: candidate.name,
    email: candidate.email,
    designation: candidate.designation,
    current_company_name: candidate.current_company_name,
    experience: candidate.experience,
    current_location: candidate.current_location,
    preferred_location: candidate.preferred_location,
    notice_period: candidate.notice_period,
    current_ctc: candidate.current_ctc,
    expected_ctc: candidate.expected_ctc,
    highest_qualification: candidate.highest_qualification,
  };
  reportData.job_title = jobTitle || null;

  // Deterministic notice-period risk bucket (not left to the model)
  const noticeDays = parseInt(String(candidate.notice_period || "").replace(/\D/g, ""), 10);
  reportData.notice_period_risk = isNaN(noticeDays) ? "Unknown" : noticeDays <= 15 ? "Low" : noticeDays <= 45 ? "Medium" : "High";

  const insert = await pool.query(
    `INSERT INTO candidate_reports
       (candidate_id, source_type, job_id, jd_hash, job_title, candidate_name, candidate_email, report_data, generated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [candidateId, sourceType, jobId || null, jdHash, jobTitle || null, candidate.name, candidate.email, JSON.stringify(reportData), generatedBy]
  );

  return { reportId: insert.rows[0].id, cached: false, report: reportData, candidateName: candidate.name, candidateEmail: candidate.email };
}

// ─── PDF RENDERING (pure function of already-fetched JSON — no Claude calls) ─

const COLOR = { navy: "#0B2545", green: "#1E8E3E", orange: "#C2410C", red: "#DC2626", gray: "#64748B", lightGray: "#E5E7EB", bg: "#F8FAFC" };

function drawBar(doc, x, y, width, height, percent, color) {
  doc.roundedRect(x, y, width, height, height / 2).fillColor(COLOR.lightGray).fill();
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * width;
  if (filled > 2) doc.roundedRect(x, y, filled, height, height / 2).fillColor(color).fill();
  doc.fillColor("#000");
}

function sectionHeader(doc, title) {
  doc.moveDown(0.6);
  doc.fontSize(12.5).fillColor(COLOR.navy).font("Helvetica-Bold").text(title);
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica").fillColor("#000");
}

export function buildPdfBuffer(report, meta = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const p = report.candidate_profile || {};

    // Header banner
    doc.rect(0, 0, doc.page.width, 60).fillColor(COLOR.navy).fill();
    doc.fillColor("#fff").fontSize(14).font("Helvetica-Bold").text("CONFIDENTIAL — Candidate Evaluation Report", 40, 22);
    doc.fontSize(8).font("Helvetica").text("For internal recruiter use only. Do not share without authorization.", 40, 42);
    doc.fillColor("#000").moveDown(3);
    doc.y = 80;

    // 1. Candidate Summary
    sectionHeader(doc, "1. Candidate Summary");
    const summaryRows = [
      ["Candidate Name", p.name || meta.candidateName || "-"],
      ["Current Designation", p.designation || "-"],
      ["Total Experience", p.experience ? `${p.experience} Years` : "-"],
      ["Current Company", p.current_company_name || "-"],
      ["Current Location", p.current_location || "-"],
      ["Preferred Location", p.preferred_location || "-"],
      ["Notice Period", p.notice_period || "-"],
      ["Current CTC", p.current_ctc ? `Rs. ${p.current_ctc}` : "-"],
      ["Expected CTC", p.expected_ctc ? `Rs. ${p.expected_ctc}` : "-"],
      ["Highest Qualification", p.highest_qualification || "-"],
    ];
    summaryRows.forEach(([label, value]) => {
      doc.font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(value);
    });

    // 2. Overall Role Match Score
    sectionHeader(doc, `2. Overall Role Match Score${report.job_title ? ` — ${report.job_title}` : ""}`);
    doc.font("Helvetica-Bold").fontSize(20).fillColor(COLOR.green).text(`${report.final_match_score ?? "-"} / 100`);
    doc.fontSize(10).fillColor(COLOR.gray).font("Helvetica").text(report.match_label || "");
    doc.moveDown(0.2);
    doc.fillColor("#000").font("Helvetica-Bold").fontSize(10).text(report.recommendation || "");
    doc.moveDown(0.3);

    const breakdown = [
      ["Skills Match", report.skills_match?.score, report.skills_match?.max],
      ["Experience Match", report.experience_match?.score, report.experience_match?.max],
      ["Responsibilities Match", report.responsibilities_match?.score, report.responsibilities_match?.max],
      ["Industry / Domain Match", report.domain_match?.score, report.domain_match?.max],
      ["Education & Certifications", report.education_match?.score, report.education_match?.max],
    ];
    breakdown.forEach(([label, score, max]) => {
      doc.font("Helvetica").fontSize(9.5).text(`${label}`, { continued: true }).text(`  ${score ?? 0}/${max ?? 0}`, { align: "right" });
      drawBar(doc, doc.x + 40, doc.y + 2, 200, 6, max ? (score / max) * 100 : 0, COLOR.navy);
      doc.moveDown(0.5);
    });

    // 3. Skill Match Analysis
    sectionHeader(doc, "3. Skill Match Analysis");
    (report.skills_match?.rows || []).forEach((r) => {
      doc.font("Helvetica").fontSize(9.5).fillColor(r.match ? COLOR.green : COLOR.red).text(`${r.match ? "YES" : "NO"} `, { continued: true })
        .fillColor("#000").text(`${r.skill} — required: ${r.required || "-"}, candidate: ${r.candidate || "-"}`);
    });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLOR.green).text(`Overall Technical Skill Match: ${report.skills_match?.overall_percent ?? "-"}%`);
    doc.fillColor("#000");

    // 4. Experience Match
    sectionHeader(doc, "4. Experience Match");
    doc.font("Helvetica").text(`Minimum Experience (JD): ${report.experience_match?.min_experience_years ?? "-"} yrs`);
    doc.text(`Relevant Experience: ${report.experience_match?.relevant_experience_years ?? "-"} yrs`);
    doc.font("Helvetica-Bold").fillColor(COLOR.green).text(`Experience Match Score: ${report.experience_match?.percent ?? "-"}%`);
    doc.fillColor("#000");

    // 5. Domain Experience
    sectionHeader(doc, "5. Domain Experience");
    doc.font("Helvetica").text((report.domain_match?.domains || []).join(",  ") || "-");

    // 6. Responsibilities Match
    sectionHeader(doc, "6. Responsibilities Match");
    (report.responsibilities_match?.rows || []).forEach((r) => {
      doc.font("Helvetica").fontSize(9.5).fillColor(r.match ? COLOR.green : COLOR.red).text(`${r.match ? "YES" : "NO"} `, { continued: true })
        .fillColor("#000").text(r.responsibility);
    });
    doc.font("Helvetica-Bold").fillColor(COLOR.green).text(`Responsibilities Match: ${report.responsibilities_match?.percent ?? "-"}%`);
    doc.fillColor("#000");

    // 7. Profile Summary
    sectionHeader(doc, "7. Profile Summary");
    doc.font("Helvetica").text(`Total Skills Identified: ${report.total_skills_identified ?? "-"}`);
    doc.text(`Certifications: ${report.certifications_count ?? "-"}`);
    doc.text(`Companies Worked: ${report.companies_worked_count ?? "-"}`);
    doc.text(`Top Skills: ${(report.top_skills || []).join(", ") || "-"}`);

    // 8. Employment Timeline
    sectionHeader(doc, "8. Employment Timeline");
    (report.employment_timeline || []).forEach((e) => {
      doc.font("Helvetica-Bold").fontSize(9.5).text(`${e.company || "-"} — ${e.designation || "-"}`);
      doc.font("Helvetica").fillColor(COLOR.gray).text(`${e.start || "-"} to ${e.end || "-"}  (${e.duration || "-"})`);
      doc.fillColor("#000");
    });
    doc.font("Helvetica-Bold").text(`Employment Stability Score: ${report.employment_stability_score ?? "-"} / 5`);

    // 9. Evaluation Summary (strengths + areas to consider only — NO recruiter remarks)
    sectionHeader(doc, "9. Evaluation Summary");
    doc.font("Helvetica-Bold").fillColor(COLOR.green).text("Profile Strengths");
    doc.font("Helvetica").fillColor("#000");
    (report.profile_strengths || []).forEach((s) => doc.text(`•  ${s}`));
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fillColor(COLOR.orange).text("Areas to Consider");
    doc.font("Helvetica").fillColor("#000");
    (report.areas_to_consider || []).forEach((s) => doc.text(`•  ${s}`));

    // Metrics strip
    sectionHeader(doc, "Key Metrics");
    const metrics = [
      ["Keyword Coverage", report.keyword_coverage_percent],
      ["ATS Compatibility", report.ats_compatibility_percent],
      ["Resume Quality", report.resume_quality_percent],
      ["Career Stability", report.career_stability_percent],
      ["Interview Success Probability", report.interview_success_probability_percent],
      ["Overall Hire Probability", report.overall_hire_probability_percent],
      ["Notice Period Risk", report.notice_period_risk],
    ];
    metrics.forEach(([label, val]) => {
      doc.font("Helvetica").fontSize(9.5).text(`${label}: `, { continued: true }).font("Helvetica-Bold").text(typeof val === "number" ? `${val}%` : String(val ?? "-"));
    });

    // 11. Interview Focus Areas
    sectionHeader(doc, "11. Interview Focus Areas");
    doc.font("Helvetica");
    (report.interview_focus_areas || []).forEach((s) => doc.text(`•  ${s}`));

    doc.moveDown(1);
    doc.fontSize(7.5).fillColor(COLOR.gray).text("Generated by PickYourHire — this report is for internal screening purposes and should be verified during the interview process.", { align: "center" });

    doc.end();
  });
}

export async function getOrRenderPdf(reportId) {
  const r = await pool.query(`SELECT report_data, pdf_bytes, candidate_name FROM candidate_reports WHERE id=$1`, [reportId]);
  if (r.rows.length === 0) throw new Error("Report not found");
  const row = r.rows[0];

  if (row.pdf_bytes) return { buffer: row.pdf_bytes, candidateName: row.candidate_name };

  const reportData = typeof row.report_data === "string" ? JSON.parse(row.report_data) : row.report_data;
  const buffer = await buildPdfBuffer(reportData, { candidateName: row.candidate_name });

  // Cache the rendered PDF too, so even the (cheap) rendering step is skipped next time
  await pool.query(`UPDATE candidate_reports SET pdf_bytes=$1 WHERE id=$2`, [buffer, reportId]).catch(() => {});

  return { buffer, candidateName: row.candidate_name };
}
