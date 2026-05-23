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
    console.log("Running migration: creating bulk_candidates table...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bulk_candidates (
        id SERIAL PRIMARY KEY,
        role VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(20),
        email VARCHAR(255) UNIQUE,
        experience VARCHAR(50),
        skills TEXT,
        current_ctc VARCHAR(50),
        expected_ctc VARCHAR(50),
        current_location VARCHAR(255),
        preferred_location VARCHAR(255),
        notice_period VARCHAR(100),
        offer_in_hand VARCHAR(50),
        reason_for_change VARCHAR(255),
        current_company_name VARCHAR(255),
        highest_qualification VARCHAR(255),
        address TEXT,
        technical_skills TEXT,
        soft_skills TEXT,
        linkedin VARCHAR(500),
        resume_link VARCHAR(500),
        other_1 VARCHAR(255),
        other_2 VARCHAR(255),
        uploaded_by INTEGER REFERENCES users(id),
        upload_date TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
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
