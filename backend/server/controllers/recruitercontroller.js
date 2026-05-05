import pool from "../config/db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAllReferrals = async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM referrals ORDER BY id DESC"
  );
  res.json(result.rows);
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
      return res.status(404).json({ error: "CV file not found for this referral" });
    }

    const filePath = path.join(__dirname, "../../uploads/cv", cv_file);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error("File not found at:", filePath);
      return res.status(404).json({ error: "CV file not found on server" });
    }

    // Set headers and send file
    res.setHeader("Content-Disposition", `attachment; filename="${name}-CV.pdf"`);
    res.download(filePath, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
      }
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

// GET REFERRAL DETAILS WITH CANDIDATE INFO
export const getReferralDetails = async (req, res) => {
  try {
    const { referralId } = req.params;

    const result = await pool.query(
      "SELECT * FROM referrals WHERE id=$1",
      [referralId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Referral not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching referral:", error);
    res.status(500).json({ error: "Failed to fetch referral" });
  }
};
