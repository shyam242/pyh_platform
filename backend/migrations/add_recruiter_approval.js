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
    console.log("Running migration: adding recruiter approval status...");

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_recruiter_approved BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS recruiter_approved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS company_website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
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
