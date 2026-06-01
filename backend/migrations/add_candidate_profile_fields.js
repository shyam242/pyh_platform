import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const pool = new Pool({
  user: "postgres",
  host: "127.0.0.1",
  database: "recruiter_platform",
  password: "Shyam2402@",
  port: 5432,
});

const runMigration = async () => {
  try {
    console.log("Running migration: adding candidate profile fields to users table...");

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS job_role VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact VARCHAR(20),
      ADD COLUMN IF NOT EXISTS skills TEXT,
      ADD COLUMN IF NOT EXISTS cctc DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS ectc DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS current_location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS preferred_location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS notice_period VARCHAR(50),
      ADD COLUMN IF NOT EXISTS offer_in_hand VARCHAR(50),
      ADD COLUMN IF NOT EXISTS reason_for_change TEXT,
      ADD COLUMN IF NOT EXISTS current_company_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS highest_qualification VARCHAR(255),
      ADD COLUMN IF NOT EXISTS address_aadhaar TEXT,
      ADD COLUMN IF NOT EXISTS technical_skills TEXT,
      ADD COLUMN IF NOT EXISTS soft_skills TEXT,
      ADD COLUMN IF NOT EXISTS linkedin_profile VARCHAR(500),
      ADD COLUMN IF NOT EXISTS resume_file_path VARCHAR(500),
      ADD COLUMN IF NOT EXISTS candidate_profile_completed BOOLEAN DEFAULT false;
    `);

    console.log("✓ Migration completed successfully!");
    await pool.end();
  } catch (error) {
    console.error("✗ Migration failed:", error.message);
    await pool.end();
    process.exit(1);
  }
};

runMigration();
