import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

import jwt from "jsonwebtoken";
import otpGenerator from "otp-generator";
import pool from "../config/db.js";
import { sendOtpEmail } from "../services/brevoService.js";

const otpStore = new Map();

// Get admin emails from env
const getAdminEmails = () => {
  const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
  return adminEmailsEnv.split(",").map(email => email.trim()).filter(email => email);
};

const isAdminEmail = (email) => {
  return getAdminEmails().includes(email);
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    otpStore.set(email, otp);
    console.log(`📧 Generated OTP for ${email}: ${otp}`);

    // Send OTP via Brevo
    const emailSent = await sendOtpEmail(email, otp);

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    console.log(`✓ OTP sent to ${email}`);
    res.json({ message: "OTP Sent Successfully" });
  } catch (error) {
    console.error("❌ Error sending OTP:", error.message);
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp, magic_token } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const storedOtp = otpStore.get(email);
    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    otpStore.delete(email);

    // Validate magic token if provided
    let magicReferrerId = null;
    if (magic_token) {
      const mlResult = await pool.query(
        `SELECT referrer_id, expires_at FROM referrer_magic_links WHERE token=$1`,
        [magic_token]
      );
      if (mlResult.rows.length && new Date(mlResult.rows[0].expires_at) >= new Date()) {
        magicReferrerId = mlResult.rows[0].referrer_id;
      }
    }

    const user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const adminEmail = isAdminEmail(email);

    if (user.rows.length === 0) {
      // ── NEW USER ──────────────────────────────────────────────────────────
      if (adminEmail) {
        const newUser = await pool.query(
          "INSERT INTO users(name,email,role) VALUES($1,$2,$3) RETURNING *",
          [email.split("@")[0], email, "admin"]
        );
        const token = jwt.sign(
          { id: newUser.rows[0].id, role: "admin" },
          process.env.JWT_SECRET
        );
        return res.json({ token, user: newUser.rows[0], isAdmin: true });
      }

      // Came via magic link → auto-create as referrer, skip role selection
      if (magicReferrerId) {
        const newUser = await pool.query(
          "INSERT INTO users(name,email,role) VALUES($1,$2,$3) RETURNING *",
          [email.split("@")[0], email, "referrer"]
        );
        const token = jwt.sign(
          { id: newUser.rows[0].id, role: "referrer" },
          process.env.JWT_SECRET
        );
        return res.json({
          token,
          user: newUser.rows[0],
          newReferrer: true,  // signal frontend to go to create-profile with role locked
        });
      }

      // Regular new user → role selection
      return res.json({ newUser: true, email });
    }

    // ── EXISTING USER ─────────────────────────────────────────────────────
    let userRole = user.rows[0].role;

    if (adminEmail && userRole !== "admin") {
      await pool.query("UPDATE users SET role=$1 WHERE email=$2", ["admin", email]);
      userRole = "admin";
    }

    const token = jwt.sign(
      { id: user.rows[0].id, role: userRole },
      process.env.JWT_SECRET
    );

    res.json({
      token,
      user: { ...user.rows[0], role: userRole },
      isAdmin: adminEmail,
    });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error.message);
    res.status(500).json({ message: "Failed to verify OTP", error: error.message });
  }
};
