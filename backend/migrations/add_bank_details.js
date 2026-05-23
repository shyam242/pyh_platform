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
    console.log("Running migration: adding bank details to users table...");

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS account_number VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50);
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
