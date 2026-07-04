"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Search, X, Mail, Phone, Building2, Award, TrendingUp, LogOut } from "lucide-react";
import { showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#EBEBEB";

const getInitials = name =>
  !name ? "R" : name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

export default function AllReferrersPage() {
  const router = useRouter();
  const [referrers, setReferrers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/signin"; return; }
    fetchReferrers(token);
  }, []);

  const fetchReferrers = async (token) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/referrers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReferrers(Array.isArray(data) ? data : (data.data || []));
    } catch {
      showError("Failed to load referrers");
    } finally {
      setLoading(false);
    }
  };

  const filtered = referrers.filter(r => {
    const matchSearch = !search || [r.name, r.email, r.company].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all"
      || (statusFilter === "active" && (r.referral_count > 0))
      || (statusFilter === "inactive" && !(r.referral_count > 0));
    return matchSearch && matchStatus;
  });

  const stats = {
    total: referrers.length,
    active: referrers.filter(r => r.referral_count > 0).length,
    inactive: referrers.filter(r => !r.referral_count || r.referral_count === 0).length,
    topReferrer: referrers.reduce((top, r) => (!top || (r.referral_count || 0) > (top.referral_count || 0)) ? r : top, null),
  };

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

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 48px 64px" }}>

        {/* Header + Back */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <button onClick={() => router.push("/admin")}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", fontSize: 13, color: "#475569", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = O; e.currentTarget.style.color = O; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#475569"; }}>
            <ArrowLeft size={15} /> Back to Dashboard
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 2px" }}>All Referrers</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{referrers.length} total referrers on the platform</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Referrers", value: stats.total, icon: Users, color: "#1d4ed8", bg: "#EFF6FF" },
            { label: "Active Referrers", value: stats.active, icon: TrendingUp, color: "#3B6D11", bg: "#EAF3DE" },
            { label: "Inactive", value: stats.inactive, icon: Users, color: "#64748b", bg: "#F1F5F9" },
            { label: "Top Referrer", value: stats.topReferrer?.name?.split(" ")[0] || "—", icon: Award, color: "#C2410C", bg: "#FFF7ED" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{loading ? "—" : value}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 10 }}>
            <Search size={15} color="#94a3b8" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, company..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", background: "transparent" }} />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={14} /></button>}
          </div>
          {["all", "active", "inactive"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: "10px 18px", border: `1.5px solid ${statusFilter === s ? O : BORDER}`, borderRadius: 10, backgroundColor: statusFilter === s ? O_LITE : "#fff", color: statusFilter === s ? O : "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
              {s === "all" ? "All" : s === "active" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={16} color={O} />
            <span style={{ fontSize: 15, fontWeight: 700 }}>Referrer Directory</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>{filtered.length} shown</span>
          </div>

          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>Loading referrers...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <Users size={40} color="#E5E7EB" style={{ display: "block", margin: "0 auto 12px" }} />
              <p style={{ color: "#94a3b8", margin: 0 }}>No referrers found</p>
            </div>
          ) : (
            <div>
              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr 1fr 1fr 1fr", gap: 12, padding: "10px 24px", backgroundColor: "#F8FAFC", borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <span>Name</span>
                <span>Email</span>
                <span>Company</span>
                <span>Referrals</span>
                <span>Incentive</span>
                <span>Status</span>
              </div>
              {filtered.map(r => (
                <div key={r.id}
                  onClick={() => router.push(`/admin/referrers/${r.id}`)}
                  style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr 1fr 1fr 1fr", gap: 12, padding: "14px 24px", borderBottom: `1px solid #F8FAFC`, alignItems: "center", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#FAFAFA"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                      {r.image_url
                        ? <img src={r.image_url} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : getInitials(r.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name || "—"}</div>
                      {r.phone && <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}><Phone size={9} />{r.phone}</div>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 5 }}>
                    <Mail size={12} color="#94a3b8" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 5 }}>
                    <Building2 size={12} color="#94a3b8" />
                    <span>{r.company || "—"}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: (r.referral_count || 0) > 0 ? O : "#94a3b8" }}>{r.referral_count || 0}</span>
                  </div>
                  <div>
                    {r.incentive_value ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#3B6D11" }}>₹{r.incentive_value}</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                    )}
                  </div>
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                      backgroundColor: (r.referral_count || 0) > 0 ? "#EAF3DE" : "#F1F5F9",
                      color: (r.referral_count || 0) > 0 ? "#3B6D11" : "#64748b",
                      border: `1px solid ${(r.referral_count || 0) > 0 ? "#97C459" : "#E5E7EB"}`,
                    }}>
                      {(r.referral_count || 0) > 0 ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
