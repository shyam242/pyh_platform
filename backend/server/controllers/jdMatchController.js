import pool from "../config/db.js";
import fetch from "node-fetch";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-5";

const callClaude = async (prompt, maxTokens = 1500) => {
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
  return data.content[0].text;
};

const safeJSON = (text) => {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
};

// ─── MULTER CONFIG FOR JD FILE UPLOAD ─────────────────────────────────────────
const uploadDir = path.join(__dirname, "../../uploads/jd");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export const jdUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `jd-${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ─── EXTRACT TEXT FROM UPLOADED JD FILE (PDF/DOCX/TXT) ────────────────────────
const extractTextFromFile = async (filePath, mimetype) => {
  if (mimetype === "text/plain") {
    return fs.readFileSync(filePath, "utf-8");
  }
  if (mimetype === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (mimetype.includes("word") || filePath.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  return "";
};

// ─── 1. UPLOAD JD & EXTRACT REQUIREMENTS ─────────────────────────────────────
export const uploadJD = async (req, res) => {
  try {
    let jdText = req.body.job_description || "";

    if (req.file) {
      jdText = await extractTextFromFile(req.file.path, req.file.mimetype);
      fs.unlinkSync(req.file.path);
    }

    if (!jdText.trim()) {
      return res.status(400).json({ error: "Job description text or file is required" });
    }

    const prompt = `You are a senior technical recruiter. Extract structured requirements from this job description and return ONLY valid JSON (no markdown).

JOB DESCRIPTION:
${jdText.slice(0, 6000)}

Return this exact JSON:
{
  "job_title": "<extracted job title>",
  "required_skills": ["<skill1>", "<skill2>", "<skill3>", "..."],
  "preferred_skills": ["<skill1>", "<skill2>"],
  "min_experience": <number, years>,
  "max_experience": <number, years>,
  "department": "<department/function>",
  "summary": "<2 sentence summary of the role>"
}`;

    const raw = await callClaude(prompt, 1000);
    const parsed = safeJSON(raw);

    if (!parsed) return res.status(500).json({ error: "Failed to parse job description" });

    res.json({ success: true, jd_text: jdText.slice(0, 8000), parsed });
  } catch (err) {
    console.error("uploadJD error:", err);
    res.status(500).json({ error: err.message || "Failed to process JD" });
  }
};

// ─── 2. FILTER CANDIDATES BASED ON RECRUITER'S CRITERIA ──────────────────────
export const filterCandidates = async (req, res) => {
  try {
    const { min_experience, max_experience, skills, role, source } = req.body;
    // source: "all" | "referred" | "bulk"

    let referrals = [];
    let bulkCandidates = [];

    if (source !== "bulk") {
      const r = await pool.query(`
        SELECT r.id, r.name, r.email, r.skills, r.experience, r.company, r.department,
               r.industry, r.experience_type, r.cv_file, r.linkedin, r.status,
               u.name as referrer_name, u.company as referrer_company,
               'referral' as source_type
        FROM referrals r
        LEFT JOIN users u ON r.referrer_id = u.id
        ORDER BY r.id DESC
      `);
      referrals = r.rows;
    }

    if (source !== "referred") {
      const b = await pool.query(`
        SELECT id, name, email, skills, experience, current_company_name as company,
               NULL as department, NULL as industry, NULL as experience_type,
               resume_link as cv_file, linkedin, status,
               NULL as referrer_name, NULL as referrer_company,
               'bulk' as source_type
        FROM bulk_candidates
        ORDER BY id DESC
      `);
      bulkCandidates = b.rows;
    }

    let combined = [...referrals, ...bulkCandidates];

    // Filter by experience range
    if (min_experience !== undefined && min_experience !== null && min_experience !== "") {
      combined = combined.filter(c => {
        const exp = parseFloat(c.experience);
        return !isNaN(exp) && exp >= parseFloat(min_experience);
      });
    }
    if (max_experience !== undefined && max_experience !== null && max_experience !== "") {
      combined = combined.filter(c => {
        const exp = parseFloat(c.experience);
        return !isNaN(exp) && exp <= parseFloat(max_experience);
      });
    }

    // Filter by skills (any match)
    if (skills && skills.trim()) {
      const skillList = skills.toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
      combined = combined.filter(c => {
        const candidateSkills = (c.skills || "").toLowerCase();
        return skillList.some(s => candidateSkills.includes(s));
      });
    }

    // Filter by role/department keyword
    if (role && role.trim()) {
      const roleKw = role.toLowerCase();
      combined = combined.filter(c => {
        const text = `${c.department || ""} ${c.industry || ""} ${c.company || ""}`.toLowerCase();
        return text.includes(roleKw);
      });
    }

    res.json({ success: true, count: combined.length, candidates: combined });
  } catch (err) {
    console.error("filterCandidates error:", err);
    res.status(500).json({ error: err.message || "Failed to filter candidates" });
  }
};

// ─── WEIGHTED SCORING HELPER ─────────────────────────────────────────────────
// Weights sum to 100:
// Skills Match: 30, Experience Relevance: 20, Project Quality: 15,
// Company Background: 10, Stability (tenure): 10, Communication/Screening: 10,
// Availability/Notice Period: 5
const WEIGHTS = {
  skills_match: 30,
  experience_relevance: 20,
  project_quality: 15,
  company_background: 10,
  stability: 10,
  communication_screening: 10,
  availability: 5,
};

const computeWeightedScore = (subscores) => {
  let total = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const val = subscores[key] ?? 0; // 0-100
    total += (val / 100) * weight;
  }
  return Math.round(total);
};

// ─── 3. RUN BULK JD-CV MATCH ANALYSIS ────────────────────────────────────────
export const bulkAnalyze = async (req, res) => {
  try {
    const { jd_text, job_title, candidates } = req.body; // candidates: [{id, source_type}]

    if (!jd_text || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "jd_text and candidates array are required" });
    }

    const results = [];

    for (const cand of candidates) {
      try {
        let c;
        if (cand.source_type === "bulk") {
          const r = await pool.query(
            `SELECT id, name, skills, experience, current_company_name as company, resume_link
             FROM bulk_candidates WHERE id=$1`,
            [cand.id]
          );
          c = r.rows[0];
        } else {
          const r = await pool.query(
            `SELECT id, name, skills, experience, company, department, industry, experience_type, cv_file
             FROM referrals WHERE id=$1`,
            [cand.id]
          );
          c = r.rows[0];
        }

        if (!c) continue;

        const prompt = `You are a senior technical recruiter scoring a candidate against a job description using a weighted rubric. Return ONLY valid JSON (no markdown).

JOB DESCRIPTION:
Title: ${job_title || "Not specified"}
${jd_text.slice(0, 4000)}

CANDIDATE PROFILE:
Name: ${c.name}
Skills: ${c.skills || "Not provided"}
Experience: ${c.experience || "Not provided"} years
Current/Last Company: ${c.company || "Not provided"}

Score each component from 0-100 based on how well the candidate fits:
- skills_match: How well do candidate's skills match the JD's required skills?
- experience_relevance: Is candidate's years of experience and domain relevant to this role?
- project_quality: Based on described skills/profile, estimate quality/complexity of likely projects (0-100, default 50 if unknown)
- company_background: Quality/reputation of candidate's current/past company (0-100, default 50 if unknown)
- stability: Estimate tenure stability based on experience info (0-100, default 60 if unknown)
- communication_screening: Based on profile completeness/clarity, estimate communication readiness (0-100, default 60 if unknown)
- availability: Based on notice period if known, else default 70

Return this exact JSON:
{
  "skills_match": <0-100>,
  "experience_relevance": <0-100>,
  "project_quality": <0-100>,
  "company_background": <0-100>,
  "stability": <0-100>,
  "communication_screening": <0-100>,
  "availability": <0-100>,
  "matched_skills": ["<skill1>", "<skill2>"],
  "missing_skills": ["<skill1>", "<skill2>"],
  "why_shortlist": ["<reason1>", "<reason2>", "<reason3>"],
  "concerns": ["<concern1>"]
}`;

        const raw = await callClaude(prompt, 1200);
        const scores = safeJSON(raw);

        if (!scores) continue;

        const weighted_score = computeWeightedScore(scores);

        const resultObj = {
          candidate_id: c.id,
          source_type: cand.source_type,
          name: c.name,
          weighted_score,
          subscores: {
            skills_match: scores.skills_match,
            experience_relevance: scores.experience_relevance,
            project_quality: scores.project_quality,
            company_background: scores.company_background,
            stability: scores.stability,
            communication_screening: scores.communication_screening,
            availability: scores.availability,
          },
          matched_skills: scores.matched_skills || [],
          missing_skills: scores.missing_skills || [],
          why_shortlist: scores.why_shortlist || [],
          concerns: scores.concerns || [],
        };

        results.push(resultObj);

        // Cache result on referrals table if applicable
        if (cand.source_type !== "bulk") {
          await pool.query(
            `UPDATE referrals SET jd_match_score = $1, jd_match_data = $2, jd_match_at = NOW() WHERE id = $3`,
            [weighted_score, JSON.stringify(resultObj), c.id]
          ).catch(() => {});
        }
      } catch (innerErr) {
        console.error(`Error analyzing candidate ${cand.id}:`, innerErr.message);
      }
    }

    // Sort by weighted score descending
    results.sort((a, b) => b.weighted_score - a.weighted_score);

    res.json({ success: true, weights: WEIGHTS, results });
  } catch (err) {
    console.error("bulkAnalyze error:", err);
    res.status(500).json({ error: err.message || "Bulk analysis failed" });
  }
};

// ─── 4. PARSE CANDIDATE PROJECTS FROM RESUME ─────────────────────────────────
export const parseProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT resume_file_path, skills, technical_skills FROM users WHERE id=$1",
      [userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const { resume_file_path, skills, technical_skills } = result.rows[0];

    let resumeText = "";
    if (resume_file_path) {
      let filePath = resume_file_path;
      if (!filePath.startsWith("http")) {
        filePath = path.join(__dirname, "../../uploads/resumes", path.basename(resume_file_path));
        if (fs.existsSync(filePath)) {
          const mime = filePath.endsWith(".pdf") ? "application/pdf" : "application/msword";
          resumeText = await extractTextFromFile(filePath, mime);
        }
      }
    }

    if (!resumeText.trim()) {
      return res.status(400).json({ error: "No resume found to parse. Please upload your resume first." });
    }

    const prompt = `Extract all projects mentioned in this resume. Return ONLY valid JSON (no markdown).

RESUME TEXT:
${resumeText.slice(0, 8000)}

CANDIDATE SKILLS: ${skills || ""} ${technical_skills || ""}

Return this exact JSON:
{
  "projects": [
    {
      "title": "<project name>",
      "description": "<1-2 sentence description>",
      "technologies": ["<tech1>", "<tech2>"],
      "role": "<candidate's role in this project, if mentioned>",
      "impact": "<measurable impact/result if mentioned, else empty string>"
    }
  ],
  "total_projects_found": <number>
}`;

    const raw = await callClaude(prompt, 1500);
    const parsed = safeJSON(raw);

    if (!parsed) return res.status(500).json({ error: "Failed to parse projects" });

    await pool.query(
      "UPDATE users SET parsed_projects = $1, projects_parsed_at = NOW() WHERE id = $2",
      [JSON.stringify(parsed.projects || []), userId]
    ).catch(() => {});

    res.json({ success: true, ...parsed });
  } catch (err) {
    console.error("parseProjects error:", err);
    res.status(500).json({ error: err.message || "Failed to parse projects" });
  }
};

// ─── 5. SEARCH CANDIDATES BY PARSED PROJECTS (for recruiters) ───────────────
export const searchByProjects = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) return res.status(400).json({ error: "query parameter required" });

    const result = await pool.query(`
      SELECT id, name, email, parsed_projects, skills, current_company_name, experience
      FROM users
      WHERE role = 'candidate' AND parsed_projects IS NOT NULL
    `);

    const q = query.toLowerCase();
    const matches = result.rows.filter(u => {
      try {
        const projects = typeof u.parsed_projects === "string" ? JSON.parse(u.parsed_projects) : u.parsed_projects;
        return projects.some(p =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.technologies || []).some(t => t.toLowerCase().includes(q))
        );
      } catch { return false; }
    }).map(u => ({
      ...u,
      parsed_projects: typeof u.parsed_projects === "string" ? JSON.parse(u.parsed_projects) : u.parsed_projects,
    }));

    res.json({ success: true, count: matches.length, candidates: matches });
  } catch (err) {
    console.error("searchByProjects error:", err);
    res.status(500).json({ error: err.message || "Search failed" });
  }
};
