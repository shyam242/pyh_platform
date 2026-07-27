import pool from "../config/db.js";

/**
 * Records an admin-facing notification. Non-throwing by design — a failure
 * here should never break the login/referral flow that triggered it.
 *
 * type: 'login' | 'referral'
 * userId: users.id this notification is about (for logins)
 * referralId: referrals.id this notification is about (for referrals)
 */
export const createNotification = async ({
  type,
  title,
  message = null,
  userId = null,
  referralId = null,
}) => {
  try {
    await pool.query(
      `INSERT INTO notifications (type, title, message, user_id, referral_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [type, title, message, userId, referralId]
    );
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
};
