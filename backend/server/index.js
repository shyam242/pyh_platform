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
ensureResumeViewsTable().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
