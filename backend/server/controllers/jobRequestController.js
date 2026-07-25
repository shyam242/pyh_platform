import pool from "../config/db.js";

// CANDIDATE — SUBMIT A "CAN'T FIND MY JOB" REQUEST
export const createJobRequest = async (req, res) => {
  try {
    const candidateId = req.user.id;
    const {
      job_role,
      department,
      location,
      job_type,
      experience_required,
      ctc,
      notes,
    } = req.body;

    if (!job_role || !job_role.trim()) {
      return res.status(400).json({ message: "Job role / title is required" });
    }

    const result = await pool.query(
      `INSERT INTO job_requests
        (candidate_id, job_role, department, location, job_type, experience_required, ctc, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        candidateId,
        job_role.trim(),
        department || null,
        location || null,
        job_type || null,
        experience_required || null,
        ctc || null,
        notes || null,
      ]
    );

    res.status(201).json({
      message: "Your job request has been submitted. Our team will get back to you.",
      request: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit job request" });
  }
};

// CANDIDATE — GET MY OWN SUBMITTED REQUESTS
export const getMyJobRequests = async (req, res) => {
  try {
    const candidateId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM job_requests WHERE candidate_id=$1 ORDER BY created_at DESC`,
      [candidateId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch your job requests" });
  }
};

// ADMIN — GET ALL JOB REQUESTS (with submitting candidate's info)
export const getAllJobRequests = async (req, res) => {
  try {
    const adminCheck = await pool.query("SELECT role FROM users WHERE id=$1", [req.user.id]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const result = await pool.query(
      `SELECT jr.*, u.name AS candidate_name, u.email AS candidate_email, u.phone AS candidate_phone
       FROM job_requests jr
       JOIN users u ON jr.candidate_id = u.id
       ORDER BY jr.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch job requests" });
  }
};

// ADMIN — UPDATE STATUS OF A JOB REQUEST (pending / reviewed / fulfilled / rejected)
export const updateJobRequestStatus = async (req, res) => {
  try {
    const adminCheck = await pool.query("SELECT role FROM users WHERE id=$1", [req.user.id]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { requestId } = req.params;
    const { status, admin_notes } = req.body;

    const allowedStatuses = ["pending", "reviewed", "fulfilled", "rejected"];
    if (!status || !allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const result = await pool.query(
      `UPDATE job_requests
       SET status=$1, admin_notes=COALESCE($2, admin_notes), updated_at=NOW()
       WHERE id=$3
       RETURNING *`,
      [status.toLowerCase(), admin_notes || null, requestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job request not found" });
    }

    res.json({ message: "Job request updated", request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update job request" });
  }
};

// ADMIN — DELETE A JOB REQUEST
export const deleteJobRequest = async (req, res) => {
  try {
    const adminCheck = await pool.query("SELECT role FROM users WHERE id=$1", [req.user.id]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { requestId } = req.params;
    const result = await pool.query(
      "DELETE FROM job_requests WHERE id=$1 RETURNING *",
      [requestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job request not found" });
    }

    res.json({ message: "Job request deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete job request" });
  }
};
