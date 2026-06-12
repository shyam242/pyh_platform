import pool from "../config/db.js";
import fetch from "node-fetch";

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const callClaude = async (prompt) => {
  const res = await fetch(CLAUDE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
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

// ─── ANALYZE CANDIDATE PROFILE ────────────────────────────────────────────────
// Parses CV text + profile fields → profile weightage score + strengths/gaps
export const analyzeCandidate = async (req, res) => {
  try {
    const { referralId } = req.params;

    const result = await pool.query(
      `SELECT name, email, skills, experience, company, department, industry,
              experience_type, linkedin, cv_file
       FROM referrals WHERE id = $1`,
      [referralId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Candidate not found" });

    const c = result.rows[0];

    const prompt = `You are an expert HR analyst at a top recruiting firm. Analyze this candidate profile and return ONLY valid JSON (no markdown, no explanation).

CANDIDATE PROFILE:
Name: ${c.name}
Skills: ${c.skills || "Not provided"}
Experience: ${c.experience || "Not provided"} years (${c.experience_type || ""})
Current Company: ${c.company || "Not provided"}
Department: ${c.department || "Not provided"}
Industry: ${c.industry || "Not provided"}
LinkedIn: ${c.linkedin ? "Provided" : "Not provided"}
CV Uploaded: ${c.cv_file ? "Yes" : "No"}

Return this exact JSON structure:
{
  "overall_score": <0-100 integer>,
  "profile_completeness": <0-100 integer>,
  "skill_score": <0-100 integer>,
  "experience_score": <0-100 integer>,
  "presentation_score": <0-100 integer>,
  "summary": "<2-3 sentence candidate summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "recommendation": "<hire/maybe/pass>",
  "recommendation_reason": "<1 sentence reason>",
  "key_skills": ["<skill1>", "<skill2>", "<skill3>", "<skill4>", "<skill5>"]
}`;

    const raw = await callClaude(prompt);
    const analysis = safeJSON(raw);

    if (!analysis)
      return res.status(500).json({ error: "Failed to parse AI response" });

    // Cache in DB
    await pool.query(
      `UPDATE referrals SET ai_analysis = $1, ai_analyzed_at = NOW() WHERE id = $2`,
      [JSON.stringify(analysis), referralId]
    ).catch(() => {}); // Don't fail if column doesn't exist yet

    res.json({ success: true, analysis });
  } catch (err) {
    console.error("analyzeCandidate error:", err);
    res.status(500).json({ error: err.message || "AI analysis failed" });
  }
};

// ─── JD vs CV MATCH ───────────────────────────────────────────────────────────
// Compares candidate profile against a job description → match score
export const matchJD = async (req, res) => {
  try {
    const { referralId } = req.params;
    const { job_description, job_title, required_skills, experience_required } = req.body;

    if (!job_description)
      return res.status(400).json({ error: "job_description is required" });

    const result = await pool.query(
      `SELECT name, skills, experience, company, department, industry, experience_type
       FROM referrals WHERE id = $1`,
      [referralId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Candidate not found" });

    const c = result.rows[0];

    const prompt = `You are a senior technical recruiter. Compare this candidate profile against the job description and return ONLY valid JSON.

JOB DETAILS:
Title: ${job_title || "Not specified"}
Required Experience: ${experience_required || "Not specified"}
Required Skills: ${required_skills || "See JD"}
Job Description:
${job_description}

CANDIDATE PROFILE:
Skills: ${c.skills || "Not provided"}
Experience: ${c.experience || "Not provided"} years (${c.experience_type || ""})
Current Company: ${c.company || "Not provided"}
Department: ${c.department || "Not provided"}
Industry: ${c.industry || "Not provided"}

Return this exact JSON:
{
  "match_score": <0-100 integer>,
  "skills_match": <0-100 integer>,
  "experience_match": <0-100 integer>,
  "industry_match": <0-100 integer>,
  "verdict": "<strong_match|good_match|partial_match|weak_match>",
  "matched_skills": ["<skill1>", "<skill2>"],
  "missing_skills": ["<skill1>", "<skill2>"],
  "highlights": ["<point1>", "<point2>", "<point3>"],
  "concerns": ["<concern1>", "<concern2>"],
  "interviewer_notes": "<2-3 sentences of guidance for the interviewer>"
}`;

    const raw = await callClaude(prompt);
    const match = safeJSON(raw);

    if (!match)
      return res.status(500).json({ error: "Failed to parse AI response" });

    res.json({ success: true, match, job_title, candidate_name: result.rows[0].name });
  } catch (err) {
    console.error("matchJD error:", err);
    res.status(500).json({ error: err.message || "JD match failed" });
  }
};
