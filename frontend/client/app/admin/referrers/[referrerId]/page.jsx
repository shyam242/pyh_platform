"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, Briefcase, Award, Users, LogOut,
  CheckCircle2, Clock, XCircle, Eye, IndianRupee, TrendingUp,
  Calendar, Send, Download, Trash2, X, Save, AlertCircle, ExternalLink, Link2
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#EBEBEB";

const statusLabel = s => ({
  pending: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  pending_candidate_acceptance: "Awaiting Candidate",
}[s] || s || "—");

const STATUS_COLORS = {
  pending: { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
  accepted: { bg: "#EAF3DE", color: "#3B6D11", border: "#97C459" },
  rejected: { bg: "#FEF2F2", color: "#dc2626", border: "#FECACA" },
  pending_candidate_acceptance: { bg: "#EFF6FF", color: "#1d4ed8", border: "#BFDBFE" },
};

const formatDate = iso => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

const timeAgo = iso => {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
};

const getInitials = name => !name ? "R" : name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

const money = v => `₹${Number(v || 0).toLocaleString("en-IN")}`;

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
    </div>
  );
}

function Field({ icon: Icon, label, value, hint, href }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0" }}>
      <Icon size={15} color={O} style={{ marginTop: 2, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
        {value ? (
          href ? (
            <a href={href} target="_blank" rel="noreferrer"
              style={{ fontSize: 14, fontWeight: 600, color: "#1d4ed8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
              {value} <ExternalLink size={12} />
            </a>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{value}</div>
          )
        ) : (
          <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>{hint || "Not provided"}</div>
        )}
      </div>
    </div>
  );
}

export default function AdminReferrerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const referrerId = params?.referrerId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailModal, setEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: "", message: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingIncentiveId, setUpdatingIncentiveId] = useState(null);
  const [rateModal, setRateModal] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    if (!referrerId) return;
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/signin"; return; }
    fetchDetails(token);
  }, [referrerId]);

  const fetchDetails = async token => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/referrers/${referrerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load referrer");
      }
      setData(await res.json());
    } catch (err) {
      showError(err.message || "Failed to load referrer");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailForm.subject.trim() || !emailForm.message.trim()) {
      showError("Please fill in subject and message");
      return;
    }
    setSendingEmail(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/admin/referrers/${referrerId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(emailForm),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed to send email");
      showSuccess("Email sent successfully!");
      setEmailModal(false);
      setEmailForm({ subject: "", message: "" });
    } catch (err) {
      showError(err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/admin/referrers/${referrerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed to delete referrer");
      showSuccess("Referrer removed successfully");
      router.push("/admin/referrers");
    } catch (err) {
      showError(err.message);
      setDeleting(false);
    }
  };

  const toggleIncentiveStatus = async (referralId, currentStatus) => {
    setUpdatingIncentiveId(referralId);
    try {
      const token = localStorage.getItem("token");
      const nextStatus = currentStatus === "paid" ? "pending" : "paid";
      const payment_mode = nextStatus === "paid" ? (prompt("Payment mode (e.g. Bank Transfer, UPI)?", "Bank Transfer") || "Bank Transfer") : null;
      const res = await fetch(`${API_BASE_URL}/api/admin/referrals/${referralId}/incentive-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus, payment_mode }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed to update incentive status");
      showSuccess(`Incentive marked as ${nextStatus}`);
      fetchDetails(token);
    } catch (err) {
      showError(err.message);
    } finally {
      setUpdatingIncentiveId(null);
    }
  };

  const openRateModal = () => {
    setNewRate(String(data?.referrer?.incentive_value ?? "500"));
    setRateModal(true);
  };

  const saveRate = async () => {
    const value = parseFloat(newRate);
    if (!value || value <= 0) { showError("Enter a valid incentive amount"); return; }
    setSavingRate(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/admin/incentives/${referrerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ incentive_value: value }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed to update incentive rate");
      showSuccess("Incentive rate updated");
      setRateModal(false);
      fetchDetails(token);
    } catch (err) {
      showError(err.message);
    } finally {
      setSavingRate(false);
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const { referrer, referralHistory, incentiveHistory } = data;
    const rows = [
      ["Referrer", referrer.name, referrer.email, referrer.phone || ""],
      [],
      ["Referral History"],
      ["Name", "Email", "Phone", "Company", "Status", "Referred On"],
      ...referralHistory.map(r => [r.name, r.email, r.phone || "", r.company || "", statusLabel(r.status), formatDate(r.created_at) || ""]),
      [],
      ["Incentive History"],
      ["Candidate", "Amount", "Status", "Accepted On", "Paid On", "Payment Mode"],
      ...incentiveHistory.map(r => [r.candidate_name, r.amount, r.status, formatDate(r.accepted_at) || "", formatDate(r.paid_at) || "", r.payment_mode || ""]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${referrer.name || "referrer"}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#94a3b8", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>Loading referrer details...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} color="#dc2626" style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ color: "#666", marginBottom: 16 }}>Referrer not found</p>
          <button onClick={() => router.push("/admin/referrers")} style={{ color: O, background: "none", border: "none", fontWeight: 600, cursor: "pointer" }}>Back to Referrers</button>
        </div>
      </div>
    );
  }

  const { referrer, stats, referralHistory, incentiveHistory, recentActivity, accountTimeline } = data;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>
      {/* NAV */}
      <nav style={{ backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 48px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200 }}>
        <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "0.04em" }}>
          PICK<span style={{ color: O }}>YOUR</span>HIRE
          <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b", marginLeft: 10, background: "#F1F5F9", padding: "3px 10px", borderRadius: 6 }}>Admin</span>
        </span>
        <button onClick={() => { localStorage.removeItem("token"); window.location.href = "/signin"; }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", fontSize: 14, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>
          <LogOut size={15} /> Sign out
        </button>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 48px 64px" }}>
        <button onClick={() => router.push("/admin/referrers")}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", fontSize: 13, color: "#475569", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, marginBottom: 20 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = O; e.currentTarget.style.color = O; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#475569"; }}>
          <ArrowLeft size={15} /> Back to Referrers
        </button>

        {/* Header card */}
        <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 18, padding: "26px 28px", marginBottom: 22, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, overflow: "hidden", flexShrink: 0 }}>
              {referrer.image_url
                ? <img src={referrer.image_url} alt={referrer.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : getInitials(referrer.name)}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{referrer.name}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{referrer.email}</div>
              {accountTimeline.joined_at && (
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={11} /> Member since {formatDate(accountTimeline.joined_at)}
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Incentive Rate</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: O }}>{money(referrer.incentive_value)}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button onClick={openRateModal}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", backgroundColor: O_LITE, color: O, border: `1px solid ${O_MID}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Edit Rate
              </button>
              <button onClick={() => setEmailModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", backgroundColor: "#EFF6FF", color: "#1d4ed8", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Send size={12} /> Email
              </button>
              <button onClick={exportCSV}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", backgroundColor: "#F1F5F9", color: "#475569", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Download size={12} /> Export
              </button>
              <button onClick={() => setDeleteModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", backgroundColor: "#FEF2F2", color: "#dc2626", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 22, alignItems: "start" }}>
          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* Personal Information */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Personal Information</div>
              <div style={{ borderTop: `1px solid ${BORDER}` }}>
                <Field icon={Phone} label="Phone" value={referrer.phone} />
                <Field icon={Briefcase} label="Company" value={referrer.company} />
                <Field icon={Award} label="Experience" value={referrer.experience ? `${referrer.experience} years` : null} />
                <Field icon={Link2} label="LinkedIn"
                  value={referrer.linkedin ? referrer.linkedin.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "") : null}
                  href={referrer.linkedin ? (referrer.linkedin.startsWith("http") ? referrer.linkedin : `https://${referrer.linkedin}`) : null}
                  hint="Referrer hasn't added a LinkedIn profile yet" />
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
                Missing details can only be added by the referrer from their own "My Profile" page.
              </div>
            </div>

            {/* Account Timeline */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Account Timeline</div>
              {[
                { label: "Joined platform", value: accountTimeline.joined_at },
                { label: "First referral", value: accountTimeline.first_referral_at },
                { label: "Most recent referral", value: accountTimeline.last_referral_at },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid #F8FAFC`, fontSize: 12 }}>
                  <span style={{ color: "#64748b" }}>{label}</span>
                  <span style={{ fontWeight: 600, color: value ? "#0f172a" : "#94a3b8" }}>{formatDate(value) || "—"}</span>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Recent Activity</div>
              {recentActivity.length === 0 ? (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>No activity yet</div>
              ) : recentActivity.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i === recentActivity.length - 1 ? "none" : `1px solid #F8FAFC` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: a.type === "paid" ? "#3B6D11" : a.type === "accepted" ? "#1d4ed8" : O, marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{a.message}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{timeAgo(a.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* Referral Overview */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Referral Overview</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <StatCard label="Total Referrals" value={stats.totalReferrals} icon={Users} color="#1d4ed8" bg="#EFF6FF" />
                <StatCard label="Accepted" value={stats.accepted} icon={CheckCircle2} color="#3B6D11" bg="#EAF3DE" />
                <StatCard label="Pending Review" value={stats.pending} icon={Clock} color="#C2410C" bg="#FFF7ED" />
                <StatCard label="Rejected" value={stats.rejected} icon={XCircle} color="#dc2626" bg="#FEF2F2" />
                <StatCard label="Total Incentive Earned" value={money(stats.totalIncentiveEarned)} icon={TrendingUp} color={O} bg={O_LITE} />
                <StatCard label="Total Incentive Paid" value={money(stats.totalIncentivePaid)} icon={IndianRupee} color="#3B6D11" bg="#EAF3DE" />
              </div>
            </div>

            {/* Referral History */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, fontSize: 14, fontWeight: 700 }}>Referral History</div>
              {referralHistory.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No referrals yet</div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.4fr 1fr 1fr", gap: 10, padding: "8px 20px", backgroundColor: "#F8FAFC", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                    <span>Candidate</span><span>Company</span><span>Referred On</span><span>Status</span>
                  </div>
                  {referralHistory.map(r => {
                    const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
                    return (
                      <div key={r.id} onClick={() => router.push(`/referral/${r.id}`)}
                        style={{ display: "grid", gridTemplateColumns: "1.8fr 1.4fr 1fr 1fr", gap: 10, padding: "12px 20px", borderTop: `1px solid #F8FAFC`, alignItems: "center", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#FAFAFA"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.email}</div>
                        </div>
                        <span style={{ fontSize: 13, color: "#475569" }}>{r.company || "—"}</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>{formatDate(r.created_at) || "—"}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, width: "fit-content" }}>
                          {statusLabel(r.status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Incentive History */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, fontSize: 14, fontWeight: 700 }}>Incentive History</div>
              {incentiveHistory.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No accepted referrals yet — incentives appear here once a referral is accepted</div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", gap: 10, padding: "8px 20px", backgroundColor: "#F8FAFC", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                    <span>Referral</span><span>Amount</span><span>Status</span><span>Paid On</span><span>Action</span>
                  </div>
                  {incentiveHistory.map(r => (
                    <div key={r.referral_id}
                      style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", gap: 10, padding: "12px 20px", borderTop: `1px solid #F8FAFC`, alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.candidate_name}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: O }}>{money(r.amount)}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, backgroundColor: r.status === "paid" ? "#EAF3DE" : "#FFF7ED", color: r.status === "paid" ? "#3B6D11" : "#C2410C", border: `1px solid ${r.status === "paid" ? "#97C459" : "#FED7AA"}`, width: "fit-content" }}>
                        {r.status === "paid" ? "Paid" : "Pending"}
                      </span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{formatDate(r.paid_at) || "—"}</span>
                      <button onClick={() => toggleIncentiveStatus(r.referral_id, r.status)} disabled={updatingIncentiveId === r.referral_id}
                        style={{ fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 7, border: `1px solid ${BORDER}`, backgroundColor: "#fff", color: O, cursor: updatingIncentiveId === r.referral_id ? "not-allowed" : "pointer", fontFamily: "inherit", width: "fit-content" }}>
                        {updatingIncentiveId === r.referral_id ? "..." : r.status === "paid" ? "Mark Pending" : "Mark Paid"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SEND EMAIL MODAL */}
      {emailModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: 28, width: 480, maxWidth: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Email {referrer.name}</div>
              <button onClick={() => setEmailModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
            </div>
            <input value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
              placeholder="Subject" style={{ width: "100%", padding: "10px 14px", fontSize: 14, border: `1.5px solid ${BORDER}`, borderRadius: 9, marginBottom: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            <textarea value={emailForm.message} onChange={e => setEmailForm({ ...emailForm, message: e.target.value })}
              placeholder="Message" rows={5} style={{ width: "100%", padding: "10px 14px", fontSize: 14, border: `1.5px solid ${BORDER}`, borderRadius: 9, marginBottom: 16, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEmailModal(false)} style={{ padding: "10px 18px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", color: "#475569", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleSendEmail} disabled={sendingEmail}
                style={{ flex: 1, padding: "10px 18px", backgroundColor: sendingEmail ? O_LITE : O, color: sendingEmail ? O : "#fff", border: "none", borderRadius: 9, fontWeight: 700, cursor: sendingEmail ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {sendingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: 28, width: 420, maxWidth: "100%", textAlign: "center" }}>
            <AlertCircle size={32} color="#dc2626" style={{ margin: "0 auto 12px", display: "block" }} />
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete {referrer.name}?</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>This will permanently remove the referrer and all their referral records. This cannot be undone.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteModal(false)} style={{ flex: 1, padding: "10px 18px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", color: "#475569", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: "10px 18px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RATE MODAL */}
      {rateModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: 28, width: 380, maxWidth: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Update Incentive Rate</div>
              <button onClick={() => setRateModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
            </div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Amount (₹) per accepted referral</label>
            <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", fontSize: 14, border: `1.5px solid ${BORDER}`, borderRadius: 9, marginBottom: 16, fontFamily: "inherit", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setRateModal(false)} style={{ padding: "10px 18px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", color: "#475569", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={saveRate} disabled={savingRate}
                style={{ flex: 1, padding: "10px 18px", backgroundColor: savingRate ? O_LITE : O, color: savingRate ? O : "#fff", border: "none", borderRadius: 9, fontWeight: 700, cursor: savingRate ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Save size={14} /> {savingRate ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
