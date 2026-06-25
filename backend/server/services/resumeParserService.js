// backend/server/services/resumeParserService.js
import fetch from "node-fetch";
import pdfParse from "pdf-parse";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Download PDF from a URL into a Buffer
export const downloadPDF = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PYH-ResumeParser/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} when downloading PDF`);
    const buffer = await res.buffer();
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
};

// Extract plain text from a PDF buffer
export const extractTextFromPDF = async (buffer) => {
  const data = await pdfParse(buffer);
  return data.text || "";
};

// Call Claude to parse structured candidate data from resume text
export const parseResumeWithAI = async (resumeText) => {
  const prompt = `You are a resume parser. Extract the following fields from the resume text below.
Respond ONLY with a valid JSON object. No markdown fences, no explanation, no preamble.

Fields:
- name: Full candidate name (string)
- email: Email address (string)
- contact: Phone number (string)
- location: Current city or location (string)
- highest_qualification: Highest education degree, e.g. "B.Tech", "MBA", "MCA" (string)
- experience: Total years of work experience as a plain number string, e.g. "3" or "0" for fresher (string)
- current_company_name: Most recent employer (string)
- skills: All skills comma-separated (string)
- technical_skills: Only programming languages, tools, frameworks comma-separated (string)
- soft_skills: Only soft skills like leadership, communication comma-separated (string)
- linkedin: LinkedIn profile URL if present, else empty string (string)

Resume text:
${resumeText.slice(0, 6000)}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].text.trim();
  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("AI parser returned invalid JSON: " + cleaned.slice(0, 200));
  }
};

// Full pipeline: URL → download → extract text → AI parse → structured object
export const parseResumeFromURL = async (resumeUrl) => {
  const buffer = await downloadPDF(resumeUrl);
  const text = await extractTextFromPDF(buffer);
  if (!text || text.trim().length < 50) {
    throw new Error("PDF has no readable text (may be scanned/image-based)");
  }
  const parsed = await parseResumeWithAI(text);
  return { ...parsed, resume_link: resumeUrl };
};
