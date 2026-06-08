"use client";
import { useState, useEffect } from "react";
import { Eye, Users, TrendingUp, Building2, ArrowLeft, Search, Calendar } from "lucide-react";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", BORDER = "#EBEBEB";

const timeAgo = iso => {
  if (!iso) return "—";
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return "Today"; if (d === 1) return "Yesterday"; return `${d}d ago`;
};

export default function ResumeViewsPage() {
  const [stats, setStats] = useState([]);
  const [detailed, setDetailed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeRow, setActiveRow] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE_URL}/api/recruiter/resume-view-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => { setStats(d.stats || []); setDetailed(d.detailed || []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = stats.filter(r =>
    r.recruiter_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.recruiter_email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalViews = stats.reduce((s, r) => s + parseInt(r.total_views || 0), 0);
  const totalUnique = stats.reduce((s, r) => s + parseInt(r.unique_candidates || 0), 0);
  const activeRecruiters = stats.filter(r => parseInt(r.total_views) > 0).length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>
      <nav style={{ backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 48px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.04em" }}>PICK<span style={{ color: O }}>YOUR</span>HIRE</span>
        <a href="/admin" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#64748b", textDecoration: "none", fontWeight: 500 }}
          onMouseEnter={e => e.currentTarget.style.color = O} onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
          <ArrowLeft size={16} /> Back to Dashboard
        </a>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 48px 64px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px" }}>Resume View Analytics</h1>
          <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>Track how many candidate resumes each recruiter has viewed</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 32 }}>
          {[
            { label: "Total Resume Views", value: totalViews, icon: Eye, color: O, bg: O_LITE },
            { label: "Unique Candidates Viewed", value: totalUnique, icon: Users, color: "#3B6D11", bg: "#EAF3DE" },
            { label: "Active Recruiters", value: activeRecruiters, icon: TrendingUp, color: "#1d4ed8", bg: "#EFF6FF" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "22px 24px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={24} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{loading ? "—" : value}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <Search size={18} color="#94a3b8" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by recruiter name, company or email..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0f172a", fontFamily: "inherit", background: "transparent" }} />
        </div>

        <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Eye size={17} color={O} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>Recruiter Resume Views</span>
            <span style={{ marginLeft: "auto", fontSize: 13, color: "#64748b" }}>{filtered.length} recruiters</span>
          </div>

          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
              {stats.length === 0 ? "No resume views yet. Views are recorded when recruiters download resumes." : "No results match your search."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC" }}>
                  {["Recruiter", "Company", "Total Views", "Unique Candidates", "Last Viewed", ""].map(h => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <>
                    <tr key={r.recruiter_id}
                      style={{ borderBottom: `1px solid #F8FAFC`, cursor: "pointer", backgroundColor: activeRow === r.recruiter_email ? O_LITE : i % 2 === 0 ? "#fff" : "#FAFAFA" }}
                      onClick={() => setActiveRow(activeRow === r.recruiter_email ? null : r.recruiter_email)}
                    >
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{r.recruiter_name}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.recruiter_email}</div>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Building2 size={14} color="#94a3b8" />
                          <span style={{ fontSize: 14, color: "#475569" }}>{r.company_name || "—"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontSize: 20, fontWeight: 700, color: parseInt(r.total_views) > 0 ? O : "#94a3b8" }}>{r.total_views || 0}</span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#3B6D11" }}>{r.unique_candidates || 0}</span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#64748b" }}>
                          <Calendar size={13} /> {timeAgo(r.last_viewed_at)}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", color: O, fontSize: 12, fontWeight: 600 }}>
                        {activeRow === r.recruiter_email ? "▲ Hide" : "▼ Details"}
                      </td>
                    </tr>
                    {activeRow === r.recruiter_email && (
                      <tr key={`d-${r.recruiter_id}`}>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <div style={{ backgroundColor: "#F8FAFC", borderTop: `1px solid ${BORDER}`, padding: "16px 24px" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>View history — {r.recruiter_name}</div>
                            {detailed.filter(d => d.recruiter_email === r.recruiter_email).length === 0 ? (
                              <p style={{ fontSize: 13, color: "#94a3b8" }}>No detailed records yet.</p>
                            ) : (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                                {detailed.filter(d => d.recruiter_email === r.recruiter_email).slice(0, 20).map(d => (
                                  <div key={d.id} style={{ backgroundColor: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: 600 }}>{d.candidate_name || "Unknown"}</div>
                                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{d.view_type}</div>
                                    </div>
                                    <span style={{ fontSize: 11, color: "#64748b" }}>{timeAgo(d.viewed_at)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
