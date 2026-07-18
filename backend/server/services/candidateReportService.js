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
// Card-grid layout with real ring/donut charts, matching the reference
// screening-report design. Two-pass per card: measure content height first
// (via heightOfString), draw the card border at that exact height, then
// render the content inside it — so borders always hug their content.

const COLOR = {
  navy: "#0B2545", navyLite: "#EAF0FB", green: "#1E8E3E", greenLite: "#EAF3DE",
  orange: "#C2410C", orangeLite: "#FFF3E8", red: "#DC2626", redLite: "#FEF2F2",
  gray: "#64748B", lightGray: "#E2E8F0", border: "#E5E7EB", bg: "#F8FAFC", ink: "#0F172A",
  brandNavy: "#050B2C", brandOrange: "#D9782D", brandOrangeLite: "#FDECDD",
};

const PAGE_MARGIN = 36;
const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - PAGE_MARGIN * 2;

function riskColor(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("high") && !l.includes("hire") && !l.includes("interview") && !l.includes("success")) return COLOR.red;
  if (l.includes("medium")) return COLOR.orange;
  if (l.includes("low")) return COLOR.green;
  return COLOR.gray;
}

function percentColor(pct) {
  if (pct >= 75) return COLOR.green;
  if (pct >= 50) return COLOR.orange;
  return COLOR.red;
}

// Draws a ring/donut: gray background track + colored progress arc, with
// a percentage (or short label) centered inside.
function drawRing(doc, cx, cy, radius, thickness, percent, color, centerText, centerFontSize = 13) {
  const clamped = Math.max(0, Math.min(100, percent));
  const steps = 72;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (clamped / 100) * 2 * Math.PI;

  doc.save();
  doc.lineWidth(thickness).lineCap("round").lineJoin("round");

  // background track
  doc.strokeColor(COLOR.lightGray);
  doc.circle(cx, cy, radius).stroke();

  // progress arc (only if > 0)
  if (clamped > 0.5) {
    doc.strokeColor(color);
    doc.moveTo(cx + radius * Math.cos(startAngle), cy + radius * Math.sin(startAngle));
    for (let i = 1; i <= steps; i++) {
      const t = startAngle + (endAngle - startAngle) * (i / steps);
      doc.lineTo(cx + radius * Math.cos(t), cy + radius * Math.sin(t));
    }
    doc.stroke();
  }
  doc.restore();

  if (centerText != null) {
    doc.fontSize(centerFontSize).font("Helvetica-Bold").fillColor(COLOR.ink);
    doc.text(String(centerText), cx - radius, cy - centerFontSize / 2 - 1, { width: radius * 2, align: "center" });
    doc.fillColor("#000").font("Helvetica");
  }
}

// ─── Content item DSL used by measureItems()/renderItems() ──────────────────
// { type:'kv', label, value }
// { type:'check', ok, text }              -- YES/NO row (skills/responsibilities)
// { type:'bullet', text, color }
// { type:'text', text, bold, color, size }
// { type:'gap', h }

function itemToLine(doc, item, width) {
  doc.fontSize(item.size || 9).font(item.bold ? "Helvetica-Bold" : "Helvetica");
  switch (item.type) {
    case "kv":
      return `${item.label}: ${item.value ?? "-"}`;
    case "check":
      return `${item.ok ? "\u2713" : "\u2715"}  ${item.text}`;
    case "bullet":
      return `\u2022  ${item.text}`;
    case "text":
      return item.text;
    default:
      return "";
  }
}

function measureItems(doc, items, width) {
  let h = 0;
  items.forEach((item) => {
    if (item.type === "gap") { h += item.h; return; }
    const line = itemToLine(doc, item, width);
    doc.fontSize(item.size || 9).font(item.bold ? "Helvetica-Bold" : "Helvetica");
    h += doc.heightOfString(line, { width }) + 3;
  });
  return h;
}

function renderItems(doc, x, y, items, width) {
  let cy = y;
  items.forEach((item) => {
    if (item.type === "gap") { cy += item.h; return; }
    const line = itemToLine(doc, item, width);
    let color = item.color || "#000";
    if (item.type === "check") color = item.ok ? COLOR.green : COLOR.red;
    doc.fontSize(item.size || 9).font(item.bold ? "Helvetica-Bold" : "Helvetica").fillColor(color);
    doc.text(line, x, cy, { width });
    cy += doc.heightOfString(line, { width }) + 3;
    doc.fillColor("#000");
  });
  return cy;
}

const CARD_PAD = 12;
const HEADER_H = 20;

// Renders one numbered card at (x,y) with given width; returns bottom Y.
function renderCard(doc, x, y, width, num, title, items, opts = {}) {
  const innerW = width - CARD_PAD * 2;
  doc.fontSize(9);
  const contentH = measureItems(doc, items, innerW);
  const cardH = HEADER_H + contentH + CARD_PAD * 2 + (opts.extraH || 0) + (opts.footerH || 0);

  // card background + border
  doc.roundedRect(x, y, width, cardH, 8).fillAndStroke("#FFFFFF", COLOR.border);
  // thin brand accent bar along the top edge, matching the report's header colors
  doc.save();
  doc.roundedRect(x, y, width, cardH, 8).clip();
  doc.rect(x, y, width, 3).fillColor(opts.accent || COLOR.brandNavy).fill();
  doc.restore();

  // numbered badge + title
  const badgeCx = x + CARD_PAD + 7, badgeCy = y + CARD_PAD + 7;
  doc.circle(badgeCx, badgeCy, 9).fillColor(COLOR.navyLite).fill();
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor(COLOR.navy)
    .text(String(num), badgeCx - 9, badgeCy - 4.5, { width: 18, align: "center" });
  doc.fontSize(10.5).font("Helvetica-Bold").fillColor(COLOR.ink)
    .text(title, x + CARD_PAD + 20, y + CARD_PAD + 1, { width: innerW - 20 });
  doc.fillColor("#000");

  let contentY = y + CARD_PAD + HEADER_H;
  if (opts.renderExtra) contentY = opts.renderExtra(doc, x + CARD_PAD, contentY, innerW) || contentY;

  const afterItemsY = renderItems(doc, x + CARD_PAD, contentY, items, innerW);
  if (opts.renderFooter) opts.renderFooter(doc, x + CARD_PAD, afterItemsY, innerW);
  return y + cardH;
}

function ensureSpace(doc, neededH) {
  if (doc.y + neededH > PAGE_H - PAGE_MARGIN) {
    doc.addPage();
    doc.y = 40;
  }
}

// Slim repeated header drawn on every page after the first (the first page
// gets the full branded header drawn inline in buildPdfBuffer).
function drawContinuationHeader(doc) {
  doc.rect(0, 0, PAGE_W, 28).fillColor("#FFFFFF").fill();
  doc.moveTo(0, 28).lineTo(PAGE_W, 28).strokeColor(COLOR.border).lineWidth(1).stroke();
  doc.fontSize(9.5).font("Helvetica-Bold").fillColor(COLOR.brandNavy)
    .text("Pick", PAGE_MARGIN, 9, { continued: true })
    .fillColor(COLOR.brandOrange).text("YourHire");
  doc.fontSize(7.5).font("Helvetica").fillColor(COLOR.gray)
    .text("Candidate Evaluation Report — Confidential", 0, 10, { width: PAGE_W - PAGE_MARGIN, align: "right" });
  doc.fillColor("#000");
}

// Same math renderCard uses internally, exposed separately so a whole row's
// height can be known BEFORE any card in it is drawn — this is what lets
// ensureSpace() move the entire row to a fresh page together instead of
// letting pdfkit's automatic mid-text page break split a card in half.
function measureCardHeight(doc, width, items, opts = {}) {
  const innerW = width - CARD_PAD * 2;
  doc.fontSize(9);
  const contentH = measureItems(doc, items, innerW);
  return HEADER_H + contentH + CARD_PAD * 2 + (opts.extraH || 0) + (opts.footerH || 0);
}

export function buildPdfBuffer(report, meta = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.on("pageAdded", () => drawContinuationHeader(doc));

    const p = report.candidate_profile || {};
    const gap = 14;

    // ── Header bar (white, branded) ──
    const HEADER_H2 = 62;
    doc.rect(0, 0, PAGE_W, HEADER_H2).fillColor("#FFFFFF").fill();
    doc.moveTo(0, HEADER_H2).lineTo(PAGE_W, HEADER_H2).strokeColor(COLOR.border).lineWidth(1).stroke();

    // Logo mark: rounded navy square with an orange accent bar, then wordmark
    doc.roundedRect(PAGE_MARGIN, 16, 30, 30, 7).fillColor(COLOR.brandNavy).fill();
    doc.roundedRect(PAGE_MARGIN + 6, 24, 18, 5, 2.5).fillColor(COLOR.brandOrange).fill();
    doc.roundedRect(PAGE_MARGIN + 6, 31, 12, 5, 2.5).fillColor("#FFFFFF").fillOpacity(0.85).fill();
    doc.fillOpacity(1);
    doc.fontSize(13.5).font("Helvetica-Bold").fillColor(COLOR.brandNavy)
      .text("Pick", PAGE_MARGIN + 38, 18, { continued: true })
      .fillColor(COLOR.brandOrange).text("YourHire");
    doc.fontSize(7).font("Helvetica").fillColor(COLOR.gray)
      .text("Right People. Great Companies.", PAGE_MARGIN + 38, 33);

    // Center title
    const titleBoxX = PAGE_MARGIN + 120, titleBoxW = PAGE_W - titleBoxX * 2;
    doc.fontSize(14).font("Helvetica-Bold").fillColor(COLOR.brandNavy)
      .text("CANDIDATE EVALUATION REPORT", titleBoxX, 15, { width: titleBoxW, align: "center" });
    const subA = "For Internal Use Only  |  ", subB = "Confidential";
    doc.fontSize(8).font("Helvetica");
    const subAW = doc.widthOfString(subA);
    doc.fontSize(8).font("Helvetica-Bold");
    const subBW = doc.widthOfString(subB);
    const subStartX = titleBoxX + (titleBoxW - subAW - subBW) / 2;
    doc.fontSize(8).font("Helvetica").fillColor(COLOR.gray).text(subA, subStartX, 34, { lineBreak: false });
    doc.fontSize(8).font("Helvetica-Bold").fillColor(COLOR.brandOrange).text(subB, subStartX + subAW, 34, { lineBreak: false });

    // Report date badge (top right)
    const dateStr = new Date(meta.createdAt || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const badgeW = 128;
    doc.roundedRect(PAGE_W - PAGE_MARGIN - badgeW, 14, badgeW, 34, 8).fillColor(COLOR.brandNavy).fill();
    doc.fontSize(7).font("Helvetica").fillColor("#C7D2E8").text("REPORT DATE", PAGE_W - PAGE_MARGIN - badgeW + 12, 21);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#FFFFFF").text(dateStr, PAGE_W - PAGE_MARGIN - badgeW + 12, 32);
    doc.fillColor("#000");

    doc.y = HEADER_H2 + 16;

    // ── ROW 1: Candidate Summary | Overall Role Match Score (with donut) ──
    const col2W = (CONTENT_W - gap) / 2;
    const leftX = PAGE_MARGIN, rightX = PAGE_MARGIN + col2W + gap;
    const row1Y = doc.y;

    const summaryItems = [
      { type: "kv", label: "Current Designation", value: p.designation },
      { type: "kv", label: "Total Experience", value: p.experience ? `${p.experience} Years` : null },
      { type: "kv", label: "Current Company", value: p.current_company_name },
      { type: "kv", label: "Current Location", value: p.current_location },
      { type: "kv", label: "Preferred Location", value: p.preferred_location },
      { type: "kv", label: "Notice Period", value: p.notice_period },
      { type: "kv", label: "Current CTC", value: p.current_ctc ? `Rs. ${p.current_ctc}` : null },
      { type: "kv", label: "Expected CTC", value: p.expected_ctc ? `Rs. ${p.expected_ctc}` : null },
      { type: "kv", label: "Highest Qualification", value: p.highest_qualification },
    ];

    const candidateName = p.name || meta.candidateName || "Candidate";
    const initials = candidateName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";
    const recText = report.recommendation || "";
    const recIsPositive = /highly recommended|^recommended/i.test(recText);
    const recIsCaution = /reservation/i.test(recText);
    const recColor = recIsPositive ? COLOR.green : recIsCaution ? COLOR.brandOrange : recText ? COLOR.red : COLOR.gray;
    const recBg = recIsPositive ? COLOR.greenLite : recIsCaution ? COLOR.brandOrangeLite : recText ? COLOR.redLite : COLOR.bg;

    const avatarHeaderH = 50;
    const recFooterH = 40;

    const endY1 = renderCard(doc, leftX, row1Y, col2W, 1, "Candidate Summary", summaryItems, {
      accent: COLOR.brandNavy,
      extraH: avatarHeaderH,
      footerH: recFooterH,
      renderExtra: (doc, cx0, cy0, innerW) => {
        doc.circle(cx0 + 19, cy0 + 19, 19).fillColor(COLOR.brandNavy).fill();
        doc.fontSize(13).font("Helvetica-Bold").fillColor("#fff")
          .text(initials, cx0, cy0 + 12, { width: 38, align: "center" });
        doc.fillColor("#000");
        doc.fontSize(13).font("Helvetica-Bold").fillColor(COLOR.ink).text(candidateName, cx0 + 48, cy0 + 4, { width: innerW - 48 });
        doc.fontSize(9).font("Helvetica-Bold").fillColor(COLOR.brandOrange).text(p.designation || "—", cx0 + 48, cy0 + 21, { width: innerW - 48 });
        return cy0 + avatarHeaderH + 4;
      },
      renderFooter: (doc, cx0, cy0, innerW) => {
        const fy = cy0 + 6;
        doc.roundedRect(cx0, fy, innerW, recFooterH - 6, 8).fillColor(recBg).fill();
        // small check/status dot
        doc.circle(cx0 + 18, fy + (recFooterH - 6) / 2, 9).fillColor(recColor).fill();
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#fff").text(recIsPositive ? "\u2713" : recIsCaution ? "!" : "\u2715", cx0 + 18 - 5, fy + (recFooterH - 6) / 2 - 5, { width: 10, align: "center" });
        doc.fontSize(9.5).font("Helvetica-Bold").fillColor(recColor)
          .text(recText || "Recommendation pending", cx0 + 34, fy + 6, { width: innerW - 44 });
        doc.fontSize(7.5).font("Helvetica").fillColor(COLOR.gray)
          .text("Overall Recommendation", cx0 + 34, fy + (recFooterH - 6) / 2 + 4, { width: innerW - 44 });
        doc.fillColor("#000");
      },
    });

    // Right card: donut + score breakdown bars, drawn via renderExtra hook
    const breakdown = [
      ["Skills Match", report.skills_match?.score, report.skills_match?.max],
      ["Experience Match", report.experience_match?.score, report.experience_match?.max],
      ["Responsibilities Match", report.responsibilities_match?.score, report.responsibilities_match?.max],
      ["Industry / Domain Match", report.domain_match?.score, report.domain_match?.max],
      ["Education & Certifications", report.education_match?.score, report.education_match?.max],
    ];
    const barsH = breakdown.length * 15;
    const donutH = 108;
    const matchScore = report.final_match_score ?? 0;
    const scoreColor = percentColor(matchScore);

    const endY2 = renderCard(doc, rightX, row1Y, col2W, 2, `Overall Role Match Score${report.job_title ? ` — ${report.job_title}` : ""}`, [], {
      accent: COLOR.brandOrange,
      extraH: donutH + barsH + 8,
      renderExtra: (doc, cx0, cy0, innerW) => {
        const ringCx = cx0 + 44, ringCy = cy0 + 46;
        drawRing(doc, ringCx, ringCy, 34, 9, matchScore, scoreColor, `${matchScore}%`, 15);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(scoreColor)
          .text(report.match_label || "", cx0, cy0 + 86, { width: 92, align: "center" });

        // recommendation badge
        doc.roundedRect(cx0 + 100, cy0 + 4, innerW - 100, 30, 6).fillColor(COLOR.greenLite).fill();
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#3B6D11")
          .text(report.recommendation || "", cx0 + 108, cy0 + 13, { width: innerW - 116 });
        doc.fillColor("#000");

        // score breakdown bars
        let by = cy0 + 44;
        const barX = cx0 + 100, barW = innerW - 100 - 34;
        breakdown.forEach(([label, score, max]) => {
          doc.fontSize(7.8).font("Helvetica").fillColor(COLOR.gray).text(label, barX, by, { width: barW });
          by += 10;
          doc.roundedRect(barX, by, barW, 5, 2.5).fillColor(COLOR.lightGray).fill();
          const pct = max ? (score / max) : 0;
          if (pct > 0) doc.roundedRect(barX, by, barW * pct, 5, 2.5).fillColor(COLOR.navy).fill();
          doc.fontSize(7.5).font("Helvetica-Bold").fillColor(COLOR.ink).text(`${score ?? 0}/${max ?? 0}`, barX + barW + 4, by - 2);
          doc.fillColor("#000");
          by += 11;
        });
        return by;
      },
    });

    doc.y = Math.max(endY1, endY2) + gap;

    // ── ROW 2: Skill Match | Experience Match + Domain | Responsibilities Match ──
    const col3W = (CONTENT_W - gap * 2) / 3;
    const c1x = PAGE_MARGIN, c2x = PAGE_MARGIN + col3W + gap, c3x = PAGE_MARGIN + (col3W + gap) * 2;

    const skillItems = [
      ...(report.skills_match?.rows || []).map((r) => ({ type: "check", ok: r.match, text: `${r.skill}`, size: 8.3 })),
      { type: "gap", h: 3 },
      { type: "text", text: `Overall Technical Skill Match: ${report.skills_match?.overall_percent ?? "-"}%`, bold: true, color: COLOR.green, size: 9 },
    ];

    const expDomainItems = [
      { type: "kv", label: "Min Experience (JD)", value: report.experience_match?.min_experience_years != null ? `${report.experience_match.min_experience_years} yrs` : "-" },
      { type: "kv", label: "Relevant Experience", value: report.experience_match?.relevant_experience_years != null ? `${report.experience_match.relevant_experience_years} yrs` : "-" },
      { type: "text", text: `Experience Match Score: ${report.experience_match?.percent ?? "-"}%`, bold: true, color: COLOR.green, size: 9 },
      { type: "gap", h: 8 },
      { type: "text", text: "Domain Experience", bold: true, size: 9 },
      { type: "text", text: (report.domain_match?.domains || []).join(", ") || "-", size: 8.5 },
    ];

    const respItems = [
      ...(report.responsibilities_match?.rows || []).map((r) => ({ type: "check", ok: r.match, text: r.responsibility, size: 8.3 })),
      { type: "gap", h: 3 },
      { type: "text", text: `Responsibilities Match: ${report.responsibilities_match?.percent ?? "-"}%`, bold: true, color: COLOR.green, size: 9 },
    ];

    // Measure all three BEFORE drawing any of them, so if the row doesn't
    // fit on the current page, the WHOLE row moves to the next page together.
    const row2MaxH = Math.max(
      measureCardHeight(doc, col3W, skillItems),
      measureCardHeight(doc, col3W, expDomainItems),
      measureCardHeight(doc, col3W, respItems)
    );
    ensureSpace(doc, row2MaxH);
    const row2Y = doc.y;

    const endY_c1 = renderCard(doc, c1x, row2Y, col3W, 3, "Skill Match Analysis", skillItems);
    const endY_c2 = renderCard(doc, c2x, row2Y, col3W, 4, "Experience Match", expDomainItems);
    const endY_c3 = renderCard(doc, c3x, row2Y, col3W, 6, "Responsibilities Match", respItems);

    doc.y = Math.max(endY_c1, endY_c2, endY_c3) + gap;

    // ── ROW 3: Profile Summary | Employment Timeline | Evaluation Summary ──
    const profileItems = [
      { type: "kv", label: "Total Skills Identified", value: report.total_skills_identified },
      { type: "kv", label: "Certifications", value: report.certifications_count },
      { type: "kv", label: "Companies Worked", value: report.companies_worked_count },
      { type: "gap", h: 6 },
      { type: "text", text: "Top Skills", bold: true, size: 9 },
      { type: "text", text: (report.top_skills || []).join(", ") || "-", size: 8.5 },
    ];

    const timelineItems = [];
    (report.employment_timeline || []).forEach((e) => {
      timelineItems.push({ type: "text", text: `${e.company || "-"} — ${e.designation || "-"}`, bold: true, size: 8.5 });
      timelineItems.push({ type: "text", text: `${e.start || "-"} to ${e.end || "-"}  (${e.duration || "-"})`, color: COLOR.gray, size: 8 });
      timelineItems.push({ type: "gap", h: 3 });
    });
    if (timelineItems.length === 0) timelineItems.push({ type: "text", text: "No employment history on record.", color: COLOR.gray, size: 8.5 });
    timelineItems.push({ type: "text", text: `Employment Stability Score: ${report.employment_stability_score ?? "-"} / 5`, bold: true, size: 9 });

    const evalItems = [
      { type: "text", text: "Profile Strengths", bold: true, color: COLOR.green, size: 9 },
      ...(report.profile_strengths || []).map((s) => ({ type: "bullet", text: s, size: 8.3 })),
      { type: "gap", h: 6 },
      { type: "text", text: "Areas to Consider", bold: true, color: COLOR.orange, size: 9 },
      ...(report.areas_to_consider || []).map((s) => ({ type: "bullet", text: s, size: 8.3 })),
    ];

    const row3MaxH = Math.max(
      measureCardHeight(doc, col3W, profileItems),
      measureCardHeight(doc, col3W, timelineItems),
      measureCardHeight(doc, col3W, evalItems)
    );
    ensureSpace(doc, row3MaxH);
    const row3Y = doc.y;

    const endY_p1 = renderCard(doc, c1x, row3Y, col3W, 7, "Profile Summary", profileItems);
    const endY_p2 = renderCard(doc, c2x, row3Y, col3W, 8, "Employment Timeline", timelineItems);
    const endY_p3 = renderCard(doc, c3x, row3Y, col3W, 9, "Evaluation Summary", evalItems);

    doc.y = Math.max(endY_p1, endY_p2, endY_p3) + gap;

    // ── ROW 4: Key Metrics strip (mini rings) ──
    const metrics = [
      ["Keyword Coverage", report.keyword_coverage_percent, true],
      ["ATS Compatibility", report.ats_compatibility_percent, true],
      ["Resume Quality", report.resume_quality_percent, true],
      ["Career Stability", report.career_stability_percent, true],
      ["Interview Success", report.interview_success_probability_percent, true],
    ];
    const stripH = 92;
    ensureSpace(doc, stripH);
    const stripY = doc.y;
    const cellW = CONTENT_W / metrics.length;
    doc.roundedRect(PAGE_MARGIN, stripY, CONTENT_W, stripH, 8).fillAndStroke("#FFFFFF", COLOR.border);
    metrics.forEach(([label, val, isPct], i) => {
      const cx = PAGE_MARGIN + cellW * i + cellW / 2;
      const cy = stripY + 40;
      if (isPct) {
        const pct = Number(val) || 0;
        drawRing(doc, cx, cy, 24, 6, pct, percentColor(pct), `${pct}%`, 9.5);
      } else {
        const rc = riskColor(val);
        doc.fillOpacity(0.15).circle(cx, cy, 24).fillColor(rc).fill();
        doc.fillOpacity(1);
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor(rc).text(String(val ?? "-"), cx - 24, cy - 5, { width: 48, align: "center" });
      }
      doc.fillColor("#000").fontSize(7).font("Helvetica").text(label, PAGE_MARGIN + cellW * i + 2, stripY + 72, { width: cellW - 4, align: "center" });
    });
    doc.y = stripY + stripH + gap;

    // ── ROW 5: Interview Focus Areas (full width) ──
    const focusItems = (report.interview_focus_areas || []).map((s) => ({ type: "bullet", text: s, size: 8.5 }));
    if (focusItems.length === 0) focusItems.push({ type: "text", text: "-", size: 8.5 });
    ensureSpace(doc, measureCardHeight(doc, CONTENT_W, focusItems));
    renderCard(doc, PAGE_MARGIN, doc.y, CONTENT_W, 11, "Interview Focus Areas", focusItems);

    doc.y += 16;
    ensureSpace(doc, 30);
    const bandY = doc.y;
    doc.roundedRect(PAGE_MARGIN, bandY, CONTENT_W, 26, 6).fillColor(COLOR.brandNavy).fill();
    doc.fontSize(7.5).font("Helvetica").fillColor("#C7D2E8")
      .text("This report is prepared by PickYourHire for candidate evaluation purposes only and should be validated during the interview process.", PAGE_MARGIN + 14, bandY + 6, { width: CONTENT_W - 200 });
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#FFFFFF")
      .text("PickYourHire Consultants Private Limited", PAGE_MARGIN, bandY + 9, { width: CONTENT_W - 14, align: "right" });
    doc.fillColor("#000");

    doc.end();
  });
}

export async function getOrRenderPdf(reportId) {
  const r = await pool.query(`SELECT report_data, pdf_bytes, candidate_name, created_at FROM candidate_reports WHERE id=$1`, [reportId]);
  if (r.rows.length === 0) throw new Error("Report not found");
  const row = r.rows[0];

  if (row.pdf_bytes) return { buffer: row.pdf_bytes, candidateName: row.candidate_name };

  const reportData = typeof row.report_data === "string" ? JSON.parse(row.report_data) : row.report_data;
  const buffer = await buildPdfBuffer(reportData, { candidateName: row.candidate_name, createdAt: row.created_at });

  // Cache the rendered PDF too, so even the (cheap) rendering step is skipped next time
  await pool.query(`UPDATE candidate_reports SET pdf_bytes=$1 WHERE id=$2`, [buffer, reportId]).catch(() => {});

  return { buffer, candidateName: row.candidate_name };
}
