import pool from "../config/db.js";
import path from "path";
import { sendCandidateReferralEmail } from "../services/emailService.js";

// CREATE REFERRAL WITH CV
export const createReferral = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      industry,
      department,
      skills,
      experience,
      company,
      linkedin,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !skills || !experience || !company) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // Get current referrer details so we can block self-referrals
    const referrerRecord = await pool.query(
      "SELECT name, email, phone FROM users WHERE id=$1",
      [req.user.id]
    );
    const referrer = referrerRecord.rows[0] || {};

    if (
      referrer.name?.trim().toLowerCase() === name?.trim().toLowerCase() &&
      referrer.email?.trim().toLowerCase() === email?.trim().toLowerCase() &&
      referrer.phone?.replace(/\D/g, "") === phone?.replace(/\D/g, "")
    ) {
      return res.status(400).json({ message: "You cannot refer yourself" });
    }

    // Get CV filename if uploaded
    const cvFile = req.file ? req.file.filename : null;

    // Check for duplicates
    const dup = await pool.query(
      "SELECT * FROM referrals WHERE email=$1 OR phone=$2",
      [email, phone]
    );

    if (dup.rows.length > 0)
      return res.status(400).json({ message: "This email or phone is already referred" });

    const result = await pool.query(
      `INSERT INTO referrals
      (name,email,phone,industry,department,skills,experience,company,linkedin,referrer_id,status,cv_file,referral_status,experience_type)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,'pending_candidate_acceptance',$12) RETURNING *`,
      [
        name,
        email,
        phone,
        industry,
        department,
        JSON.stringify(Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim())),
        experience,
        company,
        linkedin,
        req.user.id,
        cvFile,
        experience === 'fresher' ? 'fresher' : 'experienced'
      ]
    );

    // Send email to candidate (non-blocking)
    const referralData = result.rows[0];
    sendCandidateReferralEmail(email, referralData.id, name).catch((err) => {
      console.error("Failed to send email but referral was created:", err);
    });

    res.status(201).json({ 
      message: "Referral created successfully! Email will be sent to candidate shortly.",
      data: referralData 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create referral" });
  }
};

// GET MY REFERRALS
export const getMyReferrals = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM referrals WHERE referrer_id=$1 ORDER BY id DESC",
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch referrals" });
  }
};

// GET REFERRER STATS
export const getReferrerStats = async (req, res) => {
  try {
    const referrerId = req.user.id;

    // Total candidates referred
    const totalReferred = await pool.query(
      "SELECT COUNT(*) as count FROM referrals WHERE referrer_id=$1",
      [referrerId]
    );

    // Successful joinings (assuming 'hired' status exists or we can use 'verified' as success)
    const successfulJoinings = await pool.query(
      "SELECT COUNT(*) as count FROM referrals WHERE referrer_id=$1 AND verified=true",
      [referrerId]
    );

    // Total incentives (assuming we have an incentives field, otherwise calculate based on successful joinings)
    // For now, let's assume $500 per successful joining
    const incentivesPerJoining = 500;
    const totalIncentives = successfulJoinings.rows[0].count * incentivesPerJoining;

    res.json({
      totalReferred: parseInt(totalReferred.rows[0].count),
      successfulJoinings: parseInt(successfulJoinings.rows[0].count),
      totalIncentives: totalIncentives
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

// GET ALL REFERRALS (for recruiters)
export const getAllReferrals = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM referrals ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch referrals" });
  }
};

// UPDATE STATUS
export const updateStatus = async (req, res) => {
  try {
    const { id, status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ message: "ID and status are required" });
    }

    const validStatuses = ["pending", "shortlist", "reject", "hold"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const result = await pool.query(
      "UPDATE referrals SET status=$1 WHERE id=$2 RETURNING *",
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Referral not found" });
    }

    res.json({ 
      message: "Status updated successfully",
      data: result.rows[0] 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update status" });
  }
};

// VERIFY CANDIDATE (CONSENT + SKILL TAGGING)
export const verifyCandidate = async (req, res) => {
  try {
    const { id, skills } = req.body;

    if (!id || !skills) {
      return res.status(400).json({ message: "ID and skills are required" });
    }

    const skillsArray = Array.isArray(skills) ? skills : JSON.parse(skills);

    const result = await pool.query(
      "UPDATE referrals SET verified=true, skills=$1, verified_at=NOW() WHERE id=$2 RETURNING *",
      [JSON.stringify(skillsArray), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Referral not found" });
    }

    res.json({ 
      message: "Candidate verified successfully",
      data: result.rows[0] 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
};

// CANDIDATE ACCEPTS REFERRAL
export const acceptReferral = async (req, res) => {
  try {
    const { referralId } = req.params;
    const { name, email, phone, linkedin } = req.body;

    if (!referralId) {
      return res.status(400).json({ message: "Referral ID is required" });
    }

    // Get the referral
    const referral = await pool.query(
      "SELECT * FROM referrals WHERE id=$1",
      [referralId]
    );

    if (referral.rows.length === 0) {
      return res.status(404).json({ message: "Referral not found" });
    }

    const ref = referral.rows[0];

    // Update referral with candidate acceptance + edited details
    const result = await pool.query(
      `UPDATE referrals 
       SET candidate_accepted=true, 
           candidate_accepted_at=NOW(), 
           referral_status='accepted',
           name=$1,
           email=$2,
           phone=$3,
           linkedin=$4
       WHERE id=$5 RETURNING *`,
      [name || ref.name, email || ref.email, phone || ref.phone, linkedin || ref.linkedin, referralId]
    );

    res.json({ 
      message: "Referral accepted successfully! The recruiter will review your profile.",
      data: result.rows[0] 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to accept referral" });
  }
};
export const getReferralById = async (req, res) => {
  try {
    const { referralId } = req.params;

    if (!referralId) {
      return res.status(400).json({ message: "Referral ID is required" });
    }

    const result = await pool.query(
      "SELECT * FROM referrals WHERE id=$1",
      [referralId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Referral not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch referral" });
  }
};
