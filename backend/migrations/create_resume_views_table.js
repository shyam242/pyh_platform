import pool from "../server/db.js";

const createResumeViewsTable = async () => {
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
    console.log("✓ resume_views table created");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};
createResumeViewsTable();
