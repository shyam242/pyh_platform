// backend/server/controllers/candidateReportController.js

import pool from "../config/db.js";
import { getOrCreateReport, getOrRenderPdf } from "../services/candidateReportService.js";

// ─── LIST ALL CANDIDATES FOR THE PICKER (referrals + bulk_candidates, same union filterCandidates uses) ─

export const listCandidatesForReports = async (req, res) => {
  try {
    const { search } = req.query;

    const referrals = await pool.query(`
      SELECT id, name, email, skills, experience, company as current_company_name, 'referral' as source_type
      FROM referrals ORDER BY id DESC
    `);
    const bulk = await pool.query(`
      SELECT id, name, email, skills, experience, current_company_name, 'bulk' as source_type
      FROM bulk_candidates ORDER BY id DESC
    `);

    let combined = [...referrals.rows, ...bulk.rows];

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      combined = combined.filter((c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.skills || "").toLowerCase().includes(q) ||
        (c.current_company_name || "").toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: combined.length, candidates: combined });
  } catch (err) {
    console.error("listCandidatesForReports error:", err);
    res.status(500).json({ error: err.message || "Failed to list candidates" });
  }
};

// ─── BATCH GENERATE (or reuse cached) REPORTS FOR SELECTED CANDIDATES ────────

export const generateReports = async (req, res) => {
  try {
    const { candidates, job_id, jd_text, job_title } = req.body;
    // candidates: [{ id, source_type }]

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "Select at least one candidate" });
    }
    if (!job_id && !(jd_text && jd_text.trim())) {
      return res.status(400).json({ error: "Choose a job posting or paste a job description" });
    }

    let resolvedJobTitle = job_title || null;
    let resolvedJdText = jd_text || "";

    if (job_id) {
      const jobRes = await pool.query("SELECT job_title, job_description, responsibilities, qualifications, experience_required FROM jobs WHERE id=$1", [job_id]);
      if (jobRes.rows.length === 0) return res.status(404).json({ error: "Selected job posting not found" });
      const job = jobRes.rows[0];
      resolvedJobTitle = job.job_title;
      resolvedJdText = `${job.job_description}\n\nResponsibilities:\n${job.responsibilities}\n\nQualifications:\n${job.qualifications}\n\nExperience Required: ${job.experience_required}`;
    }

    const results = [];
    for (const cand of candidates) {
      try {
        const { reportId, cached } = await getOrCreateReport({
          candidateId: cand.id,
          sourceType: cand.source_type,
          jobId: job_id || null,
          jdText: resolvedJdText,
          jobTitle: resolvedJobTitle,
          generatedBy: req.user.id,
        });
        results.push({ candidate_id: cand.id, source_type: cand.source_type, report_id: reportId, cached, success: true });
      } catch (innerErr) {
        console.error(`Report generation failed for candidate ${cand.id}:`, innerErr.message);
        results.push({ candidate_id: cand.id, source_type: cand.source_type, success: false, error: innerErr.message });
      }
    }

    res.json({
      success: true,
      total: results.length,
      generated: results.filter((r) => r.success && !r.cached).length,
      reused_from_cache: results.filter((r) => r.success && r.cached).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (err) {
    console.error("generateReports error:", err);
    res.status(500).json({ error: err.message || "Failed to generate reports" });
  }
};

// ─── DOWNLOAD A SINGLE REPORT AS PDF (renders from stored JSON, no AI call) ──

export const downloadReportPdf = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { buffer, candidateName } = await getOrRenderPdf(reportId);
    const safeName = (candidateName || "candidate").replace(/[^a-z0-9]+/gi, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_report.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error("downloadReportPdf error:", err);
    res.status(404).json({ error: err.message || "Report not found" });
  }
};

// ─── HISTORY: PAST REPORTS THIS RECRUITER HAS GENERATED (no AI call, DB read only) ─

export const getReportHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, candidate_id, source_type, job_title, candidate_name, candidate_email, created_at
       FROM candidate_reports
       WHERE generated_by = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [req.user.id]
    );
    res.json({ success: true, reports: result.rows });
  } catch (err) {
    console.error("getReportHistory error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch report history" });
  }
};
