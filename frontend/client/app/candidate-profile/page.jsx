"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Edit2, Upload, CheckCircle2, Plus, X,
  Download, User, Briefcase, MapPin, GraduationCap,
  Phone, Mail, Link2, FileText, Award, ChevronRight,
  Sparkles, ShieldCheck, AlertCircle, Users
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const AVAILABLE_SKILLS = ["React", "Node.js", "Python", "Java", "AWS", "UI/UX", "TypeScript", "MongoDB"];
const O       = "#E87722";
const O_LITE  = "#FFF3E8";
const O_MID   = "#FBBF7A";

function parseSkills(raw) {
  if (!raw) return [];
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; }
  catch { return typeof raw === "string" ? raw.split(",").map(s => s.trim()).filter(Boolean) : []; }
}

function Field({ label, value, icon }) {
  return (
    <div style={{ padding: "12px 14px", backgroundColor: "#F8FAFC", borderRadius: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
        {icon && <span style={{ color: O }}>{icon}</span>} {label}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: value ? "#0f172a" : "#94a3b8", fontStyle: value ? "normal" : "italic" }}>
        {value || "Not provided"}
      </p>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${O_LITE}` }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: O_LITE, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: O }}>{icon}</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function CandidateProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState(null);
  const [skills, setSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const fileRef = useRef(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/api/profile/candidate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      setProfile(await res.json());
    } catch (err) { showError(err.message || "Failed to load profile"); }
    finally { setLoading(false); }
  };

  const toggleSkill = s => setSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const addSkill    = () => { if (customSkill.trim() && !skills.includes(customSkill.trim())) { setSkills([...skills, customSkill.trim()]); setCustomSkill(""); } };
  const removeSkill = s => setSkills(skills.filter(x => x !== s));

  const submitVerification = async () => {
    if (!resume) return showError("Upload resume first");
    if (skills.length === 0) return showError("Select at least one skill");
    setVerifyLoading(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("file", resume);
      fd.append("skills", JSON.stringify(skills));
      const res = await fetch(`${API_BASE_URL}/api/profile/verify`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      if (!res.ok) { const t = await res.text(); let p; try { p = JSON.parse(t); } catch {} throw new Error(p?.message || p?.error || t); }
      showSuccess("Profile verified successfully!");
      setResume(null); setSkills([]);
      await fetchProfile();
    } catch (err) { showError(err.message || "Verification failed"); }
    finally { setVerifyLoading(false); }
  };

  const deleteProfile = async () => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/profile/candidate`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.error || "Failed to delete"); }
      localStorage.removeItem("token");
      showSuccess("Your profile has been deleted.");
      router.push("/signin");
    } catch (err) { showError(err.message || "Failed to delete profile"); }
    finally { setDeleteLoading(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F5F6FA", fontFamily: "inherit" }}>
      <div style={{ textAlign: "center", color: "#64748b", fontSize: 14 }}>Loading profile...</div>
    </div>
  );

  if (!profile) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F5F6FA" }}>
      <div style={{ textAlign: "center", color: "#64748b", fontSize: 14 }}>Profile not found.</div>
    </div>
  );

  const profileSkills = parseSkills(profile.skills);
  const tabs = [
    { key: "info", label: "Profile info" },
    { key: "resume", label: "Resume & skills" },
    { key: "danger", label: "Account" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F6FA", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "#fff", borderBottom: "0.5px solid #E5E7EB", padding: "0 28px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.06em" }}>
          PICK<span style={{ color: O }}>YOUR</span>HIRE
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "0.5px solid #E5E7EB", backgroundColor: "#fff", fontSize: 13, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>
            <ArrowLeft size={14} /> Back
          </button>
          <button onClick={() => router.push("/candidate-profile/edit")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, backgroundColor: O, border: "none", fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            <Edit2 size={14} /> Edit profile
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "28px auto", padding: "0 24px 48px" }}>

        {/* Profile hero card */}
        <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "28px 28px 0", border: "0.5px solid #E5E7EB", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 24 }}>
            {/* Avatar */}
            <div style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 600, flexShrink: 0 }}>
              {profile.image_url
                ? <img src={profile.image_url} alt="" style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover" }} />
                : (profile.name || "U").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>{profile.name || "Candidate"}</h1>
                {profile.verified
                  ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999, backgroundColor: "#EAF3DE", color: "#3B6D11", border: "0.5px solid #97C459" }}><ShieldCheck size={11} /> Verified</span>
                  : <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999, backgroundColor: O_LITE, color: "#B35500", border: `0.5px solid ${O_MID}` }}><AlertCircle size={11} /> Pending verification</span>
                }
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{profile.job_role || "No role specified"} {profile.current_company_name ? `at ${profile.current_company_name}` : ""}</p>
              <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                {profile.email && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}><Mail size={12} color={O} /> {profile.email}</span>}
                {profile.contact && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}><Phone size={12} color={O} /> {profile.contact}</span>}
                {profile.current_location && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}><MapPin size={12} color={O} /> {profile.current_location}</span>}
              </div>
            </div>
            {profile.linkedin_profile && (
              <a href={profile.linkedin_profile} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "0.5px solid #E5E7EB", fontSize: 12, color: "#0f172a", textDecoration: "none" }}>
                <Link2 size={13} color={O} /> LinkedIn
              </a>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderTop: "0.5px solid #F1F5F9" }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "12px 20px", fontSize: 13, fontWeight: activeTab === tab.key ? 500 : 400,
                  color: activeTab === tab.key ? O : "#64748b",
                  background: "none", border: "none", cursor: "pointer",
                  borderBottom: `2px solid ${activeTab === tab.key ? O : "transparent"}`,
                  fontFamily: "inherit",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB: Profile info */}
        {activeTab === "info" && (
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: 28, border: "0.5px solid #E5E7EB" }}>
            <Section title="Personal information" icon={<User size={16} />}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="Full name" value={profile.name} />
                <Field label="Email address" value={profile.email} />
                <Field label="Contact number" value={profile.contact} />
                <Field label="Highest qualification" value={profile.highest_qualification} />
              </div>
            </Section>

            <Section title="Professional details" icon={<Briefcase size={16} />}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="Job role" value={profile.job_role} />
                <Field label="Current company" value={profile.current_company_name} />
                <Field label="Current CTC (LPA)" value={profile.cctc} />
                <Field label="Expected CTC (LPA)" value={profile.ectc} />
                <Field label="Notice period" value={profile.notice_period} />
                <Field label="Offer in hand" value={profile.offer_in_hand} />
              </div>
            </Section>

            <Section title="Location" icon={<MapPin size={16} />}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="Current location" value={profile.current_location} />
                <Field label="Preferred location" value={profile.preferred_location} />
              </div>
            </Section>

            <Section title="Skills" icon={<Sparkles size={16} />}>
              {profileSkills.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {profileSkills.map(s => (
                    <span key={s} style={{ padding: "5px 12px", borderRadius: 999, backgroundColor: O_LITE, color: "#B35500", border: `0.5px solid ${O_MID}`, fontSize: 12, fontWeight: 500 }}>{s}</span>
                  ))}
                </div>
              ) : null}
              <div style={{ display: "grid", gap: 8 }}>
                <Field label="Technical skills" value={profile.technical_skills} />
                <Field label="Soft skills" value={profile.soft_skills} />
              </div>
            </Section>

            <Section title="Additional information" icon={<Award size={16} />}>
              <div style={{ display: "grid", gap: 8 }}>
                <Field label="Address (as per Aadhaar)" value={profile.address_aadhaar} />
                <Field label="Reason for change" value={profile.reason_for_change} />
                {profile.linkedin_profile && (
                  <Field label="LinkedIn" value={profile.linkedin_profile} />
                )}
              </div>
            </Section>

            {/* Referred By section */}
            {profile?.referrer && (
              <Section title="Referred by" icon={<Users size={16} />}>
                <div style={{ backgroundColor: O_LITE, border: `1px solid ${O_MID}`, borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                    {(profile.referrer.referrer_name || "R").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{profile.referrer.referrer_name}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>{profile.referrer.referrer_company || "Referrer"}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <a href={`mailto:${profile.referrer.referrer_email}`} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569", textDecoration: "none", fontWeight: 500 }}>
                        <Mail size={12} color={O} /> {profile.referrer.referrer_email}
                      </a>
                      {profile.referrer.referrer_phone && (
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}>
                          <Phone size={12} color={O} /> {profile.referrer.referrer_phone}
                        </span>
                      )}
                      {profile.referrer.referrer_linkedin && (
                        <a href={profile.referrer.referrer_linkedin} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#1d4ed8", textDecoration: "none", fontWeight: 500 }}>
                          <Link2 size={12} /> LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
                    {profile.referrer.referred_at ? new Date(profile.referrer.referred_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                  </div>
                </div>
              </Section>
            )}
          </div>
        )}

        {/* TAB: Resume & skills */}
        {activeTab === "resume" && (
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: 28, border: "0.5px solid #E5E7EB" }}>
            {/* Current resume */}
            <Section title="Uploaded resume" icon={<FileText size={16} />}>
              {profile.resume_file_path ? (
                <a
                  href={`${API_BASE_URL}${profile.resume_file_path}`}
                  download target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", backgroundColor: "#EAF3DE", color: "#3B6D11", border: "0.5px solid #97C459", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 500 }}
                >
                  <Download size={14} /> Download resume
                </a>
              ) : (
                <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>No resume uploaded yet.</p>
              )}
            </Section>

            {/* Update resume */}
            <Section title="Update resume and skills" icon={<Upload size={16} />}>
              {/* Resume upload */}
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: resume ? `1.5px solid #97C459` : "1.5px dashed #E5E7EB",
                  borderRadius: 10, padding: "20px", textAlign: "center",
                  cursor: "pointer", backgroundColor: resume ? "#EAF3DE" : "#F8FAFC",
                  marginBottom: 20,
                }}
              >
                <input
                  ref={fileRef} type="file" style={{ display: "none" }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 5 * 1024 * 1024) { showError("File size must be under 5MB"); return; }
                    setResume(f); showSuccess("Resume selected!");
                  }}
                />
                {resume ? (
                  <>
                    <CheckCircle2 size={28} color="#3B6D11" style={{ margin: "0 auto 8px", display: "block" }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#3B6D11" }}>{resume.name}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Click to change</p>
                  </>
                ) : (
                  <>
                    <Upload size={28} color="#94a3b8" style={{ margin: "0 auto 8px", display: "block" }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Upload your resume</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>PDF or DOC, max 5MB</p>
                  </>
                )}
              </div>

              {/* Skill picker */}
              <label style={{ fontSize: 12, fontWeight: 500, color: "#334155", display: "block", marginBottom: 10 }}>
                Select skills
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {AVAILABLE_SKILLS.map(s => (
                  <button
                    key={s} onClick={() => toggleSkill(s)}
                    style={{
                      padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                      border: skills.includes(s) ? `1.5px solid ${O}` : "0.5px solid #E5E7EB",
                      backgroundColor: skills.includes(s) ? O_LITE : "#F8FAFC",
                      color: skills.includes(s) ? "#B35500" : "#64748b",
                      fontSize: 12, fontWeight: 500, fontFamily: "inherit",
                    }}
                  >{s}</button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  value={customSkill} onChange={e => setCustomSkill(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addSkill()}
                  placeholder="Add a custom skill"
                  style={{ flex: 1, padding: "8px 12px", border: "0.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  onFocus={e => (e.target.style.borderColor = O)}
                  onBlur={e => (e.target.style.borderColor = "#E5E7EB")}
                />
                <button onClick={addSkill} style={{ padding: "8px 14px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
                  <Plus size={15} />
                </button>
              </div>

              {skills.length > 0 && (
                <div style={{ padding: "12px 14px", backgroundColor: "#EAF3DE", borderRadius: 10, border: "0.5px solid #97C459", marginBottom: 16 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 500, color: "#3B6D11" }}>Selected ({skills.length})</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {skills.map(s => (
                      <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", backgroundColor: "#D1F5D3", borderRadius: 999, color: "#166534", fontSize: 11, border: "0.5px solid #86efac" }}>
                        {s}
                        <button onClick={() => removeSkill(s)} style={{ background: "none", border: "none", cursor: "pointer", color: "#15803d", padding: 0, display: "flex" }}><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={submitVerification}
                disabled={verifyLoading || !resume || skills.length === 0}
                style={{
                  width: "100%", padding: "11px", borderRadius: 8,
                  backgroundColor: verifyLoading || !resume || skills.length === 0 ? "#E5E7EB" : O,
                  color: verifyLoading || !resume || skills.length === 0 ? "#94a3b8" : "#fff",
                  border: "none", fontSize: 13, fontWeight: 500, cursor: verifyLoading || !resume || skills.length === 0 ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {verifyLoading ? "Updating..." : "Update resume and skills"}
              </button>
            </Section>
          </div>
        )}

        {/* TAB: Account */}
        {activeTab === "danger" && (
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: 28, border: "0.5px solid #E5E7EB" }}>
            <Section title="Account actions" icon={<User size={16} />}>
              <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
                <button
                  onClick={() => router.push("/candidate-profile/edit")}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, backgroundColor: O, color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <Edit2 size={13} /> Edit all details
                </button>
                <button
                  onClick={() => router.back()}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, backgroundColor: "#F8FAFC", color: "#475569", border: "0.5px solid #E5E7EB", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <ArrowLeft size={13} /> Go back
                </button>
              </div>
            </Section>

            <Section title="Danger zone" icon={<AlertCircle size={16} />}>
              <div style={{ backgroundColor: "#FEF2F2", border: "0.5px solid #FECACA", borderRadius: 12, padding: "20px 20px" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 500, color: "#991B1B" }}>Delete your account</h3>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  This will permanently delete your profile and all associated data. This action cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, backgroundColor: "#ef4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Delete my account
                  </button>
                ) : (
                  <div>
                    <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 500, color: "#991B1B" }}>
                      Are you absolutely sure? This cannot be undone.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={deleteProfile}
                        disabled={deleteLoading}
                        style={{ padding: "9px 18px", borderRadius: 8, backgroundColor: "#ef4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: deleteLoading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                      >
                        {deleteLoading ? "Deleting..." : "Yes, delete permanently"}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        style={{ padding: "9px 18px", borderRadius: 8, backgroundColor: "#F1F5F9", color: "#475569", border: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
