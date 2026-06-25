// backend/server/services/resumeParserService.js
// Pure Node.js resume parser — no AI API needed, uses pdf-parse + regex
import fetch from "node-fetch";
import pdfParse from "pdf-parse";

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
  // Names are usually in the first 5 non-empty lines, before email/phone
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 1 && l.length < 60);

  for (const line of lines.slice(0, 8)) {
    // Skip lines that look like headers, emails, phones, URLs
    if (/[@|http|linkedin|github|www\.|objective|summary|profile|education|experience|skill]/i.test(line)) continue;
    if (/\d{5,}/.test(line)) continue; // skip lines with long numbers
    if (/[,;|]/.test(line) && line.split(" ").length > 5) continue; // skip address-like lines
    // Must look like a name: 2-4 words, mostly letters
    const words = line.trim().split(/\s+/);
    if (words.length >= 2 && words.length <= 5 && words.every((w) => /^[A-Za-z.'-]+$/.test(w))) {
      return line.trim();
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
