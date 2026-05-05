import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const createProfile = async (req, res) => {
  const { name, role, email } = req.body;

  try {
    // Check if user with this email already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const result = await pool.query(
      "INSERT INTO users(name,email,role) VALUES($1,$2,$3) RETURNING *",
      [name, email, role]
    );

    const token = jwt.sign(
      { id: result.rows[0].id, role },
      process.env.JWT_SECRET
    );

    res.json({ token, user: result.rows[0] });
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
};
