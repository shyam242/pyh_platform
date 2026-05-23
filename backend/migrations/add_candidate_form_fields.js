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
    console.log("Running migration: adding candidate form fields to referrals table...");

    await pool.query(`
      ALTER TABLE referrals
      ADD COLUMN IF NOT EXISTS industry VARCHAR(255),
      ADD COLUMN IF NOT EXISTS department VARCHAR(255),
      ADD COLUMN IF NOT EXISTS skills TEXT,
      ADD COLUMN IF NOT EXISTS experience_type VARCHAR(50) DEFAULT 'experienced';
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