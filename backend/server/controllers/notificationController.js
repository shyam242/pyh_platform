import pool from "../config/db.js";

// Notifications older than 7 days are archived (deleted) automatically —
// every read of the notifications list first sweeps out anything past that
// window so the admin dashboard only ever shows the trailing 7 days.
const archiveOldNotifications = async () => {
  await pool.query(
    `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '7 days'`
  );
};

// GET ALL NOTIFICATIONS (admin dashboard "Notifications" section)
export const getNotifications = async (req, res) => {
  try {
    await archiveOldNotifications();

    const result = await pool.query(`
      SELECT
        n.id, n.type, n.title, n.message, n.is_read, n.created_at,
        n.user_id, n.referral_id,
        u.name AS user_name, u.email AS user_email, u.role AS user_role,
        r.name AS referral_name, r.company AS referral_company
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      LEFT JOIN referrals r ON n.referral_id = r.id
      ORDER BY n.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

// GET UNREAD COUNT (for a badge, etc.)
export const getUnreadNotificationCount = async (req, res) => {
  try {
    await archiveOldNotifications();

    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE is_read = false`
    );

    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch unread notification count" });
  }
};

// MARK A NOTIFICATION AS READ (called when admin clicks into a profile)
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Marked as read", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update notification" });
  }
};
