import pool from "../config/db.js";
import crypto from "crypto";

// ─── GENERATE MAGIC LINK (called by logged-in referrer) ──────────────────────
export const generateMagicLink = async (req, res) => {
  try {
    const referrerId = req.user.id;

    // Verify caller is a referrer
    const user = await pool.query("SELECT role, name FROM users WHERE id=$1", [referrerId]);
    if (!user.rows.length || user.rows[0].role !== "referrer") {
      return res.status(403).json({ error: "Only referrers can generate magic links" });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Store in DB — upsert so a referrer always has one active link
    await pool.query(
      `INSERT INTO referrer_magic_links (referrer_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (referrer_id) DO UPDATE SET token=$2, expires_at=$3, created_at=NOW()`,
      [referrerId, token, expiresAt]
    );

    const frontendUrl = process.env.FRONTEND_URL || "https://pyh-platform.vercel.app";
    const link = `${frontendUrl}/join/${token}`;

    res.json({ success: true, token, link, referrer_name: user.rows[0].name });
  } catch (err) {
    console.error("generateMagicLink error:", err);
    res.status(500).json({ error: err.message || "Failed to generate magic link" });
  }
};

// ─── VALIDATE MAGIC LINK (called when someone opens /join/:token) ─────────────
export const validateMagicLink = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT ml.token, ml.expires_at, ml.referrer_id,
              u.name as referrer_name, u.company as referrer_company
       FROM referrer_magic_links ml
       JOIN users u ON u.id = ml.referrer_id
       WHERE ml.token = $1`,
      [token]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Invalid or expired invite link" });
    }

    const link = result.rows[0];

    if (new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: "This invite link has expired" });
    }

    res.json({
      valid: true,
      referrer_name: link.referrer_name,
      referrer_company: link.referrer_company,
      referrer_id: link.referrer_id,
    });
  } catch (err) {
    console.error("validateMagicLink error:", err);
    res.status(500).json({ error: err.message || "Failed to validate link" });
  }
};
