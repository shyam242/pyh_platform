import { createRequire } from "module";
const require = createRequire(import.meta.url);
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import referralRoutes from "./routes/referral.js";
import recruiterRoutes from "./routes/recruiter.js";
import adminRoutes from "./routes/admin.js";
import jobRoutes from "./routes/jobs.js";
import pool from "./config/db.js";

// Auto-create resume_views table if it doesn't exist
const ensureResumeViewsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS resume_views (
        id SERIAL PRIMARY KEY,
        recruiter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        candidate_id INTEGER,
        candidate_name VARCHAR(255),
        view_type VARCHAR(50) DEFAULT 'resume',
        viewed_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_resume_views_recruiter ON resume_views(recruiter_id);
      CREATE INDEX IF NOT EXISTS idx_resume_views_viewed_at ON resume_views(viewed_at);
    `);
    console.log("✓ resume_views table ready");
  } catch (err) {
    console.error("resume_views table setup error:", err.message);
  }
};

// Track which referrer's invite link a user signed up through, so a referrer
// can see how many other referrers joined via their link
const ensureInvitedByColumn = async () => {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS invited_by_referrer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by_referrer_id);
    `);
    // joined_at tracks signup time for this feature — added explicitly rather
    // than assuming a created_at/timestamp column already exists on users.
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();
    `);
    await pool.query(`
      UPDATE users SET joined_at = NOW() WHERE joined_at IS NULL;
    `);
    console.log("✓ users.invited_by_referrer_id / joined_at ready");
  } catch (err) {
    console.error("invited_by_referrer_id column setup error:", err.message);
  }
};

// Track incentive payment status per referral so admins can see an accurate
// incentive history (date, amount, paid/pending, paid-on, payment mode)
// instead of fabricated or blank values.
const ensureIncentiveTrackingColumns = async () => {
  try {
    await pool.query(`
      ALTER TABLE referrals
      ADD COLUMN IF NOT EXISTS incentive_status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS incentive_paid_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    `);
    console.log("✓ referrals.incentive_status / incentive_paid_at / payment_mode / created_at ready");
  } catch (err) {
    console.error("incentive tracking columns setup error:", err.message);
  }
};

// Ensure users.image and users.linkedin exist so profile-picture uploads and
// LinkedIn edits actually persist instead of silently failing (the edit-profile
// form has always sent a "linkedin" field, but the users table never had the
// column to store it in).
const ensureUserImageColumn = async () => {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS image VARCHAR(255),
      ADD COLUMN IF NOT EXISTS linkedin VARCHAR(500);
    `);
    console.log("✓ users.image / users.linkedin columns ready");
  } catch (err) {
    console.error("user profile columns setup error:", err.message);
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://portal.pickyourhire.com",
  "https://pyh-platform.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/recruiter", recruiterRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/jobs", jobRoutes);

const PORT = process.env.PORT || 5000;
Promise.all([ensureResumeViewsTable(), ensureInvitedByColumn(), ensureIncentiveTrackingColumns(), ensureUserImageColumn()]).then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
