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
    console.log("Running migration: adding candidate status column...");

    await pool.query(`
      ALTER TABLE bulk_candidates
      ADD COLUMN IF NOT EXISTS candidate_status VARCHAR(50) DEFAULT 'Contacted',
      ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS status_updated_by INTEGER REFERENCES users(id);

      -- Create ENUM type for valid statuses
      DO $$ BEGIN
        CREATE TYPE candidate_status_enum AS ENUM (
          'Contacted',
          'Interested',
          'Not Interested',
          'No Response',
          'Follow-up Required',
          'In Review',
          'Shortlisted',
          'Interview Scheduled',
          'Interview Cleared',
          'Offered',
          'Hired',
          'Rejected',
          'On Hold'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
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
