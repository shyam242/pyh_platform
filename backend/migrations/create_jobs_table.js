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
    console.log("Running migration: creating jobs table...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        job_title VARCHAR(255) NOT NULL,
        department VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        job_type VARCHAR(50) NOT NULL,
        salary_range VARCHAR(255),
        experience_required VARCHAR(100) NOT NULL,
        job_description TEXT NOT NULL,
        responsibilities TEXT NOT NULL,
        qualifications TEXT NOT NULL,
        benefits TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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
