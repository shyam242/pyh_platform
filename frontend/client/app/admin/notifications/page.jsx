"use client";
import { useState, useEffect } from "react";
import { Bell, ArrowLeft, UserPlus, LogIn, Search, Clock } from "lucide-react";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", BORDER = "#EBEBEB";

const timeAgo = (iso) => {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso);
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// Where clicking a notification should send the admin
const profileLinkFor = (n) => {
  if (n.type === "referral" && n.referral_id) {
    return `/admin/referred-candidates/${n.referral_id}`;
  }
  if (n.type === "login" && n.user_id) {
    if (n.user_role === "candidate") return `/admin/candidates/${n.user_id}`;
    if (n.user_role === "referrer") return `/admin/referrers/${n.user_id}`;
  }
  return "/admin";
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (n) => {
    const token = localStorage.getItem("token");
    // Mark as read (fire and forget) then navigate to the relevant profile
    fetch(`${API_BASE_URL}/api/admin/notifications/${n.id}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    window.location.href = profileLinkFor(n);
  };

  const filtered = notifications.filter((n) => {
    if (filterType !== "all" && n.type !== filterType) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      n.title?.toLowerCase().includes(q) ||
      n.message?.toLowerCase().includes(q) ||
      n.user_name?.toLowerCase().includes(q) ||
      n.referral_name?.toLowerCase().includes(q)
    );
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>
      <nav style={{ backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 48px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.04em" }}>PICK<span style={{ color: O }}>YOUR</span>HIRE</span>
        <a href="/admin" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#64748b", textDecoration: "none", fontWeight: 500 }}
          onMouseEnter={e => e.currentTarget.style.color = O} onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
          <ArrowLeft size={16} /> Back to Dashboard
        </a>
      </nav>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 48px 64px" }}>
        <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
              <Bell size={26} color={O} /> Notifications
            </h1>
            <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
              New referrals and sign-ins from the last 7 days. Click a row to open the profile.
            </p>
          </div>
          {unreadCount > 0 && (
            <span style={{ backgroundColor: O, color: "#fff", fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 999 }}>
              {unreadCount} unread
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <Search size={18} color="#94a3b8" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0f172a", fontFamily: "inherit", background: "transparent" }} />
          </div>
          <div style={{ display: "flex", gap: 6, backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: 6 }}>
            {[["all", "All"], ["referral", "Referrals"], ["login", "Sign-ins"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilterType(val)}
                style={{ padding: "8px 16px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  backgroundColor: filterType === val ? O_LITE : "transparent", color: filterType === val ? O : "#64748b", fontFamily: "inherit" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
              {notifications.length === 0 ? "No notifications in the last 7 days." : "No results match your search."}
            </div>
          ) : (
            filtered.map((n, i) => (
              <div key={n.id} onClick={() => handleRowClick(n)}
                style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", cursor: "pointer",
                  borderBottom: i === filtered.length - 1 ? "none" : `1px solid #F1F5F9`,
                  backgroundColor: n.is_read ? "#fff" : O_LITE,
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = n.is_read ? "#F8FAFC" : "#FFEBD6"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = n.is_read ? "#fff" : O_LITE}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: n.type === "referral" ? "#EFF6FF" : "#F0FDF4",
                }}>
                  {n.type === "referral"
                    ? <UserPlus size={18} color="#1d4ed8" />
                    : <LogIn size={18} color="#15803d" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: n.is_read ? 500 : 700, color: "#0f172a" }}>{n.title}</div>
                  {n.message && (
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.message}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>
                  <Clock size={12} /> {timeAgo(n.created_at)}
                </div>
                {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: O, flexShrink: 0 }} />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
