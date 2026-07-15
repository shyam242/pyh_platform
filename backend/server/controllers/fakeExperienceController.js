// backend/server/controllers/fakeExperienceController.js
//
// "Fake Experience Check" — recruiter & admin can upload a batch of resumes
// (+ optional JD) and get a Claude-powered authenticity/fake-experience
// report for each one. Nothing here is written to the database or to disk:
//
//   - multer uses memoryStorage(), so uploaded files exist only as in-memory
//     buffers for the duration of the request and are discarded afterwards.
//   - Results are kept only in the in-memory fakeExperienceStore, keyed per
//     user, holding just the SINGLE most recent batch ("last uploaded CVs").
//     A new upload replaces the previous one. Restarting the server clears
//     everything.
//
// This mirrors the existing Claude-call pattern used in aiController.js and
// jdMatchController.js, and the multer/text-extraction pattern used in
// jdMatchController.js (jdUpload) and routes/recruiter.js.

import multer from "multer";
import pool from "../config/db.js";
import {
  extractTextFromBuffer,
  analyzeSingleResume,
  mapWithConcurrency,
} from "../services/fakeExperienceService.js";
import { keyFor, saveBatch, getBatch, clearBatch } from "../services/fakeExperienceStore.js";

// ─── MULTER: MEMORY ONLY — never written to /uploads ─────────────────────────
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 21 }, // 10MB/file, up to 20 resumes + 1 JD file
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|docx|txt|md)$/i.test(file.originalname);
    cb(ok ? null : new Error(`Unsupported file type: ${file.originalname}`), ok);
  },
});

const rawUpload = memoryUpload.fields([
  { name: "resumes", maxCount: 20 },
  { name: "jd_file", maxCount: 1 },
]);

// This app has no global Express error-handling middleware, so wrap multer
// ourselves and turn its errors (bad file type, file too large, too many
// files) into a normal JSON 400 instead of an unhandled exception.
export const fakeExperienceUpload = (req, res, next) => {
  rawUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
    next();
  });
};

// ─── SHARED HANDLER LOGIC ─────────────────────────────────────────────────────

async function runBatch(req, res, { role }) {
  try {
    const resumeFiles = req.files?.resumes || [];
    const jdFile = req.files?.jd_file?.[0];
    const jdTextInput = (req.body.job_description || "").trim();
    const jobTitle = (req.body.job_title || "").trim();

    if (resumeFiles.length === 0) {
      return res.status(400).json({ error: "Upload at least one resume (.pdf, .docx, or .txt)" });
    }

    // Resolve JD text: uploaded file takes priority over pasted text
    let jdText = jdTextInput;
    if (jdFile) {
      try {
        jdText = await extractTextFromBuffer(jdFile.buffer, jdFile.originalname, jdFile.mimetype);
      } catch (e) {
        return res.status(400).json({ error: `Could not read job description file: ${e.message}` });
      }
    }

    // Extract text from every resume first (fail fast per-file, don't kill the batch)
    const prepared = [];
    for (const f of resumeFiles) {
      try {
        const text = await extractTextFromBuffer(f.buffer, f.originalname, f.mimetype);
        if (!text.trim() || text.trim().length < 50) {
          prepared.push({ filename: f.originalname, error: "No readable text found (file may be scanned/image-based)" });
        } else {
          prepared.push({ filename: f.originalname, text });
        }
      } catch (e) {
        prepared.push({ filename: f.originalname, error: e.message });
      }
    }

    // Run Claude analysis with limited concurrency (3 at a time)
    const outcomes = await mapWithConcurrency(prepared, 3, async (item) => {
      if (item.error) throw new Error(item.error);
      return analyzeSingleResume({ resumeText: item.text, jdText, filename: item.filename });
    });

    const candidates = outcomes.map((o, i) => {
      if (o.status === "fulfilled") return o.value;
      return {
        file_name: prepared[i].filename,
        candidate_name: prepared[i].filename,
        error: o.reason?.message || "Analysis failed",
      };
    });

    // Sort: highest authenticity risk first (nulls/errors last)
    candidates.sort((a, b) => (b.authenticity_risk_score ?? -1) - (a.authenticity_risk_score ?? -1));

    const batch = {
      job_title: jobTitle || null,
      jd_text: jdText ? jdText.slice(0, 6000) : null,
      analyzed_by: { id: req.user.id, role },
      analyzed_at: new Date().toISOString(),
      total: candidates.length,
      succeeded: candidates.filter((c) => !c.error).length,
      failed: candidates.filter((c) => c.error).length,
      candidates,
    };

    saveBatch(keyFor(role, req.user.id), batch);

    res.json({ success: true, batch });
  } catch (err) {
    console.error("fakeExperience runBatch error:", err);
    res.status(500).json({ error: err.message || "Fake-experience analysis failed" });
  }
}

// ─── RECRUITER ENDPOINTS ──────────────────────────────────────────────────────

export const recruiterAnalyze = (req, res) => runBatch(req, res, { role: "recruiter" });

export const recruiterGetLast = (req, res) => {
  const batch = getBatch(keyFor("recruiter", req.user.id));
  res.json({ success: true, batch: batch || null });
};

export const recruiterClearLast = (req, res) => {
  clearBatch(keyFor("recruiter", req.user.id));
  res.json({ success: true });
};

// ─── ADMIN ENDPOINTS (role checked here, same pattern as adminController.js) ─

async function ensureAdmin(req, res) {
  const result = await pool.query("SELECT role FROM users WHERE id=$1", [req.user.id]);
  if (result.rows.length === 0 || result.rows[0].role !== "admin") {
    res.status(403).json({ message: "Access denied. Admin only." });
    return false;
  }
  return true;
}

export const adminAnalyze = async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  return runBatch(req, res, { role: "admin" });
};

export const adminGetLast = async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  const batch = getBatch(keyFor("admin", req.user.id));
  res.json({ success: true, batch: batch || null });
};

export const adminClearLast = async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  clearBatch(keyFor("admin", req.user.id));
  res.json({ success: true });
};
