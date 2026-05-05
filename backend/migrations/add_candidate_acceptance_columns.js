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
    console.log("Running migration: adding candidate acceptance columns...");

    await pool.query(`
      ALTER TABLE referrals
      ADD COLUMN IF NOT EXISTS candidate_accepted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS candidate_accepted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS referral_status VARCHAR(50) DEFAULT 'pending_candidate_acceptance';
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
