import pool from "../config/db.js";
import fs from "fs";
import { parseCSVString, mapCandidateColumns } from "../services/csvParser.js";
import { sendRecruiterApprovalEmail, sendRecruiterRejectionEmail } from "../services/brevoService.js";
import { parseResumeFromURL } from "../services/resumeParserService.js";

const ADMIN_EMAIL = "shyampickyourhire@gmail.com";

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

// GET ALL REFERRERS WITH INCENTIVES
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

    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.company, u.experience,
             COALESCE(i.incentive_value, 500) as incentive_value
      FROM users u
      LEFT JOIN incentives i ON u.id = i.referrer_id
      WHERE u.role='referrer'
      ORDER BY u.id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch referrers" });
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
