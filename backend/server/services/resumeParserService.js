import fetch from "node-fetch";
import pdfParse from "pdf-parse";
import fs from "fs";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".heic"];

// ─── GOOGLE DRIVE URL CONVERTER ───────────────────────────────────────────────
// Converts any Google Drive share/view/docs URL into a direct-download URL.
// Supports:
//   drive.google.com/file/d/FILE_ID/view?...
//   drive.google.com/open?id=FILE_ID
//   docs.google.com/document/d/FILE_ID/edit?...
//   docs.google.com/spreadsheets/d/FILE_ID/...
//   docs.google.com/presentation/d/FILE_ID/...
export const toGoogleDriveDirectURL = (url) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname; // e.g. "drive.google.com" or "docs.google.com"

    if (!host.endsWith("google.com")) return url; // not a Google URL — return as-is

    // Pattern 1: drive.google.com/file/d/FILE_ID/...
    const fileMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
    }

    // Pattern 2: drive.google.com/open?id=FILE_ID
    const openId = parsed.searchParams.get("id");
    if (host === "drive.google.com" && openId) {
      return `https://drive.google.com/uc?export=download&id=${openId}`;
    }

    // Pattern 3: docs.google.com/document|spreadsheets|presentation/d/FILE_ID/...
    const docsMatch = parsed.pathname.match(/\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
    if (docsMatch) {
      return `https://docs.google.com/document/d/${docsMatch[1]}/export?format=pdf`;
    }

    return url; // unknown Google URL — return unchanged
  } catch {
    return url; // invalid URL — return unchanged, let fetch fail naturally
  }
};

// ─── PDF DOWNLOAD ─────────────────────────────────────────────────────────────
export const downloadPDF = async (url) => {
  // Convert Google Drive share links to direct download links before fetching
  const directUrl = toGoogleDriveDirectURL(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(directUrl, {
      signal: controller.signal,
      // Google Drive may redirect once for large files — follow redirects (default)
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PYH-ResumeParser/1.0)",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} when downloading PDF from ${directUrl}`);

    const buffer = await res.buffer();

    // Validate that we actually got a PDF and not an HTML error page
    // PDF files start with the magic bytes: %PDF  (hex: 25 50 44 46)
    if (buffer.length < 4 || buffer.slice(0, 4).toString("ascii") !== "%PDF") {
      throw new Error(
        "Invalid PDF structure — received non-PDF content. " +
        "If this is a Google Drive link, ensure the file is shared as 'Anyone with the link can view'."
      );
    }

    return buffer;
  } finally {
    clearTimeout(timeout);
  }
};

// ─── PDF TEXT EXTRACTION ──────────────────────────────────────────────────────
export const extractTextFromPDF = async (buffer) => {
  const data = await pdfParse(buffer);
  return data.text || "";
};

// ─── REGEX-BASED PARSERS ──────────────────────────────────────────────────────

const extractEmail = (text) => {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : "";
};

const extractPhone = (text) => {
  // Matches Indian and international formats
  const match = text.match(
    /(?:\+91[\s\-]?)?(?:\(?\d{3,5}\)?[\s\-]?)?\d{3,5}[\s\-]?\d{4,5}/
  );
  if (!match) return "";
  return match[0].replace(/\s+/g, "").replace(/[-()]/g, "").trim();
};

const extractLinkedIn = (text) => {
  const match = text.match(/linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/i);
  return match ? "https://" + match[0] : "";
};

const extractName = (text) => {
  // Names are usually in the first few non-empty lines, before email/phone/url
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 1 && l.length < 80);

  for (const line of lines.slice(0, 12)) {
    // Skip lines that look like headers, emails, phones, URLs
    if (/@/.test(line)) continue; // email
    if (/https?:\/\/|linkedin\.com|github\.com|www\./i.test(line)) continue; // URLs
    if (/\b(objective|summary|profile|education|experience|skills?|contact|curriculum|vitae|resume|declaration|project|internship|achievement|certif)\b/i.test(line)) continue; // section headers
    if (/\d{7,}/.test(line)) continue; // lines with long digit runs (phone/aadhaar)
    if (/[|]{1}/.test(line) && line.split(" ").length > 6) continue; // pipe-separated address lines

    const words = line.trim().split(/\s+/);

    // Primary: 2-4 words, all alpha (allows dots and hyphens for initials like "A. B. Kumar")
    if (
      words.length >= 2 &&
      words.length <= 4 &&
      words.every((w) => /^[A-Za-z][A-Za-z.''-]*$/.test(w))
    ) {
      return line.trim();
    }

    // Fallback: single word if it looks like a full name in all-caps or title case, min 4 chars
    // e.g. "RAJESWARI" or headers that are just a surname
    if (
      words.length === 1 &&
      words[0].length >= 4 &&
      /^[A-Za-z]+$/.test(words[0])
    ) {
      // Only accept single-word if line 0 or 1 (very top of resume)
      const lineIdx = lines.indexOf(line);
      if (lineIdx <= 1) return line.trim();
    }
  }
  return "";
};

const extractLocation = (text) => {
  // Common Indian cities + generic pattern
  const cities = [
    "Mumbai", "Delhi", "Bangalore", "Bengaluru", "Hyderabad", "Chennai", "Kolkata",
    "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore",
    "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Noida", "Gurugram",
    "Gurgaon", "Faridabad", "Ranchi", "Coimbatore", "Kochi", "Chandigarh", "Thiruvananthapuram",
    "Bhubaneswar", "Mysore", "Mysuru", "Nashik", "Meerut", "Agra", "Varanasi",
  ];
  for (const city of cities) {
    if (new RegExp(`\\b${city}\\b`, "i").test(text)) return city;
  }
  // Fallback: look for "Location:" or "Address:" line
  const locMatch = text.match(/(?:location|city|address)[:\s]+([A-Za-z\s,]+)/i);
  if (locMatch) return locMatch[1].split("\n")[0].trim().slice(0, 60);
  return "";
};

const extractExperience = (text) => {
  // "X years of experience" or "X+ years"
  const patterns = [
    /(\d+(?:\.\d+)?)\+?\s*years?\s+(?:of\s+)?(?:work\s+)?experience/i,
    /experience[:\s]+(\d+(?:\.\d+)?)\+?\s*years?/i,
    /(\d+(?:\.\d+)?)\s*(?:yrs?|years?)\s+(?:of\s+)?(?:total\s+)?(?:work\s+)?(?:experience|exp)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  // Fresher detection
  if (/fresher|0\s*year|no\s+experience|entry.level/i.test(text)) return "0";
  return "";
};

const extractQualification = (text) => {
  const degrees = [
    "Ph.D", "PhD", "M.Tech", "MTech", "M.E", "ME", "MBA", "MCA", "M.Sc", "MSc",
    "M.Com", "MCom", "MA", "B.Tech", "BTech", "B.E", "BE", "BCA", "B.Sc", "BSc",
    "B.Com", "BCom", "BA", "Diploma", "12th", "10th",
  ];
  for (const deg of degrees) {
    if (new RegExp(`\\b${deg.replace(".", "\\.")}\\b`, "i").test(text)) return deg;
  }
  return "";
};

const TECH_SKILLS_LIST = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "C", "Go", "Rust", "PHP",
  "Ruby", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Perl", "Shell", "Bash",
  "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "Django", "Flask",
  "Spring", "Laravel", "FastAPI", "NestJS", "GraphQL", "REST", "gRPC",
  "MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite", "Oracle", "Supabase",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Jenkins", "CI/CD",
  "Git", "GitHub", "GitLab", "Linux", "Nginx", "Apache",
  "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "OpenCV",
  "HTML", "CSS", "Tailwind", "Bootstrap", "SASS", "webpack", "Vite",
  "Android", "iOS", "React Native", "Flutter",
  "Figma", "Postman", "JIRA", "Confluence",
];

const SOFT_SKILLS_LIST = [
  "Communication", "Leadership", "Teamwork", "Problem Solving", "Critical Thinking",
  "Time Management", "Adaptability", "Creativity", "Collaboration", "Presentation",
  "Negotiation", "Decision Making", "Conflict Resolution", "Mentoring", "Planning",
];

const extractTechSkills = (text) => {
  const found = TECH_SKILLS_LIST.filter((s) =>
    new RegExp(`\\b${s.replace(/[.+]/g, "\\$&")}\\b`, "i").test(text)
  );
  return [...new Set(found)].join(", ");
};

const extractSoftSkills = (text) => {
  const found = SOFT_SKILLS_LIST.filter((s) =>
    new RegExp(`\\b${s}\\b`, "i").test(text)
  );
  return [...new Set(found)].join(", ");
};

const extractCurrentCompany = (text) => {
  // Look for "Currently working at X" or lines after "Experience" before a date
  const patterns = [
    /(?:currently\s+(?:working\s+)?(?:at|in|with)|present)\s+[:\-]?\s*([A-Za-z0-9\s&.,]+?)(?:\n|,|\|)/i,
    /(?:employer|company|organisation|organization)[:\s]+([A-Za-z0-9\s&.,]+?)(?:\n|,|\|)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim().slice(0, 80);
  }
  return "";
};

// ─── MAIN PARSE FUNCTION ──────────────────────────────────────────────────────
export const parseResumeText = (text) => {
  const techSkills = extractTechSkills(text);
  const softSkills = extractSoftSkills(text);
  const allSkills = [
    ...new Set([
      ...techSkills.split(", ").filter(Boolean),
      ...softSkills.split(", ").filter(Boolean),
    ]),
  ].join(", ");

  return {
    name: extractName(text),
    email: extractEmail(text),
    contact: extractPhone(text),
    location: extractLocation(text),
    highest_qualification: extractQualification(text),
    experience: extractExperience(text),
    current_company_name: extractCurrentCompany(text),
    skills: allSkills,
    technical_skills: techSkills,
    soft_skills: softSkills,
    linkedin: extractLinkedIn(text),
  };
};

// ─── FULL PIPELINE ────────────────────────────────────────────────────────────
export const parseResumeFromURL = async (resumeUrl) => {
  const buffer = await downloadPDF(resumeUrl);
  const text = await extractTextFromPDF(buffer);
  if (!text || text.trim().length < 50) {
    throw new Error("PDF has no readable text (may be scanned/image-based)");
  }
  const parsed = parseResumeText(text);
  return { ...parsed, resume_link: resumeUrl };
};

// Same pipeline, but for a PDF buffer already on our server (direct file upload)
// instead of one we have to download from a URL first.
export const parseResumeFromBuffer = async (buffer) => {
  if (buffer.length < 4 || buffer.slice(0, 4).toString("ascii") !== "%PDF") {
    throw new Error("Invalid PDF structure — the uploaded file is not a valid PDF.");
  }
  const text = await extractTextFromPDF(buffer);
  if (!text || text.trim().length < 50) {
    throw new Error("PDF has no readable text (may be scanned/image-based)");
  }
  return parseResumeText(text);
};

// ─── UNIFIED FILE-TYPE ENTRY POINT (used by the bulk resume-file upload) ──────
// Extracts text from whatever the admin uploaded — PDF, Word doc, or a plain
// image — and returns parsed fields. Unlike parseResumeFromBuffer() above,
// this NEVER throws for a "can't auto-read this" case; it returns
// { parsed: null, reason } instead so the caller can still save the
// candidate row (and the file) and flag it for manual review, rather than
// discarding the upload. It only throws for truly unexpected I/O errors.
export const extractResumeDetails = async (filePath, originalname) => {
  const ext = "." + (originalname.split(".").pop() || "").toLowerCase();

  if (IMAGE_EXTENSIONS.includes(ext)) {
    return { parsed: null, reason: "Image resume — this file type can't be auto-parsed. Please enter the candidate's details manually." };
  }

  const buffer = fs.readFileSync(filePath);

  try {
    if (ext === ".pdf") {
      if (buffer.length < 4 || buffer.slice(0, 4).toString("ascii") !== "%PDF") {
        return { parsed: null, reason: "The uploaded file isn't a valid PDF." };
      }
      const text = await extractTextFromPDF(buffer);
      if (!text || text.trim().length < 50) {
        return { parsed: null, reason: "This PDF has no readable text — it's likely a scanned/image-based resume. Please enter the candidate's details manually." };
      }
      return { parsed: parseResumeText(text), reason: null };
    }

    if (ext === ".docx") {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value || "";
      if (!text || text.trim().length < 50) {
        return { parsed: null, reason: "This Word document has no readable text. Please enter the candidate's details manually." };
      }
      return { parsed: parseResumeText(text), reason: null };
    }

    if (ext === ".doc") {
      // Legacy binary .doc isn't supported by mammoth (docx-only) — keep the
      // file and let the admin fill details in by hand rather than rejecting it.
      return { parsed: null, reason: "Legacy .doc format can't be auto-parsed — please re-save as .docx/.pdf, or enter the candidate's details manually." };
    }

    return { parsed: null, reason: `Unsupported file type (${ext || "unknown"}) — please enter the candidate's details manually.` };
  } catch (err) {
    return { parsed: null, reason: `Couldn't read this file (${err.message}). Please enter the candidate's details manually.` };
  }
};
