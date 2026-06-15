import pool from "../config/db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GET RECRUITER APPROVAL STATUS
export const getApprovalStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT id, name, email, is_recruiter_approved, recruiter_approved_at FROM users WHERE id=$1 AND role='recruiter'",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recruiter not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching approval status:", error);
    res.status(500).json({ error: "Failed to fetch approval status" });
  }
};

export const getAllReferrals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        r.*,
        u.name as referrer_name,
        u.company as referrer_company,
        u.experience as referrer_experience
      FROM referrals r
      LEFT JOIN users u ON r.referrer_id = u.id
      ORDER BY r.id DESC`
    );

    const referrals = result.rows.map((row) => ({
      ...row,
      candidate_image_url: null,
    }));

    res.json(referrals);
  } catch (error) {
    console.error("Error fetching all referrals:", error);
    res.status(500).json({ error: "Failed to fetch referrals" });
  }
};

export const updateStatus = async (req, res) => {
  const { id, status } = req.body;

  await pool.query(
    "UPDATE referrals SET status=$1 WHERE id=$2",
    [status, id]
  );

  res.json({ message: "Updated" });
};

export const verifyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skills } = req.body;
    const resumeFile = req.file?.filename || null;

    if (!skills || !resumeFile) {
      return res.status(400).json({ error: "Skills and resume are required" });
    }
    const result = await pool.query(
      "UPDATE users SET skills=$1, resume=$2, verified=true WHERE id=$3 RETURNING *",
      [skills, resumeFile, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ 
      message: "Profile verified successfully",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Error verifying profile:", error);
    res.status(500).json({ error: "Failed to verify profile" });
  }
};
export const downloadReferralCv = async (req, res) => {
  try {
    const { referralId } = req.params;

    const result = await pool.query(
      "SELECT cv_file, name FROM referrals WHERE id=$1",
      [referralId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Referral not found" });
    }

    const { cv_file, name } = result.rows[0];

    if (!cv_file) {
      return res.status(404).json({ error: "No CV uploaded for this candidate" });
    }

    // If cv_file is a URL (Supabase or external), redirect to it
    if (cv_file.startsWith("http://") || cv_file.startsWith("https://")) {
      return res.redirect(cv_file);
    }

    const filePath = path.join(__dirname, "../../uploads/cv", cv_file);

    if (!fs.existsSync(filePath)) {
      console.error("File not found at:", filePath);
      return res.status(404).json({ 
        error: "CV file not available. This may have been uploaded before the server was redeployed. Please ask the referrer to re-upload the CV." 
      });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${name}-CV.pdf"`);
    res.download(filePath, (err) => {
      if (err) console.error("Error downloading file:", err);
    });
  } catch (error) {
    console.error("Error downloading CV:", error);
    res.status(500).json({ error: "Failed to download CV" });
  }
};

// DOWNLOAD CANDIDATE RESUME
export const downloadCandidateResume = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      "SELECT resume, name FROM users WHERE id=$1 AND verified=true",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User or resume not found" });
    }

    const { resume, name } = result.rows[0];

    if (!resume) {
      return res.status(404).json({ error: "Resume not found for this user" });
    }

    const filePath = path.join(__dirname, "../../uploads/resumes", resume);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error("File not found at:", filePath);
      return res.status(404).json({ error: "Resume file not found on server" });
    }

    // Set headers and send file
    res.setHeader("Content-Disposition", `attachment; filename="${name}-Resume.pdf"`);
    res.download(filePath, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
      }
    });
  } catch (error) {
    console.error("Error downloading resume:", error);
    res.status(500).json({ error: "Failed to download resume" });
  }
};

// GET REFERRAL DETAILS WITH CANDIDATE INFO AND REFERRER INFO
export const getReferralDetails = async (req, res) => {
  try {
    const { referralId } = req.params;
    const sourceType = req.query.source_type || "referral";

    // If coming from project-search, candidate is in users table not referrals
    if (sourceType === "user") {
      const result = await pool.query(
        `SELECT id, name, email, phone, skills, experience, current_company_name,
                current_location, preferred_location, notice_period,
                current_ctc, expected_ctc, qualification, linkedin_profile as linkedin,
                parsed_projects, role as current_role
         FROM users WHERE id=$1 AND role='candidate'`,
        [referralId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      return res.json({ ...result.rows[0], candidate_image_url: null, source_type: "user" });
    }

    // Default: look up in referrals table
    const result = await pool.query(
      `SELECT 
        r.*,
        u.id as referrer_id,
        u.name as referrer_name,
        u.email as referrer_email,
        u.company as referrer_company,
        u.experience as referrer_experience
      FROM referrals r
      LEFT JOIN users u ON r.referrer_id = u.id
      LEFT JOIN users c ON r.email = c.email AND c.role = 'candidate'
      WHERE r.id=$1`,
      [referralId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Referral not found" });
    }

    const referral = result.rows[0];
    res.json({
      ...referral,
      candidate_image_url: null,
    });
  } catch (error) {
    console.error("Error fetching referral:", error);
    res.status(500).json({ error: "Failed to fetch referral" });
  }
};

// TRACK RESUME VIEW
export const trackResumeView = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { candidateId, candidateName, viewType } = req.body; // viewType: 'referral_cv' | 'candidate_resume'

    await pool.query(
      `INSERT INTO resume_views (recruiter_id, candidate_id, candidate_name, view_type, viewed_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [recruiterId, candidateId, candidateName, viewType || 'resume']
    );

    res.json({ success: true });
  } catch (error) {
    // Don't fail the main request if tracking fails
    console.error("Resume view tracking error:", error);
    res.json({ success: false });
  }
};

// GET RESUME VIEW STATS FOR ADMIN
export const getResumeViewStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        u.id as recruiter_id,
        u.name as recruiter_name,
        u.email as recruiter_email,
        u.company_name,
        COUNT(rv.id) as total_views,
        COUNT(DISTINCT rv.candidate_id) as unique_candidates,
        MAX(rv.viewed_at) as last_viewed_at
      FROM users u
      LEFT JOIN resume_views rv ON rv.recruiter_id = u.id
      WHERE u.role = 'recruiter'
      GROUP BY u.id, u.name, u.email, u.company_name
      ORDER BY total_views DESC
    `);

    const detailed = await pool.query(`
      SELECT 
        rv.id,
        rv.viewed_at,
        rv.view_type,
        rv.candidate_name,
        rv.candidate_id,
        u.name as recruiter_name,
        u.email as recruiter_email,
        u.company_name
      FROM resume_views rv
      JOIN users u ON u.id = rv.recruiter_id
      ORDER BY rv.viewed_at DESC
      LIMIT 200
    `);

    res.json({ stats: stats.rows, detailed: detailed.rows });
  } catch (error) {
    console.error("Error fetching resume view stats:", error);
    res.status(500).json({ error: "Failed to fetch resume view stats" });
  }
};
