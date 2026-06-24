"use client";
import { useState, useEffect } from "react";
import { showSuccess, showError } from "@/utils/toast";
import {
  Upload, ArrowRight, Phone, Briefcase, Award, Users,
  TrendingUp, CheckCircle, Clock, Eye, Mail,
  BarChart2, Plus, ChevronRight, LogOut, ExternalLink, Link2, Copy, Check
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#EBEBEB";

const STATUS_COLORS = {
  pending: { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
  accepted: { bg: "#EAF3DE", color: "#3B6D11", border: "#97C459" },
  rejected: { bg: "#FEF2F2", color: "#dc2626", border: "#FECACA" },
  pending_candidate_acceptance: { bg: "#EFF6FF", color: "#1d4ed8", border: "#BFDBFE" },
};

const statusLabel = s => ({
  pending: "Under Review", accepted: "Accepted", rejected: "Rejected",
  pending_candidate_acceptance: "Awaiting Candidate",
}[s] || s);

const timeAgo = iso => {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return "Today"; if (d === 1) return "Yesterday"; return `${d}d ago`;
};

const InputField = ({ label, name, value, onChange, placeholder, type = "text", required }) => (
  <div>
    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
      {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
    </label>
    <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #E5E7EB", borderRadius: 9, outline: "none", backgroundColor: "#FAFAFA", color: "#0f172a", fontFamily: "inherit", boxSizing: "border-box" }}
      onFocus={e => e.target.style.borderColor = O} onBlur={e => e.target.style.borderColor = "#E5E7EB"}
    />
  </div>
);

export default function ReferrerDashboard() {
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [tab, setTab] = useState("dashboard"); // dashboard | refer | referrals | invite
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", experience: "", company: "", industry: "", department: "", linkedin: "", skills: "", cv: null });

  // Magic link state
  const [magicLink, setMagicLink] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [invitedReferrers, setInvitedReferrers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/signin"; return; }
    Promise.all([fetchUser(token), fetchReferrals(token), fetchInvitedReferrers(token)]).finally(() => setLoading(false));
  }, []);

  const fetchUser = async token => {
    const r = await fetch(`${API_BASE_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setUser(await r.json());
  };

  const fetchReferrals = async token => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/referral/my`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setReferrals(Array.isArray(d) ? d : d.referrals || []); }
    } catch {}
  };

  const fetchInvitedReferrers = async token => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/auth/magic-link/invitees/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setInvitedReferrers(d.invitees || []); }
    } catch {}
  };

  const generateLink = async () => {
    setGeneratingLink(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/auth/magic-link/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate link");
      setMagicLink(data.link);
    } catch (err) { showError(err.message); }
    finally { setGeneratingLink(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(magicLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const submit = async () => {
    if (!form.name || !form.email || !form.phone || !form.experience || !form.company || !form.skills || !form.cv) {
      showError("Please fill in all required fields"); return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      const res = await fetch(`${API_BASE_URL}/api/referral/create`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit referral");
      showSuccess("Referral submitted successfully!");
      setForm({ name: "", email: "", phone: "", experience: "", company: "", industry: "", department: "", linkedin: "", skills: "", cv: null });
      setTab("dashboard");
      fetchReferrals(token);
    } catch (err) { showError(err.message); }
    finally { setSubmitting(false); }
  };

  const stats = [
    { label: "Total Referred", value: referrals.length, icon: Users, color: O, bg: O_LITE },
    { label: "Accepted", value: referrals.filter(r => r.status === "accepted" || r.referral_status === "accepted").length, icon: CheckCircle, color: "#3B6D11", bg: "#EAF3DE" },
    { label: "Under Review", value: referrals.filter(r => r.status === "pending").length, icon: Clock, color: "#1d4ed8", bg: "#EFF6FF" },
    { label: "Awaiting Candidate", value: referrals.filter(r => r.referral_status === "pending_candidate_acceptance").length, icon: Eye, color: "#7c3aed", bg: "#F5F3FF" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>

      {/* NAV */}
      <nav style={{ backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 48px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200 }}>
        <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "0.04em" }}>PICK<span style={{ color: O }}>YOUR</span>HIRE</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", backgroundColor: O_LITE, borderRadius: 999, border: `1px solid ${O_MID}` }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                {(user.name || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{user.name}</span>
            </div>
          )}
          <button onClick={() => { localStorage.removeItem("token"); window.location.href = "/signin"; }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", fontSize: 14, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 48px 64px", display: "grid", gridTemplateColumns: "240px 1fr", gap: 28 }}>

        {/* SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Profile card */}
          {user && (
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "24px 20px", textAlign: "center", marginBottom: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, margin: "0 auto 12px" }}>
                {(user.name || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Referrer</div>
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
                {[
                  { icon: <Mail size={13} />, label: user.email },
                  user.phone && { icon: <Phone size={13} />, label: user.phone },
                  user.company && { icon: <Briefcase size={13} />, label: user.company },
                  user.experience && { icon: <Award size={13} />, label: `${user.experience} yrs exp` },
                ].filter(Boolean).map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569" }}>
                    <span style={{ color: O, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nav links */}
          {[
            { id: "dashboard", label: "Dashboard", icon: BarChart2 },
            { id: "refer", label: "Refer a Candidate", icon: Plus },
            { id: "referrals", label: "My Referrals", icon: Users },
            { id: "invite", label: "Share Your Link", icon: Link2 },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 10, border: "none", backgroundColor: tab === id ? O_LITE : "transparent", color: tab === id ? O : "#475569", fontSize: 14, fontWeight: tab === id ? 700 : 500, cursor: "pointer", fontFamily: "inherit", borderLeft: `3px solid ${tab === id ? O : "transparent"}` }}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div>
          {/* DASHBOARD TAB */}
          {tab === "dashboard" && (
            <div>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>Welcome back, {user?.name?.split(" ")[0] || "Referrer"} 👋</h1>
                <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>Here's an overview of your referral activity</p>
              </div>

              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                {stats.map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                      <Icon size={20} color={color} />
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", lineHeight: 1, marginBottom: 6 }}>{loading ? "—" : value}</div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Invite CTA banner */}
              <div style={{ backgroundColor: O_LITE, border: `1.5px solid ${O_MID}`, borderRadius: 14, padding: "18px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: O, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Link2 size={18} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>Grow your referrer network</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>Share your invite link — anyone who joins via your link becomes a referrer instantly, no role selection needed.</div>
                  </div>
                </div>
                <button onClick={() => setTab("invite")}
                  style={{ padding: "9px 20px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                  Share Link <ChevronRight size={14} />
                </button>
              </div>

              {/* Recent referrals */}
              <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={17} color={O} />
                    <span style={{ fontSize: 16, fontWeight: 700 }}>Recent Referrals</span>
                  </div>
                  <button onClick={() => setTab("referrals")} style={{ fontSize: 13, color: O, background: "none", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    View all <ChevronRight size={14} />
                  </button>
                </div>
                {loading ? (
                  <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>
                ) : referrals.length === 0 ? (
                  <div style={{ padding: "48px", textAlign: "center" }}>
                    <Users size={40} color="#E5E7EB" style={{ margin: "0 auto 12px", display: "block" }} />
                    <p style={{ color: "#94a3b8", fontSize: 15, margin: "0 0 16px" }}>No referrals yet. Start by referring a candidate!</p>
                    <button onClick={() => setTab("refer")} style={{ padding: "10px 24px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      Refer a Candidate
                    </button>
                  </div>
                ) : referrals.slice(0, 5).map(r => {
                  const sc = STATUS_COLORS[r.referral_status || r.status] || STATUS_COLORS.pending;
                  return (
                    <div key={r.id} style={{ padding: "16px 24px", borderBottom: `1px solid #F8FAFC`, display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        {(r.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.company} · {r.experience} yrs</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 999, backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>
                        {statusLabel(r.referral_status || r.status)}
                      </span>
                      <span style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>{timeAgo(r.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REFERRALS TAB */}
          {tab === "referrals" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>My Referrals</h2>
                <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>All candidates you have referred</p>
              </div>
              {loading ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8", backgroundColor: "#fff", borderRadius: 16, border: `1.5px solid ${BORDER}` }}>Loading...</div>
              ) : referrals.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", backgroundColor: "#fff", borderRadius: 16, border: `1.5px solid ${BORDER}` }}>
                  <p style={{ color: "#94a3b8", fontSize: 15, margin: "0 0 16px" }}>No referrals yet.</p>
                  <button onClick={() => setTab("refer")} style={{ padding: "10px 24px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Refer a Candidate</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {referrals.map(r => {
                    const sc = STATUS_COLORS[r.referral_status || r.status] || STATUS_COLORS.pending;
                    return (
                      <div key={r.id} style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderLeft: `4px solid ${O}`, borderRadius: 14, padding: "20px 24px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>
                              {(r.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 700 }}>{r.name}</div>
                              <div style={{ fontSize: 13, color: "#64748b" }}>{r.email}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999, backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                            {statusLabel(r.referral_status || r.status)}
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                          {[
                            { icon: <Phone size={13} />, label: "Phone", value: r.phone },
                            { icon: <Briefcase size={13} />, label: "Company", value: r.company },
                            { icon: <Award size={13} />, label: "Experience", value: r.experience ? `${r.experience} years` : null },
                          ].filter(f => f.value).map((f, i) => (
                            <div key={i} style={{ backgroundColor: "#F8FAFC", borderRadius: 9, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: O }}>{f.icon}</span>
                              <div>
                                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{f.label}</div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.value}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {r.linkedin && (
                          <a href={r.linkedin} target="_blank" rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 13, color: "#1d4ed8", textDecoration: "none", fontWeight: 500 }}>
                            <ExternalLink size={14} /> View LinkedIn
                          </a>
                        )}
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10 }}>Referred {timeAgo(r.created_at)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* REFER TAB */}
          {tab === "refer" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Refer a Candidate</h2>
                <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>Help us find the best talent for great opportunities</p>
              </div>

              <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 18, padding: "32px 36px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                  <InputField label="Candidate Name" name="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" required />
                  <InputField label="Email Address" name="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" type="email" required />
                  <InputField label="Phone" name="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" required />
                  <InputField label="Years of Experience" name="experience" value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} placeholder="e.g. 5" type="number" required />
                  <InputField label="Current Company" name="company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company name" required />
                  <InputField label="Skills (comma separated)" name="skills" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="React, Node.js, Python" required />
                  <InputField label="Industry" name="industry" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Technology" />
                  <InputField label="Department" name="department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Engineering" />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <InputField label="LinkedIn Profile URL" name="linkedin" value={form.linkedin} onChange={e => setForm({ ...form, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </div>

                {/* CV Upload */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Upload CV/Resume <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div
                    style={{ border: `2px dashed ${form.cv ? O : "#E5E7EB"}`, borderRadius: 12, padding: "28px", textAlign: "center", cursor: "pointer", backgroundColor: form.cv ? O_LITE : "#FAFAFA", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = O; e.currentTarget.style.backgroundColor = O_LITE; }}
                    onMouseLeave={e => { if (!form.cv) { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.backgroundColor = "#FAFAFA"; } }}
                    onClick={() => document.getElementById("cvInput").click()}
                  >
                    <Upload style={{ width: 28, height: 28, margin: "0 auto 8px", color: form.cv ? O : "#94a3b8" }} />
                    {form.cv ? (
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: O, margin: "0 0 4px" }}>✓ {form.cv.name}</p>
                        <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Click to change file</p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 4px" }}>Click to upload CV</p>
                        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>PDF or DOC (max 5MB)</p>
                      </div>
                    )}
                  </div>
                  <input id="cvInput" type="file" accept=".pdf,.doc,.docx" onChange={e => setForm({ ...form, cv: e.target.files[0] })} style={{ display: "none" }} />
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => setTab("dashboard")} style={{ padding: "12px 24px", border: `1.5px solid ${BORDER}`, borderRadius: 10, backgroundColor: "#fff", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  <button onClick={submit} disabled={submitting}
                    style={{ flex: 1, padding: "12px 24px", backgroundColor: submitting ? O_LITE : O, color: submitting ? O : "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: submitting ? "none" : "0 4px 14px rgba(232,119,34,0.28)" }}>
                    {submitting ? "Submitting..." : <><span>Submit Referral</span><ArrowRight size={16} /></>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* INVITE TAB */}
          {tab === "invite" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Share Your Referrer Link</h2>
                <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>Invite others to join as referrers. They'll skip role selection and join directly as a referrer.</p>
              </div>

              {/* Joined-via-my-link count */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "20px 24px", marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: O_LITE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={22} color={O} />
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{invitedReferrers.length}</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                    {invitedReferrers.length === 1 ? "Referrer joined" : "Referrers joined"} through your invite link
                  </div>
                </div>
              </div>

              {invitedReferrers.length > 0 && (
                <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "8px 0", marginBottom: 24, overflow: "hidden" }}>
                  {invitedReferrers.map((r, i) => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: i === 0 ? "none" : `1px solid ${BORDER}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {(r.name || "R").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{r.name}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.email}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{timeAgo(r.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 18, padding: "32px 36px" }}>
                {/* How it works */}
                <div style={{ backgroundColor: "#F8FAFC", borderRadius: 12, padding: "20px 22px", marginBottom: 28 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>How it works</div>
                  {[
                    { n: "1", t: "Generate your unique invite link below" },
                    { n: "2", t: "Share it via WhatsApp, email, or copy the link" },
                    { n: "3", t: "When someone clicks it, they land on a branded invite page" },
                    { n: "4", t: "They verify their email via OTP and join directly as a referrer — no role selection needed" },
                  ].map(({ n, t }) => (
                    <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{n}</div>
                      <span style={{ fontSize: 14, color: "#475569", paddingTop: 3 }}>{t}</span>
                    </div>
                  ))}
                </div>

                {!magicLink ? (
                  <button onClick={generateLink} disabled={generatingLink}
                    style={{ width: "100%", padding: "13px", backgroundColor: generatingLink ? O_LITE : O, color: generatingLink ? O : "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: generatingLink ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: generatingLink ? "none" : "0 4px 14px rgba(232,119,34,0.28)" }}>
                    <Link2 size={16} /> {generatingLink ? "Generating..." : "Generate My Invite Link"}
                  </button>
                ) : (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Your invite link</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", backgroundColor: "#F8FAFC", border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                      <div style={{ flex: 1, fontSize: 13, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{magicLink}</div>
                      <button onClick={copyLink}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", backgroundColor: linkCopied ? "#EAF3DE" : O_LITE, color: linkCopied ? "#3B6D11" : O, border: `1px solid ${linkCopied ? "#97C459" : O_MID}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                        {linkCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>

                    {/* Share buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <a href={`https://wa.me/?text=${encodeURIComponent("Join me on PickYourHire as a referrer! " + magicLink)}`} target="_blank" rel="noreferrer"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", backgroundColor: "#EAF3DE", color: "#3B6D11", border: "1px solid #97C459", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                        📱 Share on WhatsApp
                      </a>
                      <a href={`mailto:?subject=Join me on PickYourHire&body=${encodeURIComponent("Hey! I'd like to invite you to join PickYourHire as a referrer. Click the link to get started: " + magicLink)}`}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", backgroundColor: "#EFF6FF", color: "#1d4ed8", border: "1px solid #BFDBFE", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                        <Mail size={14} /> Send via Email
                      </a>
                    </div>

                    <div style={{ marginTop: 16, fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={12} /> Link is valid for 30 days. You can regenerate it anytime.
                    </div>

                    <button onClick={() => setMagicLink("")} style={{ marginTop: 12, fontSize: 13, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                      Regenerate link
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
