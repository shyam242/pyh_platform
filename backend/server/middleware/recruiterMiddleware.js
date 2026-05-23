import pool from "../config/db.js";

export const checkRecruiterApproved = async (req, res, next) => {
  try {
    // Ensure user is authenticated (protect middleware should run first)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.id;

    // Check if user is a recruiter and if they're approved
    const result = await pool.query(
      "SELECT role, is_recruiter_approved FROM users WHERE id=$1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const { role, is_recruiter_approved } = result.rows[0];

    if (role !== "recruiter") {
      return res.status(403).json({ message: "This action is only for recruiters" });
    }

    if (!is_recruiter_approved) {
      return res.status(403).json({ 
        message: "Your recruiter profile is pending admin approval. You'll have full access once approved." 
      });
    }

    next();
  } catch (error) {
    console.error("Error in checkRecruiterApproved:", error);
    res.status(500).json({ message: "Failed to verify recruiter status" });
  }
};
