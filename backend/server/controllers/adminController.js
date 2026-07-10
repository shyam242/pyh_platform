import pool from "../config/db.js";
import fs from "fs";
import { parseCSVString, mapCandidateColumns } from "../services/csvParser.js";
import { sendRecruiterApprovalEmail, sendRecruiterRejectionEmail } from "../services/brevoService.js";
import { parseResumeFromURL } from "../services/resumeParserService.js"; // pure regex — no API key needed
import { computeSuitabilityScore } from "../services/suitabilityScoreService.js";
import { upsertJobOnPublicSite } from "../services/publicSiteSync.js";

const ADMIN_EMAIL = "shyampickyourhire@gmail.com";

// Shared list of valid candidate pipeline statuses (portal + bulk candidates)
export const CANDIDATE_STATUSES = [
  'New', 'Contacted', 'Interested', 'Not Interested', 'No Response',
  'Follow-up Required', 'In Review', 'Shortlisted',
  'Interview Scheduled', 'Interview Cleared', 'Offered',
  'Hired', 'Rejected', 'On Hold'
];

const isAdmin = async (userId) => {
  const r = await pool.query("SELECT role FROM users WHERE id=$1", [userId]);
  return r.rows.length > 0 && r.rows[0].role === "admin";
};

// GET ADMIN DASHBOARD DATA
export const getDashboardData = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Get total candidates
    const totalCandidates = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role='candidate'"
    );

    // Get total referrers
    const totalReferrers = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role='referrer'"
    );

    // Get total recruiters
    const totalRecruiters = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role='recruiter'"
    );

    // Get pending recruiter approvals
    const pendingRecruiters = await pool.query(
      "SELECT * FROM users WHERE role='recruiter' AND is_recruiter_approved=false ORDER BY id DESC"
    );

    // Get approved recruiters
    const approvedRecruiters = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role='recruiter' AND is_recruiter_approved=true"
    );

    // Get total referrals
    const totalReferrals = await pool.query(
      "SELECT COUNT(*) as count FROM referrals"
    );

    // Get candidates list
    const candidates = await pool.query(
      "SELECT id, name, email, role FROM users WHERE role='candidate' ORDER BY id DESC LIMIT 50"
    );

    res.json({
      dashboard: {
        totalCandidates: parseInt(totalCandidates.rows[0].count),
        totalReferrers: parseInt(totalReferrers.rows[0].count),
        totalRecruiters: parseInt(totalRecruiters.rows[0].count),
        approvedRecruiters: parseInt(approvedRecruiters.rows[0].count),
        totalReferrals: parseInt(totalReferrals.rows[0].count),
        pendingRecruiterCount: pendingRecruiters.rows.length
      },
      pendingRecruiters: pendingRecruiters.rows,
      candidates: candidates.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
};

// GET ALL CANDIDATES
export const getAllCandidates = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const candidates = await pool.query(
      "SELECT id, name, email, phone, skills, verified, resume FROM users WHERE role='candidate' ORDER BY id DESC"
    );

    res.json(candidates.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch candidates" });
  }
};

// GET CANDIDATE DETAILS
export const getCandidateDetails = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const candidate = await pool.query(
      "SELECT * FROM users WHERE id=$1 AND role='candidate'",
      [candidateId]
    );

    if (candidate.rows.length === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Get referrals for this candidate (if any)
    const referrals = await pool.query(
      "SELECT * FROM referrals WHERE id=$1 ORDER BY id DESC",
      [candidateId]
    );

    res.json({
      candidate: candidate.rows[0],
      referrals: referrals.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch candidate details" });
  }
};

// GET ROLE-SPECIFIC CANDIDATES
export const getCandidatesByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const validRoles = ["candidate", "referrer", "recruiter"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const query = role === "recruiter"
      ? "SELECT id, name, email, phone, company_name, is_recruiter_approved, recruiter_approved_at FROM users WHERE role=$1 ORDER BY id DESC"
      : "SELECT id, name, email, phone FROM users WHERE role=$1 ORDER BY id DESC";

    const users = await pool.query(query, [role]);

    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users by role" });
  }
};

// APPROVE RECRUITER
export const approveRecruiter = async (req, res) => {
  try {
    const { recruiterId } = req.params;
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Get recruiter details before updating
    const recruiterCheck = await pool.query(
      "SELECT * FROM users WHERE id=$1 AND role='recruiter'",
      [recruiterId]
    );

    if (recruiterCheck.rows.length === 0) {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    const recruiter = recruiterCheck.rows[0];

    const result = await pool.query(
      "UPDATE users SET is_recruiter_approved=true, recruiter_approved_at=NOW() WHERE id=$1 AND role='recruiter' RETURNING *",
      [recruiterId]
    );

    // Send approval email to recruiter
    await sendRecruiterApprovalEmail(recruiter.email, recruiter.name);

    res.json({
      message: "Recruiter approved successfully. Approval email sent.",
      recruiter: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve recruiter" });
  }
};

// REJECT RECRUITER
export const rejectRecruiter = async (req, res) => {
  try {
    const { recruiterId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Get recruiter details before deleting
    const recruiterCheck = await pool.query(
      "SELECT * FROM users WHERE id=$1 AND role='recruiter'",
      [recruiterId]
    );

    if (recruiterCheck.rows.length === 0) {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    const recruiter = recruiterCheck.rows[0];

    // Delete the recruiter
    const result = await pool.query(
      "DELETE FROM users WHERE id=$1 AND role='recruiter' RETURNING *",
      [recruiterId]
    );

    // Send rejection email to recruiter
    await sendRecruiterRejectionEmail(recruiter.email, recruiter.name, reason);

    res.json({
      message: "Recruiter rejected and removed. Rejection email sent.",
      recruiter: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reject recruiter" });
  }
};

// UPDATE REFERRER INCENTIVE
export const updateReferrerIncentive = async (req, res) => {
  try {
    const { referrerId } = req.params;
    const { incentive_value } = req.body;
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    if (!incentive_value || incentive_value <= 0) {
      return res.status(400).json({ message: "Invalid incentive value" });
    }

    // Check if referrer exists
    const referrer = await pool.query(
      "SELECT * FROM users WHERE id=$1 AND role='referrer'",
      [referrerId]
    );

    if (referrer.rows.length === 0) {
      return res.status(404).json({ message: "Referrer not found" });
    }

    // Check if incentive record exists
    const existing = await pool.query(
      "SELECT * FROM incentives WHERE referrer_id=$1",
      [referrerId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await pool.query(
        "UPDATE incentives SET incentive_value=$1, updated_at=NOW() WHERE referrer_id=$2 RETURNING *",
        [incentive_value, referrerId]
      );
    } else {
      // Create new
      result = await pool.query(
        "INSERT INTO incentives(referrer_id, incentive_value) VALUES($1, $2) RETURNING *",
        [referrerId, incentive_value]
      );
    }

    res.json({
      message: "Incentive updated successfully",
      incentive: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update incentive" });
  }
};

// GET REFERRER INCENTIVE
export const getReferrerIncentive = async (req, res) => {
  try {
    const { referrerId } = req.params;

    const result = await pool.query(
      "SELECT * FROM incentives WHERE referrer_id=$1",
      [referrerId]
    );

    if (result.rows.length === 0) {
      // Return default incentive
      return res.json({ incentive_value: 500, referrer_id: referrerId });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch incentive" });
  }
};

// workflow status admin assigns to a referral (pending/shortlist/reject/hold)
const referralWorkflowStatusLabel = (status) => {
  const map = { pending: "Pending", shortlist: "Shortlisted", reject: "Rejected", hold: "On Hold" };
  return map[(status || "pending").toLowerCase()] || "Pending";
};

// GET /api/admin/referrals — all candidates referred by referrers, for the "Referred Candidates" directory
export const getReferralsForAdmin = async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.status(403).json({ message: "Access denied. Admin only." });

    const rows = (await pool.query(
      `SELECT r.id, r.name, r.email, r.phone, r.skills, r.experience, r.company, r.department,
              r.referral_status, r.status, r.created_at, r.referrer_id, r.cv_file,
              u.name AS referrer_name
       FROM referrals r
       LEFT JOIN users u ON u.id = r.referrer_id
       ORDER BY r.id DESC`
    )).rows;

    const referrals = rows.map(r => ({
      ...r,
      skills: normalizeReferralSkills(r.skills),
      status: referralWorkflowStatusLabel(r.status),
      acceptance_status: referralStatusLabel(r.referral_status),
    }));

    res.json({ referrals });
  } catch (err) {
    console.error("getReferralsForAdmin error:", err);
    res.status(500).json({ message: "Failed to fetch referrals" });
  }
};

// GET ALL REFERRERS WITH INCENTIVES
const buildImageUrl = (filename) => {
  if (!filename) return null;
  if (/^https?:\/\//i.test(filename)) return filename;
  return `${process.env.BACKEND_URL || "https://api.pickyourhire.com"}/uploads/profile_images/${filename}`;
};

export const getAllReferrersWithIncentives = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    await ensureUserProfileColumnsOnce();

    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.company, u.experience, u.joined_at, u.image, u.linkedin,
             COALESCE(i.incentive_value, 500) as incentive_value,
             COALESCE(r.referral_count, 0) as referral_count
      FROM users u
      LEFT JOIN incentives i ON u.id = i.referrer_id
      LEFT JOIN (
        SELECT referrer_id, COUNT(*) as referral_count
        FROM referrals
        GROUP BY referrer_id
      ) r ON r.referrer_id = u.id
      WHERE u.role='referrer'
      ORDER BY u.id DESC
    `);

    res.json(result.rows.map(r => ({ ...r, image_url: buildImageUrl(r.image) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch referrers" });
  }
};

// GET SINGLE REFERRER — FULL PROFILE + STATS + REFERRAL HISTORY + INCENTIVE HISTORY
// Self-healing: guarantees the incentive-tracking columns exist on `referrals`
// even if the server hasn't been restarted since these columns were introduced.
let _incentiveColumnsChecked = false;
const ensureIncentiveColumnsOnce = async () => {
  if (_incentiveColumnsChecked) return;
  try {
    // referrals never had a created_at column (the rest of the app orders by id
    // instead) — add it here too since the referrer-detail view needs a real
    // timestamp to build referral/incentive history and account timeline.
    await pool.query(`
      ALTER TABLE referrals
      ADD COLUMN IF NOT EXISTS incentive_status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS incentive_paid_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    `);
    _incentiveColumnsChecked = true;
  } catch (err) {
    console.error("ensureIncentiveColumnsOnce error:", err.message);
  }
};

let _userProfileColumnsChecked = false;
const ensureUserProfileColumnsOnce = async () => {
  if (_userProfileColumnsChecked) return;
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS image VARCHAR(255),
      ADD COLUMN IF NOT EXISTS linkedin VARCHAR(500),
      ADD COLUMN IF NOT EXISTS account_number VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50);
    `);
    _userProfileColumnsChecked = true;
  } catch (err) {
    console.error("ensureUserProfileColumnsOnce error:", err.message);
  }
};

export const getReferrerFullDetails = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { referrerId } = req.params;

    const adminCheck = await pool.query("SELECT role FROM users WHERE id=$1", [adminId]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    await ensureIncentiveColumnsOnce();
    await ensureUserProfileColumnsOnce();

    const referrerResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.company, u.experience, u.joined_at, u.linkedin, u.image,
              u.account_number, u.ifsc_code,
              COALESCE(i.incentive_value, 500) as incentive_value
       FROM users u
       LEFT JOIN incentives i ON u.id = i.referrer_id
       WHERE u.id=$1 AND u.role='referrer'`,
      [referrerId]
    );

    if (referrerResult.rows.length === 0) {
      return res.status(404).json({ message: "Referrer not found" });
    }

    const referrer = { ...referrerResult.rows[0], image_url: buildImageUrl(referrerResult.rows[0].image) };
    const incentiveValue = parseFloat(referrer.incentive_value) || 0;

    // Ordered by id (matches how the rest of the app orders referrals) since
    // created_at was only just backfilled and ties for pre-existing rows.
    const referralsResult = await pool.query(
      `SELECT id, name, email, phone, company, experience, industry, department,
              referral_status, status, created_at, candidate_accepted_at,
              incentive_status, incentive_paid_at, payment_mode
       FROM referrals WHERE referrer_id=$1 ORDER BY id DESC`,
      [referrerId]
    );
    const referrals = referralsResult.rows;

    const isAccepted = r => (r.referral_status || r.status) === "accepted";
    const isRejected = r => (r.referral_status || r.status) === "rejected";
    const isPending = r => (r.referral_status || r.status) === "pending";
    const isAwaiting = r => (r.referral_status || r.status) === "pending_candidate_acceptance";

    const acceptedReferrals = referrals.filter(isAccepted);
    const paidReferrals = acceptedReferrals.filter(r => r.incentive_status === "paid");

    const stats = {
      totalReferrals: referrals.length,
      accepted: acceptedReferrals.length,
      pending: referrals.filter(isPending).length,
      rejected: referrals.filter(isRejected).length,
      awaitingCandidate: referrals.filter(isAwaiting).length,
      totalIncentiveEarned: acceptedReferrals.length * incentiveValue,
      totalIncentivePaid: paidReferrals.length * incentiveValue,
    };

    const referralHistory = referrals.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      company: r.company,
      status: r.referral_status || r.status,
      created_at: r.created_at,
    }));

    const incentiveHistory = acceptedReferrals.map(r => ({
      referral_id: r.id,
      candidate_name: r.name,
      amount: incentiveValue,
      status: r.incentive_status || "pending",
      accepted_at: r.candidate_accepted_at,
      paid_at: r.incentive_paid_at,
      payment_mode: r.payment_mode,
    }));

    const recentActivity = [
      ...referrals.map(r => ({
        type: "referred",
        message: `Referred ${r.name}`,
        date: r.created_at,
      })),
      ...acceptedReferrals
        .filter(r => r.candidate_accepted_at)
        .map(r => ({
          type: "accepted",
          message: `${r.name}'s referral was accepted`,
          date: r.candidate_accepted_at,
        })),
      ...acceptedReferrals
        .filter(r => r.incentive_paid_at)
        .map(r => ({
          type: "paid",
          message: `Incentive paid for ${r.name}`,
          date: r.incentive_paid_at,
        })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    const referralDates = referrals.map(r => new Date(r.created_at)).filter(d => !isNaN(d));
    const accountTimeline = {
      joined_at: referrer.joined_at,
      first_referral_at: referralDates.length ? new Date(Math.min(...referralDates)) : null,
      last_referral_at: referralDates.length ? new Date(Math.max(...referralDates)) : null,
    };

    res.json({
      referrer,
      stats,
      referralHistory,
      incentiveHistory,
      recentActivity,
      accountTimeline,
    });
  } catch (err) {
    console.error("getReferrerFullDetails error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch referrer details" });
  }
};

// MARK A REFERRAL'S INCENTIVE AS PAID / PENDING
export const updateReferralIncentiveStatus = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { referralId } = req.params;
    const { status, payment_mode } = req.body;

    const adminCheck = await pool.query("SELECT role FROM users WHERE id=$1", [adminId]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    await ensureIncentiveColumnsOnce();

    if (!["paid", "pending"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'paid' or 'pending'" });
    }

    const result = await pool.query(
      `UPDATE referrals
       SET incentive_status=$1,
           incentive_paid_at=CASE WHEN $1='paid' THEN NOW() ELSE NULL END,
           payment_mode=CASE WHEN $1='paid' THEN $2 ELSE NULL END
       WHERE id=$3 RETURNING *`,
      [status, payment_mode || null, referralId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Referral not found" });
    }

    res.json({ message: "Incentive status updated", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update incentive status" });
  }
};

// DELETE REFERRER (and their referrals + incentive record)
export const deleteReferrer = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { referrerId } = req.params;

    const adminCheck = await pool.query("SELECT role FROM users WHERE id=$1", [adminId]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const referrer = await pool.query("SELECT * FROM users WHERE id=$1 AND role='referrer'", [referrerId]);
    if (referrer.rows.length === 0) {
      return res.status(404).json({ message: "Referrer not found" });
    }

    await pool.query("DELETE FROM incentives WHERE referrer_id=$1", [referrerId]);
    await pool.query("DELETE FROM referrals WHERE referrer_id=$1", [referrerId]);
    await pool.query("DELETE FROM users WHERE id=$1", [referrerId]);

    res.json({ message: "Referrer removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete referrer" });
  }
};

// SEND A DIRECT EMAIL TO A REFERRER
export const sendReferrerEmail = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { referrerId } = req.params;
    const { subject, message } = req.body;

    const adminCheck = await pool.query("SELECT role FROM users WHERE id=$1", [adminId]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Subject and message are required" });
    }

    const referrer = await pool.query("SELECT name, email FROM users WHERE id=$1 AND role='referrer'", [referrerId]);
    if (referrer.rows.length === 0) {
      return res.status(404).json({ message: "Referrer not found" });
    }

    const { sendEmail } = await import("../services/brevoService.js");
    const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>Hi ${referrer.rows[0].name},</p>
      <p>${message.replace(/\n/g, "<br/>")}</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">PickYourHire Team</p>
    </div>`;

    const sent = await sendEmail(referrer.rows[0].email, subject, htmlContent, referrer.rows[0].name);
    if (!sent) {
      return res.status(502).json({ message: "Failed to send email. Please try again later." });
    }

    res.json({ message: "Email sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send email" });
  }
};

// DELETE CANDIDATE
export const deleteCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Delete the candidate and related referrals
    await pool.query("DELETE FROM referrals WHERE id=$1", [candidateId]);
    const result = await pool.query(
      "DELETE FROM users WHERE id=$1 AND role='candidate' RETURNING *",
      [candidateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.json({
      message: "Candidate removed successfully",
      candidate: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete candidate" });
  }
};

// BULK UPLOAD JOBS
export const bulkUploadJobs = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { jobs } = req.body;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ message: "Invalid jobs data" });
    }

    const createdJobs = [];
    const errors = [];

    for (let i = 0; i < jobs.length; i++) {
      try {
        const job = jobs[i];
        
        if (!job.job_title || !job.location || !job.department) {
          errors.push(`Row ${i + 1}: Missing required fields (job_title, location, department)`);
          continue;
        }

        const result = await pool.query(
          `INSERT INTO jobs(job_title, department, location, job_type, salary_range, experience_required, job_description, responsibilities, qualifications, benefits, created_by, status)
           VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
          [
            job.job_title,
            job.department,
            job.location,
            job.job_type || 'Full-time',
            job.salary_range || '',
            job.experience_required || '',
            job.job_description || '',
            job.responsibilities || '',
            job.qualifications || '',
            job.benefits || '',
            adminId,
            'active'
          ]
        );
        createdJobs.push(result.rows[0]);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    res.json({
      message: "Bulk job upload completed",
      createdCount: createdJobs.length,
      totalCount: jobs.length,
      createdJobs,
      errors: errors.length > 0 ? errors : undefined
    });

    // Mirror each newly created job on the public site (best-effort, never blocks the response above)
    createdJobs.forEach(job => upsertJobOnPublicSite(job));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload jobs" });
  }
};

// BULK UPLOAD CANDIDATES
export const bulkUploadCandidates = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { candidates } = req.body;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ message: "Invalid candidates data" });
    }

    const createdCandidates = [];
    const errors = [];

    for (let i = 0; i < candidates.length; i++) {
      try {
        const candidate = candidates[i];
        
        if (!candidate.name || !candidate.email) {
          errors.push(`Row ${i + 1}: Missing required fields (name, email)`);
          continue;
        }

        // Check if email already exists
        const existingUser = await pool.query(
          "SELECT id FROM users WHERE email=$1",
          [candidate.email]
        );

        if (existingUser.rows.length > 0) {
          errors.push(`Row ${i + 1}: Email ${candidate.email} already exists`);
          continue;
        }

        const result = await pool.query(
          `INSERT INTO users(name, email, phone, skills, experience, location, resume, role, verified)
           VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [
            candidate.name,
            candidate.email,
            candidate['contact_no'] || candidate['contact no.'] || '',
            candidate.skills || '',
            candidate['experience(in years)'] || candidate.experience || '',
            candidate.location || '',
            candidate['resume link'] || '',
            'candidate',
            false
          ]
        );
        createdCandidates.push(result.rows[0]);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    res.json({
      message: "Bulk candidate upload completed",
      createdCount: createdCandidates.length,
      totalCount: candidates.length,
      createdCandidates,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload candidates" });
  }
};

export const revokeReferrerIncentive = async (req, res) => {
  try {
    const { referrerId } = req.params;
    const adminId = req.user.id;
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Delete the incentive record
    const result = await pool.query(
      "DELETE FROM incentives WHERE referrer_id=$1 RETURNING *",
      [referrerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Incentive not found for this referrer" });
    }

    res.json({
      message: "Incentive revoked successfully",
      referrer: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to revoke incentive" });
  }
};

// UPLOAD CANDIDATES FROM CSV FILE
export const uploadCandidatesCSV = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ message: "No CSV file uploaded" });
    }

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Read and parse CSV file
    const csvContent = fs.readFileSync(req.file.path, 'utf8');
    const csvRows = parseCSVString(csvContent);

    if (csvRows.length === 0) {
      fs.unlinkSync(req.file.path); // Delete file
      return res.status(400).json({ message: "No valid candidate data in CSV" });
    }

    const createdCandidates = [];
    const errors = [];

    // Insert each candidate into bulk_candidates table
    for (let i = 0; i < csvRows.length; i++) {
      try {
        const mappedRow = mapCandidateColumns(csvRows[i]);
        
        if (!mappedRow.name || !mappedRow.email) {
          errors.push(`Row ${i + 1}: Missing required fields (name, email)`);
          continue;
        }

        // Check if email already exists
        const existingEmail = await pool.query(
          "SELECT id FROM bulk_candidates WHERE email=$1",
          [mappedRow.email]
        );

        if (existingEmail.rows.length > 0) {
          errors.push(`Row ${i + 1}: Email ${mappedRow.email} already uploaded`);
          continue;
        }

        const result = await pool.query(
          `INSERT INTO bulk_candidates(
            role, name, contact, email, experience, skills, current_ctc, expected_ctc,
            current_location, preferred_location, notice_period, offer_in_hand,
            reason_for_change, current_company_name, highest_qualification, address,
            technical_skills, soft_skills, linkedin, resume_link, other_1, other_2, uploaded_by, status
          ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          RETURNING *`,
          [
            mappedRow.role, mappedRow.name, mappedRow.contact, mappedRow.email,
            mappedRow.experience, mappedRow.skills, mappedRow.current_ctc, mappedRow.expected_ctc,
            mappedRow.current_location, mappedRow.preferred_location, mappedRow.notice_period, mappedRow.offer_in_hand,
            mappedRow.reason_for_change, mappedRow.current_company_name, mappedRow.highest_qualification, mappedRow.address,
            mappedRow.technical_skills, mappedRow.soft_skills, mappedRow.linkedin, mappedRow.resume_link, 
            mappedRow.other_1, mappedRow.other_2, adminId, 'pending'
          ]
        );
        createdCandidates.push(result.rows[0]);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: "Bulk candidate upload completed",
      uploadedCount: createdCandidates.length,
      totalRows: csvRows.length,
      candidates: createdCandidates,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Failed to upload candidates from CSV" });
  }
};

// GET BULK UPLOADED CANDIDATES
export const getBulkUploadedCandidates = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user role
    const userCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userRole = userCheck.rows[0].role;

    // Only admin and recruiters can see bulk candidates
    if (userRole !== "admin" && userRole !== "recruiter") {
      return res.status(403).json({ message: "Access denied" });
    }

    const candidates = await pool.query(
      `SELECT * FROM bulk_candidates WHERE status='pending' 
       ORDER BY upload_date DESC`
    );

    res.json(candidates.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch bulk candidates" });
  }
};

// DELETE BULK UPLOADED CANDIDATE
export const deleteBulkCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const result = await pool.query(
      "DELETE FROM bulk_candidates WHERE id=$1 RETURNING *",
      [candidateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.json({
      message: "Candidate deleted successfully",
      candidate: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete candidate" });
  }
};

// UPDATE BULK CANDIDATE STATUS
export const updateBulkCandidateStatus = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { candidate_status } = req.body;
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Validate status
    const validStatuses = [
      'Contacted', 'Interested', 'Not Interested', 'No Response', 
      'Follow-up Required', 'In Review', 'Shortlisted', 
      'Interview Scheduled', 'Interview Cleared', 'Offered', 
      'Hired', 'Rejected', 'On Hold'
    ];

    if (!candidate_status || !validStatuses.includes(candidate_status)) {
      return res.status(400).json({ 
        message: "Invalid status. Valid statuses are: " + validStatuses.join(', ')
      });
    }

    // Check if candidate exists
    const candidateCheck = await pool.query(
      "SELECT * FROM bulk_candidates WHERE id=$1",
      [candidateId]
    );

    if (candidateCheck.rows.length === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Update the candidate status
    const result = await pool.query(
      `UPDATE bulk_candidates 
       SET candidate_status=$1, status_updated_at=NOW(), status_updated_by=$2
       WHERE id=$3 RETURNING *`,
      [candidate_status, adminId, candidateId]
    );

    res.json({
      message: "Candidate status updated successfully",
      candidate: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update candidate status" });
  }
};

// GET CANDIDATE STATUS STATISTICS
export const getCandidateStatusStats = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Get statistics grouped by status
    const stats = await pool.query(
      `SELECT candidate_status, COUNT(*) as count
       FROM bulk_candidates
       GROUP BY candidate_status
       ORDER BY candidate_status ASC`
    );

    // Get total candidates
    const total = await pool.query(
      "SELECT COUNT(*) as total FROM bulk_candidates"
    );

    res.json({
      total: parseInt(total.rows[0].total),
      byStatus: stats.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch candidate status statistics" });
  }
};

// BULK UPLOAD CANDIDATES FROM RESUME LINKS (AI-parsed)
// POST /api/admin/bulk-upload/resume-links
// Body: { resume_links: ["https://...", ...] }
export const bulkUploadResumeLinks = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Verify admin
    const adminCheck = await pool.query("SELECT role FROM users WHERE id=$1", [adminId]);
    if (!adminCheck.rows.length || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { resume_links } = req.body;
    if (!resume_links || !Array.isArray(resume_links) || resume_links.length === 0) {
      return res.status(400).json({ message: "No resume links provided" });
    }
    if (resume_links.length > 50) {
      return res.status(400).json({ message: "Maximum 50 links per batch" });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < resume_links.length; i++) {
      const url = (resume_links[i] || "").trim();
      if (!url) { errors.push({ index: i + 1, url, error: "Empty URL" }); continue; }

      try {
        // AI parse the resume
        const parsed = await parseResumeFromURL(url);

        // Generate candidate_id: RES-YYYY-NNNNN
        const countResult = await pool.query("SELECT COUNT(*) FROM bulk_candidates");
        const seq = parseInt(countResult.rows[0].count) + 1;
        const candidateId = `RES-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;

        // Deduplicate by email
        if (parsed.email) {
          const existing = await pool.query(
            "SELECT id FROM bulk_candidates WHERE email=$1",
            [parsed.email]
          );
          if (existing.rows.length > 0) {
            errors.push({ index: i + 1, url, error: `Email ${parsed.email} already exists` });
            continue;
          }
        }

        const result = await pool.query(
          `INSERT INTO bulk_candidates(
            candidate_id, name, contact, email, experience, skills,
            current_location, current_company_name, highest_qualification,
            technical_skills, soft_skills, linkedin, resume_link,
            uploaded_by, status, role
          ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
          RETURNING *`,
          [
            candidateId,
            parsed.name || "Unknown",
            parsed.contact || "",
            parsed.email || null,
            parsed.experience || "",
            parsed.skills || "",
            parsed.location || "",
            parsed.current_company_name || "",
            parsed.highest_qualification || "",
            parsed.technical_skills || "",
            parsed.soft_skills || "",
            parsed.linkedin || "",
            url,
            adminId,
            "pending",
            "",
          ]
        );

        results.push(result.rows[0]);
        console.log(`✓ Parsed resume ${i + 1}/${resume_links.length}: ${parsed.name} (${candidateId})`);
      } catch (err) {
        console.error(`✗ Failed resume ${i + 1}: ${url} →`, err.message);
        errors.push({ index: i + 1, url, error: err.message });
      }
    }

    res.json({
      message: "Resume parsing completed",
      parsedCount: results.length,
      errorCount: errors.length,
      totalLinks: resume_links.length,
      candidates: results,
      errors,
    });
  } catch (err) {
    console.error("bulkUploadResumeLinks error:", err);
    res.status(500).json({ message: "Failed to process resume links" });
  }
};

// UPDATE BULK CANDIDATE DETAILS (admin edit)
// PUT /api/admin/bulk-candidates/:candidateId/details
export const updateBulkCandidateDetails = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const adminId = req.user.id;

    const adminCheck = await pool.query("SELECT role FROM users WHERE id=$1", [adminId]);
    if (!adminCheck.rows.length || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const {
      name, email, contact, experience, skills, technical_skills, soft_skills,
      current_location, preferred_location, current_company_name, highest_qualification,
      current_ctc, expected_ctc, notice_period, offer_in_hand, reason_for_change,
      linkedin, role
    } = req.body;

    const result = await pool.query(
      `UPDATE bulk_candidates SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        contact = COALESCE($3, contact),
        experience = COALESCE($4, experience),
        skills = COALESCE($5, skills),
        technical_skills = COALESCE($6, technical_skills),
        soft_skills = COALESCE($7, soft_skills),
        current_location = COALESCE($8, current_location),
        preferred_location = COALESCE($9, preferred_location),
        current_company_name = COALESCE($10, current_company_name),
        highest_qualification = COALESCE($11, highest_qualification),
        current_ctc = COALESCE($12, current_ctc),
        expected_ctc = COALESCE($13, expected_ctc),
        notice_period = COALESCE($14, notice_period),
        offer_in_hand = COALESCE($15, offer_in_hand),
        reason_for_change = COALESCE($16, reason_for_change),
        linkedin = COALESCE($17, linkedin),
        role = COALESCE($18, role)
      WHERE id = $19
      RETURNING *`,
      [
        name, email, contact, experience, skills, technical_skills, soft_skills,
        current_location, preferred_location, current_company_name, highest_qualification,
        current_ctc, expected_ctc, notice_period, offer_in_hand, reason_for_change,
        linkedin, role, candidateId
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.json({ message: "Candidate updated successfully", candidate: result.rows[0] });
  } catch (err) {
    console.error("updateBulkCandidateDetails error:", err);
    res.status(500).json({ message: "Failed to update candidate" });
  }
};

// UPDATE REGULAR CANDIDATE DETAILS (admin edit — users table)
// PUT /api/admin/candidates/:candidateId/details
export const updateCandidateDetails = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const adminId = req.user.id;

    const adminCheck = await pool.query("SELECT role FROM users WHERE id=$1", [adminId]);
    if (!adminCheck.rows.length || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const {
      name, email, phone, skills, technical_skills, soft_skills,
      experience, current_location, preferred_location, current_company_name,
      highest_qualification, current_ctc, expected_ctc, notice_period,
      offer_in_hand, reason_for_change, linkedin_profile
    } = req.body;

    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        skills = COALESCE($4, skills),
        technical_skills = COALESCE($5, technical_skills),
        soft_skills = COALESCE($6, soft_skills),
        experience = COALESCE($7, experience),
        current_location = COALESCE($8, current_location),
        preferred_location = COALESCE($9, preferred_location),
        current_company_name = COALESCE($10, current_company_name),
        highest_qualification = COALESCE($11, highest_qualification),
        cctc = COALESCE($12, cctc),
        ectc = COALESCE($13, ectc),
        notice_period = COALESCE($14, notice_period),
        offer_in_hand = COALESCE($15, offer_in_hand),
        reason_for_change = COALESCE($16, reason_for_change),
        linkedin_profile = COALESCE($17, linkedin_profile)
      WHERE id = $18 AND role = 'candidate'
      RETURNING *`,
      [
        name, email, phone, skills, technical_skills, soft_skills,
        experience, current_location, preferred_location, current_company_name,
        highest_qualification, current_ctc, expected_ctc, notice_period,
        offer_in_hand, reason_for_change, linkedin_profile, candidateId
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.json({ message: "Candidate updated successfully", candidate: result.rows[0] });
  } catch (err) {
    console.error("updateCandidateDetails error:", err);
    res.status(500).json({ message: "Failed to update candidate" });
  }
};

// ════════════════════════════════════════════════════════════════
// UNIFIED CANDIDATE STATUS MANAGEMENT (Portal users + Bulk uploads + Referrals)
// ════════════════════════════════════════════════════════════════

// referrals.skills is stored as a JSON-stringified array — normalize to a comma string
const normalizeReferralSkills = (raw) => {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.join(", ") : String(raw);
  } catch {
    return String(raw);
  }
};

// referrals don't use the hiring-pipeline status vocabulary (Contacted/Hired/etc) —
// map their referral_status into a readable label for display purposes
const referralStatusLabel = (referral_status) => {
  const map = {
    pending_candidate_acceptance: "Awaiting Candidate",
    pending: "Pending Review",
    accepted: "Accepted",
    shortlist: "Shortlisted",
    reject: "Rejected",
    hold: "On Hold",
  };
  return map[referral_status] || "Referred";
};

const fetchReferredRowsForStatus = async () => {
  const rows = (await pool.query(
    `SELECT id, name, email, phone AS contact, company, department, skills, experience,
            referral_status, status, created_at, cv_file
     FROM referrals ORDER BY id DESC`
  )).rows;
  return rows.map(r => ({
    ...r,
    _source: "referred",
    job_role: r.company || r.department || null,
    skills: normalizeReferralSkills(r.skills),
    current_location: null,
    candidate_status: referralStatusLabel(r.referral_status),
    status_updated_at: null,
    ai_suitability_score: null,
    ai_score_breakdown: null,
  }));
};

// GET /api/admin/candidate-status/list
// Query: search, status, source(all|portal|bulk|referred), location, page, limit
export const getUnifiedCandidateStatusList = async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.status(403).json({ message: "Access denied. Admin only." });

    const activeJobs = (await pool.query(
      "SELECT job_title, department, qualifications, job_description, experience_required FROM jobs WHERE status='active'"
    )).rows;

    const portalRows = (await pool.query(
      `SELECT id, name, email, contact, phone, job_role, skills, experience, current_location,
              candidate_status, status_updated_at, created_at, resume_file_path, ai_suitability_score,
              ai_score_breakdown, ai_score_updated_at
       FROM users WHERE role='candidate' ORDER BY id DESC`
    )).rows.map(r => ({ ...r, _source: "portal", contact: r.contact || r.phone, resume_link: r.resume_file_path }));

    const bulkRows = (await pool.query(
      `SELECT id, name, email, contact, role as job_role, skills, experience, current_location,
              candidate_status, status_updated_at, created_at, resume_link, ai_suitability_score,
              ai_score_breakdown, ai_score_updated_at
       FROM bulk_candidates ORDER BY id DESC`
    )).rows.map(r => ({ ...r, _source: "bulk" }));

    const referredRows = await fetchReferredRowsForStatus();

    let merged = [...portalRows, ...bulkRows, ...referredRows];

    // Live-compute AI suitability score for anyone never scored (or stale > skills changed) — cheap, deterministic
    merged = merged.map((c) => {
      if (c.ai_suitability_score === null || c.ai_suitability_score === undefined) {
        const result = computeSuitabilityScore(c, activeJobs);
        return { ...c, ai_suitability_score: result.score, ai_score_label: result.label, ai_score_breakdown: result.breakdown };
      }
      const labelFor = (s) => s >= 85 ? "Excellent Match" : s >= 70 ? "Very Good Match" : s >= 55 ? "Good Match" : s >= 40 ? "Average Match" : "Low Match";
      return { ...c, ai_score_label: labelFor(c.ai_suitability_score) };
    });

    // ── Filters ──
    const { search = "", status = "all", source = "all", location = "all", skill = "all" } = req.query;
    const s = search.trim().toLowerCase();

    if (s) {
      merged = merged.filter(c =>
        (c.name || "").toLowerCase().includes(s) ||
        (c.email || "").toLowerCase().includes(s) ||
        (c.contact || "").toLowerCase().includes(s) ||
        (c.skills || "").toLowerCase().includes(s)
      );
    }
    if (status !== "all") merged = merged.filter(c => (c.candidate_status || "New") === status);
    if (source !== "all") merged = merged.filter(c => c._source === source);
    if (location !== "all") merged = merged.filter(c => (c.current_location || "").toLowerCase() === location.toLowerCase());
    if (skill !== "all") merged = merged.filter(c => (c.skills || "").toLowerCase().includes(skill.toLowerCase()));

    // Sort newest first
    merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const totalFiltered = merged.length;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const paged = merged.slice((page - 1) * limit, page * limit);

    // Distinct filter options for dropdowns (computed from the FULL dataset, not just current page)
    const allForOptions = [...portalRows, ...bulkRows, ...referredRows];
    const locations = [...new Set(allForOptions.map(c => c.current_location).filter(Boolean))].sort();
    const skillsSet = new Set();
    allForOptions.forEach(c => (c.skills || "").split(",").map(x => x.trim()).filter(Boolean).forEach(x => skillsSet.add(x)));

    res.json({
      candidates: paged,
      total: totalFiltered,
      totalAll: allForOptions.length,
      portalCount: portalRows.length,
      bulkCount: bulkRows.length,
      referredCount: referredRows.length,
      page, limit,
      totalPages: Math.max(1, Math.ceil(totalFiltered / limit)),
      filters: { locations, skills: [...skillsSet].sort(), statuses: CANDIDATE_STATUSES },
    });
  } catch (err) {
    console.error("getUnifiedCandidateStatusList error:", err);
    res.status(500).json({ message: "Failed to fetch candidate status list" });
  }
};

// GET /api/admin/candidate-status/overview
export const getUnifiedCandidateStatusOverview = async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.status(403).json({ message: "Access denied. Admin only." });

    const portal = (await pool.query("SELECT candidate_status FROM users WHERE role='candidate'")).rows;
    const bulk = (await pool.query("SELECT candidate_status FROM bulk_candidates")).rows;
    const referred = (await pool.query("SELECT referral_status FROM referrals")).rows
      .map(r => ({ candidate_status: referralStatusLabel(r.referral_status) }));
    const all = [...portal, ...bulk, ...referred];

    const bucket = (s) => {
      const v = (s || "New").toLowerCase();
      if (["hired"].includes(v)) return "Hired";
      if (["offered"].includes(v)) return "Offered";
      if (["interview scheduled", "interview cleared"].includes(v)) return "Interview Scheduled";
      if (["rejected", "not interested"].includes(v)) return "Rejected";
      if (["on hold"].includes(v)) return "On Hold";
      return "Contacted";
    };

    const counts = { Total: all.length, Contacted: 0, "Interview Scheduled": 0, Offered: 0, Hired: 0, Rejected: 0, "On Hold": 0 };
    all.forEach(c => { counts[bucket(c.candidate_status)]++; });

    // Raw distribution too (used for the granular filter chips already in the UI)
    const byStatusMap = {};
    all.forEach(c => { const k = c.candidate_status || "New"; byStatusMap[k] = (byStatusMap[k] || 0) + 1; });
    const byStatus = Object.entries(byStatusMap).map(([candidate_status, count]) => ({ candidate_status, count }));

    res.json({ total: all.length, counts, byStatus, portalTotal: portal.length, bulkTotal: bulk.length, referredTotal: referred.length });
  } catch (err) {
    console.error("getUnifiedCandidateStatusOverview error:", err);
    res.status(500).json({ message: "Failed to fetch overview" });
  }
};

// PUT /api/admin/candidate-status/:source/:id
export const updateUnifiedCandidateStatus = async (req, res) => {
  try {
    const adminId = req.user.id;
    if (!(await isAdmin(adminId))) return res.status(403).json({ message: "Access denied. Admin only." });

    const { source, id } = req.params;
    const { candidate_status } = req.body;
    if (!CANDIDATE_STATUSES.includes(candidate_status)) {
      return res.status(400).json({ message: "Invalid status. Valid: " + CANDIDATE_STATUSES.join(", ") });
    }
    if (!["portal", "bulk"].includes(source)) return res.status(400).json({ message: "Invalid source" });

    const table = source === "portal" ? "users" : "bulk_candidates";
    const roleClause = source === "portal" ? "AND role='candidate'" : "";
    const result = await pool.query(
      `UPDATE ${table} SET candidate_status=$1, status_updated_at=NOW(), status_updated_by=$2 WHERE id=$3 ${roleClause} RETURNING *`,
      [candidate_status, adminId, id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Candidate not found" });

    res.json({ message: "Status updated", candidate: result.rows[0] });
  } catch (err) {
    console.error("updateUnifiedCandidateStatus error:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
};

// GET /api/admin/candidate-status/export — CSV download honoring the same filters as the list view
export const exportUnifiedCandidateStatusCSV = async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.status(403).json({ message: "Access denied. Admin only." });

    const portalRows = (await pool.query(
      `SELECT id, name, email, contact, phone, job_role, skills, experience, current_location, candidate_status, created_at
       FROM users WHERE role='candidate' ORDER BY id DESC`
    )).rows.map(r => ({ ...r, _source: "Portal", contact: r.contact || r.phone }));

    const bulkRows = (await pool.query(
      `SELECT id, name, email, contact, role as job_role, skills, experience, current_location, candidate_status, created_at
       FROM bulk_candidates ORDER BY id DESC`
    )).rows.map(r => ({ ...r, _source: "Bulk" }));

    const referredRows = (await pool.query(
      `SELECT id, name, email, phone AS contact, company, department, skills, experience, referral_status, created_at
       FROM referrals ORDER BY id DESC`
    )).rows.map(r => ({
      ...r,
      _source: "Referred",
      job_role: r.company || r.department || null,
      skills: normalizeReferralSkills(r.skills),
      current_location: null,
      candidate_status: referralStatusLabel(r.referral_status),
    }));

    let merged = [...portalRows, ...bulkRows, ...referredRows];
    const { search = "", status = "all", source = "all" } = req.query;
    const s = search.trim().toLowerCase();
    if (s) merged = merged.filter(c => (c.name || "").toLowerCase().includes(s) || (c.email || "").toLowerCase().includes(s));
    if (status !== "all") merged = merged.filter(c => (c.candidate_status || "New") === status);
    if (source !== "all") merged = merged.filter(c => c._source.toLowerCase() === source);

    const headers = ["ID", "Source", "Name", "Email", "Contact", "Role", "Skills", "Experience", "Location", "Status", "Created At"];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(",")];
    merged.forEach(c => {
      lines.push([c.id, c._source, c.name, c.email, c.contact, c.job_role, c.skills, c.experience, c.current_location, c.candidate_status || "New", c.created_at]
        .map(escape).join(","));
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="candidate-status-${Date.now()}.csv"`);
    res.send(lines.join("\n"));
  } catch (err) {
    console.error("exportUnifiedCandidateStatusCSV error:", err);
    res.status(500).json({ message: "Failed to export CSV" });
  }
};

// ════════════════════════════════════════════════════════════════
// RECRUITER APPROVAL CENTER
// ════════════════════════════════════════════════════════════════

const documentsStatusFor = (r) => {
  const fields = [r.company_name, r.company_website, r.phone];
  const filled = fields.filter(Boolean).length;
  if (filled === fields.length) return "Complete";
  if (filled === 0) return "Missing";
  return "Partial";
};

const logRecruiterActivity = async (recruiter, action, note, adminId) => {
  await pool.query(
    `INSERT INTO recruiter_activity_log (recruiter_id, recruiter_name, company_name, action, note, actor_admin_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [recruiter.id, recruiter.name, recruiter.company_name, action, note || null, adminId]
  );
};

// GET /api/admin/users/recruiter/:recruiterId  (single recruiter profile for the Recruiter Details page)
export const getRecruiterDetails = async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.status(403).json({ message: "Access denied. Admin only." });

    const { recruiterId } = req.params;

    const result = await pool.query(
      `SELECT id, name, email, phone, company_name, company_website, is_recruiter_approved,
              recruiter_status, recruiter_approved_at, recruiter_rejected_at, rejection_reason, created_at
       FROM users WHERE id=$1 AND role='recruiter'`,
      [recruiterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    const recruiter = result.rows[0];
    recruiter.recruiter_status = recruiter.recruiter_status || (recruiter.is_recruiter_approved ? "approved" : "pending");
    recruiter.documents_status = documentsStatusFor(recruiter);

    res.json(recruiter);
  } catch (err) {
    console.error("getRecruiterDetails error:", err);
    res.status(500).json({ message: "Failed to fetch recruiter details" });
  }
};

// GET /api/admin/recruiters/pending  (rich filters for the Approval Center)
// Query: search, status(pending|approved|rejected|all - default pending), company, registeredOn(today|week|month|all)
export const getRecruiterApprovalCenter = async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.status(403).json({ message: "Access denied. Admin only." });

    const { search = "", status = "pending", company = "all", registeredOn = "all" } = req.query;

    let recruiters = (await pool.query(
      `SELECT id, name, email, phone, company_name, company_website, is_recruiter_approved,
              recruiter_status, recruiter_approved_at, recruiter_rejected_at, rejection_reason, created_at
       FROM users WHERE role='recruiter' ORDER BY id DESC`
    )).rows.map(r => ({ ...r, documents_status: documentsStatusFor(r), recruiter_status: r.recruiter_status || (r.is_recruiter_approved ? "approved" : "pending") }));

    const s = search.trim().toLowerCase();
    if (s) {
      recruiters = recruiters.filter(r =>
        (r.name || "").toLowerCase().includes(s) ||
        (r.email || "").toLowerCase().includes(s) ||
        (r.company_name || "").toLowerCase().includes(s)
      );
    }
    if (status !== "all") recruiters = recruiters.filter(r => r.recruiter_status === status);
    if (company !== "all") recruiters = recruiters.filter(r => r.company_name === company);
    if (registeredOn !== "all") {
      const now = new Date();
      const cutoffs = { today: 1, week: 7, month: 30 };
      const days = cutoffs[registeredOn] ?? null;
      if (days) {
        const cutoff = new Date(now.getTime() - days * 86400000);
        recruiters = recruiters.filter(r => new Date(r.created_at) >= cutoff);
      }
    }

    const allRecruiters = (await pool.query(
      `SELECT recruiter_status, is_recruiter_approved, company_name FROM users WHERE role='recruiter'`
    )).rows;
    const stats = {
      pending: allRecruiters.filter(r => (r.recruiter_status || (r.is_recruiter_approved ? "approved" : "pending")) === "pending").length,
      approved: allRecruiters.filter(r => (r.recruiter_status || (r.is_recruiter_approved ? "approved" : "pending")) === "approved").length,
      rejected: allRecruiters.filter(r => r.recruiter_status === "rejected").length,
      total: allRecruiters.length,
    };
    const companies = [...new Set(allRecruiters.map(r => r.company_name).filter(Boolean))].sort();

    const activity = (await pool.query(
      `SELECT * FROM recruiter_activity_log ORDER BY created_at DESC LIMIT 8`
    )).rows;

    res.json({ recruiters, stats, companies, activity });
  } catch (err) {
    console.error("getRecruiterApprovalCenter error:", err);
    res.status(500).json({ message: "Failed to fetch recruiter approval data" });
  }
};

// GET /api/admin/recruiters/export
export const exportRecruitersCSV = async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.status(403).json({ message: "Access denied. Admin only." });
    const { status = "all" } = req.query;
    let recruiters = (await pool.query(
      `SELECT id, name, email, phone, company_name, company_website, recruiter_status, is_recruiter_approved, created_at, recruiter_approved_at
       FROM users WHERE role='recruiter' ORDER BY id DESC`
    )).rows.map(r => ({ ...r, recruiter_status: r.recruiter_status || (r.is_recruiter_approved ? "approved" : "pending") }));
    if (status !== "all") recruiters = recruiters.filter(r => r.recruiter_status === status);

    const headers = ["ID", "Name", "Email", "Phone", "Company", "Website", "Status", "Registered On", "Approved On"];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(",")];
    recruiters.forEach(r => lines.push([r.id, r.name, r.email, r.phone, r.company_name, r.company_website, r.recruiter_status, r.created_at, r.recruiter_approved_at].map(escape).join(",")));

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="recruiters-${Date.now()}.csv"`);
    res.send(lines.join("\n"));
  } catch (err) {
    console.error("exportRecruitersCSV error:", err);
    res.status(500).json({ message: "Failed to export recruiters" });
  }
};

// PUT /api/admin/recruiters/:recruiterId/approve  (overrides legacy handler with activity logging)
export const approveRecruiterV2 = async (req, res) => {
  try {
    const adminId = req.user.id;
    if (!(await isAdmin(adminId))) return res.status(403).json({ message: "Access denied. Admin only." });

    const { recruiterId } = req.params;
    const check = await pool.query("SELECT * FROM users WHERE id=$1 AND role='recruiter'", [recruiterId]);
    if (!check.rows.length) return res.status(404).json({ message: "Recruiter not found" });
    const recruiter = check.rows[0];

    const result = await pool.query(
      `UPDATE users SET is_recruiter_approved=true, recruiter_status='approved', recruiter_approved_at=NOW(),
              rejection_reason=NULL, recruiter_rejected_at=NULL
       WHERE id=$1 RETURNING *`,
      [recruiterId]
    );

    await logRecruiterActivity(recruiter, "approved", null, adminId);
    try { await sendRecruiterApprovalEmail(recruiter.email, recruiter.name); } catch (e) { console.error("Approval email failed:", e.message); }

    res.json({ message: "Recruiter approved successfully. Approval email sent.", recruiter: result.rows[0] });
  } catch (err) {
    console.error("approveRecruiterV2 error:", err);
    res.status(500).json({ message: "Failed to approve recruiter" });
  }
};

// PUT /api/admin/recruiters/:recruiterId/reject  (soft-reject — keeps the record, no destructive delete)
export const rejectRecruiterV2 = async (req, res) => {
  try {
    const adminId = req.user.id;
    if (!(await isAdmin(adminId))) return res.status(403).json({ message: "Access denied. Admin only." });

    const { recruiterId } = req.params;
    const { reason } = req.body;
    const check = await pool.query("SELECT * FROM users WHERE id=$1 AND role='recruiter'", [recruiterId]);
    if (!check.rows.length) return res.status(404).json({ message: "Recruiter not found" });
    const recruiter = check.rows[0];

    const result = await pool.query(
      `UPDATE users SET is_recruiter_approved=false, recruiter_status='rejected', recruiter_rejected_at=NOW(), rejection_reason=$2
       WHERE id=$1 RETURNING *`,
      [recruiterId, reason || null]
    );

    await logRecruiterActivity(recruiter, "rejected", reason, adminId);
    try { await sendRecruiterRejectionEmail(recruiter.email, recruiter.name, reason); } catch (e) { console.error("Rejection email failed:", e.message); }

    res.json({ message: "Recruiter rejected. Rejection email sent.", recruiter: result.rows[0] });
  } catch (err) {
    console.error("rejectRecruiterV2 error:", err);
    res.status(500).json({ message: "Failed to reject recruiter" });
  }
};

// PUT /api/admin/recruiters/:recruiterId/reconsider  (move a rejected recruiter back to pending)
export const reconsiderRecruiter = async (req, res) => {
  try {
    const adminId = req.user.id;
    if (!(await isAdmin(adminId))) return res.status(403).json({ message: "Access denied. Admin only." });
    const { recruiterId } = req.params;
    const check = await pool.query("SELECT * FROM users WHERE id=$1 AND role='recruiter'", [recruiterId]);
    if (!check.rows.length) return res.status(404).json({ message: "Recruiter not found" });

    const result = await pool.query(
      `UPDATE users SET recruiter_status='pending', is_recruiter_approved=false, rejection_reason=NULL, recruiter_rejected_at=NULL
       WHERE id=$1 RETURNING *`,
      [recruiterId]
    );
    await logRecruiterActivity(check.rows[0], "reconsidered", null, adminId);
    res.json({ message: "Recruiter moved back to pending review", recruiter: result.rows[0] });
  } catch (err) {
    console.error("reconsiderRecruiter error:", err);
    res.status(500).json({ message: "Failed to reconsider recruiter" });
  }
};
