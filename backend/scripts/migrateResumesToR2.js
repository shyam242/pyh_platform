#!/usr/bin/env node
// scripts/migrateResumesToR2.js
//
// One-time migration: pushes every resume/CV file still sitting in
// backend/uploads/** up to Cloudflare R2, and rewrites the corresponding
// DB row to store the new "r2:<key>" reference instead of the old local
// path/filename.
//
// Safe to re-run: any row whose stored value already looks like an R2 key
// ("r2:...") or an external URL ("http(s)://...") is skipped. Rows whose
// local file no longer exists on disk are reported, not touched.
//
// Usage:
//   node scripts/migrateResumesToR2.js            # migrate + update DB
//   node scripts/migrateResumesToR2.js --dry-run   # report only, no writes

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../server/.env") });

// Dynamic imports, NOT static ones — static `import` statements are hoisted
// above this file's own top-level code, which would construct the pg Pool
// (in db.js) before dotenv.config() above has actually run.
const { default: pool } = await import("../server/config/db.js");
const { buildObjectKey, uploadBufferToR2, toR2Key, isR2Key, isExternalUrl } = await import(
  "../server/utils/r2Storage.js"
);

const UPLOADS_ROOT = path.join(__dirname, "../uploads");

const DRY_RUN = process.argv.includes("--dry-run");

const stats = { migrated: 0, skippedAlready: 0, missingFile: 0, errors: 0 };

function resolveLocalPath(storedValue, subdir) {
  let value = storedValue;
  const httpMatch = value.match(/^https?:\/\/[^/]+(\/.*)$/i);
  if (httpMatch) value = httpMatch[1];

  const basename = path.basename(value.split("?")[0]);
  return path.join(UPLOADS_ROOT, subdir, basename);
}

async function migrateColumn({ table, idColumn, column, subdir, r2Prefix, label }) {
  console.log(`\n── ${label} (${table}.${column}) ──`);
  const { rows } = await pool.query(
    `SELECT ${idColumn} as id, ${column} as value, name FROM ${table} WHERE ${column} IS NOT NULL AND ${column} != ''`
  );

  for (const row of rows) {
    const { id, value, name } = row;

    if (isR2Key(value)) {
      stats.skippedAlready++;
      continue;
    }
    if (isExternalUrl(value)) {
      if (!/\/uploads\//i.test(value)) {
        stats.skippedAlready++;
        continue;
      }
    }

    const localPath = resolveLocalPath(value, subdir);
    if (!fs.existsSync(localPath)) {
      console.warn(`  ⚠ [id ${id}] file not found on disk, leaving as-is: ${localPath}`);
      stats.missingFile++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(localPath);
      const originalName = path.basename(localPath);
      const objectKey = buildObjectKey(r2Prefix, id, originalName);

      if (DRY_RUN) {
        console.log(`  [dry-run] would upload [id ${id}] ${name || ""} → ${objectKey}`);
      } else {
        await uploadBufferToR2({ buffer, key: objectKey, originalName });
        await pool.query(`UPDATE ${table} SET ${column} = $1 WHERE ${idColumn} = $2`, [
          toR2Key(objectKey),
          id,
        ]);
        console.log(`  ✓ [id ${id}] ${name || ""} → ${objectKey}`);
      }
      stats.migrated++;
    } catch (err) {
      console.error(`  ✗ [id ${id}] failed:`, err.message);
      stats.errors++;
    }
  }
}

async function main() {
  console.log(`R2 resume migration ${DRY_RUN ? "(DRY RUN — no changes will be made)" : ""}`);

  await migrateColumn({
    table: "users",
    idColumn: "id",
    column: "resume_file_path",
    subdir: "resumes",
    r2Prefix: "resumes/candidates",
    label: "Candidate self-uploaded resumes",
  });

  await migrateColumn({
    table: "users",
    idColumn: "id",
    column: "resume",
    subdir: "resumes",
    r2Prefix: "resumes/verify",
    label: "Recruiter-verify resumes",
  });

  await migrateColumn({
    table: "referrals",
    idColumn: "id",
    column: "cv_file",
    subdir: "cv",
    r2Prefix: "cv/referrals",
    label: "Referral CVs",
  });

  await migrateColumn({
    table: "bulk_candidates",
    idColumn: "id",
    column: "resume_link",
    subdir: "resumes/bulk",
    r2Prefix: "resumes/bulk",
    label: "Admin bulk-uploaded resumes",
  });

  console.log("\n── Summary ──");
  console.log(stats);
  if (DRY_RUN) console.log("\nThis was a dry run — nothing was uploaded or changed. Re-run without --dry-run to apply.");

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
