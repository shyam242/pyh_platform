// server/routes/migrate.js
//
// TEMPORARY route — lets you trigger the resumes->R2 migration over HTTP
// instead of needing Render Shell access (which is gated behind a paid
// instance type). Protect it with a one-off secret, hit it once, then
// DELETE this file and remove the app.use() line in index.js.
//
// Usage once deployed:
//   curl -X POST https://<your-backend>.onrender.com/api/migrate/resumes-to-r2 \
//        -H "x-migrate-secret: <MIGRATE_SECRET value you set in Render env vars>"
//
//   Add ?dryRun=true to preview first:
//   curl -X POST "https://<your-backend>.onrender.com/api/migrate/resumes-to-r2?dryRun=true" \
//        -H "x-migrate-secret: <MIGRATE_SECRET>"

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/db.js";
import {
  buildObjectKey,
  uploadBufferToR2,
  toR2Key,
  isR2Key,
  isExternalUrl,
} from "../utils/r2Storage.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.join(__dirname, "../../uploads");

function resolveLocalPath(storedValue, subdir) {
  let value = storedValue;
  const httpMatch = value.match(/^https?:\/\/[^/]+(\/.*)$/i);
  if (httpMatch) value = httpMatch[1];
  const basename = path.basename(value.split("?")[0]);
  return path.join(UPLOADS_ROOT, subdir, basename);
}

async function migrateColumn({ table, idColumn, column, subdir, r2Prefix, label, dryRun, log, stats }) {
  log(`\n── ${label} (${table}.${column}) ──`);
  const { rows } = await pool.query(
    `SELECT ${idColumn} as id, ${column} as value, name FROM ${table} WHERE ${column} IS NOT NULL AND ${column} != ''`
  );

  for (const row of rows) {
    const { id, value, name } = row;

    if (isR2Key(value)) { stats.skippedAlready++; continue; }
    if (isExternalUrl(value) && !/\/uploads\//i.test(value)) { stats.skippedAlready++; continue; }

    const localPath = resolveLocalPath(value, subdir);
    if (!fs.existsSync(localPath)) {
      log(`  WARN [id ${id}] file not found on disk: ${localPath}`);
      stats.missingFile++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(localPath);
      const originalName = path.basename(localPath);
      const objectKey = buildObjectKey(r2Prefix, id, originalName);

      if (dryRun) {
        log(`  [dry-run] would upload [id ${id}] ${name || ""} -> ${objectKey}`);
      } else {
        await uploadBufferToR2({ buffer, key: objectKey, originalName });
        await pool.query(`UPDATE ${table} SET ${column} = $1 WHERE ${idColumn} = $2`, [
          toR2Key(objectKey),
          id,
        ]);
        log(`  OK [id ${id}] ${name || ""} -> ${objectKey}`);
      }
      stats.migrated++;
    } catch (err) {
      log(`  ERROR [id ${id}] failed: ${err.message}`);
      stats.errors++;
    }
  }
}

router.post("/resumes-to-r2", async (req, res) => {
  // --- simple shared-secret protection ---
  const secret = req.headers["x-migrate-secret"];
  if (!process.env.MIGRATE_SECRET || secret !== process.env.MIGRATE_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const dryRun = req.query.dryRun === "true";
  const lines = [];
  const log = (msg) => { lines.push(msg); console.log(msg); };
  const stats = { migrated: 0, skippedAlready: 0, missingFile: 0, errors: 0 };

  try {
    log(`R2 resume migration ${dryRun ? "(DRY RUN)" : ""}`);

    await migrateColumn({ table: "users", idColumn: "id", column: "resume_file_path", subdir: "resumes", r2Prefix: "resumes/candidates", label: "Candidate self-uploaded resumes", dryRun, log, stats });
    await migrateColumn({ table: "users", idColumn: "id", column: "resume", subdir: "resumes", r2Prefix: "resumes/verify", label: "Recruiter-verify resumes", dryRun, log, stats });
    await migrateColumn({ table: "referrals", idColumn: "id", column: "cv_file", subdir: "cv", r2Prefix: "cv/referrals", label: "Referral CVs", dryRun, log, stats });
    await migrateColumn({ table: "bulk_candidates", idColumn: "id", column: "resume_link", subdir: "resumes/bulk", r2Prefix: "resumes/bulk", label: "Admin bulk-uploaded resumes", dryRun, log, stats });

    log("\n── Summary ──");
    log(JSON.stringify(stats));

    res.json({ dryRun, stats, log: lines });
  } catch (err) {
    console.error("Migration failed:", err);
    res.status(500).json({ error: err.message, log: lines });
  }
});

export default router;
