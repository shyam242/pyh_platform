import pool from "../config/db.js";
export const createJob = async (req, res) => {
  try {
    const {
      job_title,
      department,
      location,
      job_type,
      salary_range,
      experience_required,
      job_description,
      responsibilities,
      qualifications,
      benefits
    } = req.body;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [req.user.id]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Validate required fields
    if (!job_title || !department || !location || !job_type || !experience_required || !job_description) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const result = await pool.query(
      `INSERT INTO jobs
      (job_title, department, location, job_type, salary_range, experience_required, 
       job_description, responsibilities, qualifications, benefits, created_by)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        job_title,
        department,
        location,
        job_type,
        salary_range,
        experience_required,
        job_description,
        responsibilities,
        qualifications,
        benefits,
        req.user.id
      ]
    );

    res.status(201).json({
      message: "Job posting created successfully",
      job: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create job posting" });
  }
};

// GET ALL JOBS
export const getAllJobs = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM jobs WHERE status='active' ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

// GET JOB BY ID
export const getJobById = async (req, res) => {
  try {
    const { jobId } = req.params;

    const result = await pool.query(
      "SELECT * FROM jobs WHERE id=$1",
      [jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch job" });
  }
};

// UPDATE JOB
export const updateJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const {
      job_title,
      department,
      location,
      job_type,
      salary_range,
      experience_required,
      job_description,
      responsibilities,
      qualifications,
      benefits,
      status
    } = req.body;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [req.user.id]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    let query = "UPDATE jobs SET ";
    const params = [];
    let paramCount = 1;

    if (job_title !== undefined) {
      query += `job_title=$${paramCount}, `;
      params.push(job_title);
      paramCount++;
    }
    if (department !== undefined) {
      query += `department=$${paramCount}, `;
      params.push(department);
      paramCount++;
    }
    if (location !== undefined) {
      query += `location=$${paramCount}, `;
      params.push(location);
      paramCount++;
    }
    if (job_type !== undefined) {
      query += `job_type=$${paramCount}, `;
      params.push(job_type);
      paramCount++;
    }
    if (salary_range !== undefined) {
      query += `salary_range=$${paramCount}, `;
      params.push(salary_range);
      paramCount++;
    }
    if (experience_required !== undefined) {
      query += `experience_required=$${paramCount}, `;
      params.push(experience_required);
      paramCount++;
    }
    if (job_description !== undefined) {
      query += `job_description=$${paramCount}, `;
      params.push(job_description);
      paramCount++;
    }
    if (responsibilities !== undefined) {
      query += `responsibilities=$${paramCount}, `;
      params.push(responsibilities);
      paramCount++;
    }
    if (qualifications !== undefined) {
      query += `qualifications=$${paramCount}, `;
      params.push(qualifications);
      paramCount++;
    }
    if (benefits !== undefined) {
      query += `benefits=$${paramCount}, `;
      params.push(benefits);
      paramCount++;
    }
    if (status !== undefined) {
      const normalizedStatus = status.toLowerCase();
      if (!["active", "inactive", "closed"].includes(normalizedStatus)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      query += `status=$${paramCount}, `;
      params.push(normalizedStatus);
      paramCount++;
    }

    query += `updated_at=NOW() WHERE id=$${paramCount} RETURNING *`;
    params.push(jobId);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({
      message: "Job updated successfully",
      job: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update job" });
  }
};

// DELETE JOB (Soft delete - set status to inactive)
export const deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [req.user.id]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const result = await pool.query(
      "UPDATE jobs SET status='deleted', updated_at=NOW() WHERE id=$1 RETURNING *",
      [jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({
      message: "Job deleted successfully",
      job: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete job" });
  }
};

// BULK DELETE JOBS
export const bulkDeleteJobs = async (req, res) => {
  try {
    const { jobIds } = req.body;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [req.user.id]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ message: "No jobs selected for deletion" });
    }

    // Mark jobs as inactive
    const placeholders = jobIds.map((_, i) => `$${i + 1}`).join(",");
    const result = await pool.query(
      `UPDATE jobs SET status='deleted', updated_at=NOW() 
       WHERE id IN (${placeholders})
       RETURNING *`,
      [...jobIds]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No jobs were deleted. Confirm the selected jobs exist.",
        deletedCount: 0,
        jobs: []
      });
    }

    res.json({
      message: `${result.rows.length} job(s) deleted successfully`,
      deletedCount: result.rows.length,
      jobs: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete jobs" });
  }
};

// GET ADMIN'S JOBS
export const getAdminJobs = async (req, res) => {
  try {
    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [req.user.id]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Includes a real applicant count per job (no placeholder numbers)
    const result = await pool.query(
      `SELECT j.*, COALESCE(a.applicant_count, 0) AS applicant_count
       FROM jobs j
       LEFT JOIN (
         SELECT job_id, COUNT(*) AS applicant_count
         FROM job_applications
         GROUP BY job_id
       ) a ON a.job_id = j.id
       WHERE j.created_by=$1 AND j.status != 'deleted'
       ORDER BY j.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

// APPLY FOR JOB
export const applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const candidateId = req.user.id;

    // Verify job exists
    const jobCheck = await pool.query(
      "SELECT id FROM jobs WHERE id=$1 AND status='active'",
      [jobId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ message: "Job not found or is inactive" });
    }

    // Check if already applied
    const existingApplication = await pool.query(
      "SELECT id FROM job_applications WHERE job_id=$1 AND candidate_id=$2",
      [jobId, candidateId]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({ message: "You have already applied for this job" });
    }

    // Create application
    const result = await pool.query(
      `INSERT INTO job_applications (job_id, candidate_id)
       VALUES($1, $2)
       RETURNING id, job_id, candidate_id, applied_at, status`,
      [jobId, candidateId]
    );

    res.status(201).json({
      message: "Application submitted successfully",
      application: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit application" });
  }
};

// GET JOB APPLICATIONS (for admin to see who applied)
export const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Verify user is admin
    const adminCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [req.user.id]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const result = await pool.query(
      `SELECT ja.id, ja.job_id, ja.candidate_id, ja.applied_at, ja.status,
              u.name, u.email, u.phone, u.image
       FROM job_applications ja
       JOIN users u ON ja.candidate_id = u.id
       WHERE ja.job_id=$1
       ORDER BY ja.applied_at DESC`,
      [jobId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
};

// GET CANDIDATE'S APPLIED JOBS COUNT
export const getCandidateAppliedCount = async (req, res) => {
  try {
    const candidateId = req.user.id;

    const result = await pool.query(
      `SELECT COUNT(*) as count FROM job_applications WHERE candidate_id=$1`,
      [candidateId]
    );

    res.json({ appliedCount: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch applied count" });
  }
};
