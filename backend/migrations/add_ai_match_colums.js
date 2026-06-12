import pool from "../server/config/db.js";

const run = async () => {
  try {
    await pool.query(`
      ALTER TABLE referrals ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
      ALTER TABLE referrals ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP;
      ALTER TABLE referrals ADD COLUMN IF NOT EXISTS jd_match_score INTEGER;
      ALTER TABLE referrals ADD COLUMN IF NOT EXISTS jd_match_data JSONB;
      ALTER TABLE referrals ADD COLUMN IF NOT EXISTS jd_match_at TIMESTAMP;

      ALTER TABLE users ADD COLUMN IF NOT EXISTS parsed_projects JSONB;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS projects_parsed_at TIMESTAMP;
    `);
    console.log("✓ AI match columns added");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};
run();
