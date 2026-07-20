"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Edit2, Upload, CheckCircle2, Plus, X,
  Download, Eye, User, Briefcase, MapPin, GraduationCap,
  Phone, Mail, Link2, FileText, Award, ChevronRight,
  Sparkles, ShieldCheck, AlertCircle, Users, Send, Star,
  Trash2,
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const AVAILABLE_SKILLS = ["React", "Node.js", "Python", "Java", "AWS", "UI/UX", "TypeScript", "MongoDB"];
const O       = "#E87722";
const O_LITE  = "#FFF3E8";
const O_MID   = "#FBBF7A";
const BORDER  = "#EBEBEB";

function parseSkills(raw) {
  if (!raw) return [];
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; }
  catch { return typeof raw === "string" ? raw.split(",").map(s => s.trim()).filter(Boolean) : []; }
}

function Card({ title, icon, action, children }) {
  return (
    <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ color: O }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EditLink({ onClick, label = "Edit" }) {
  return (
    <span onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: O, cursor: "pointer" }}>
      <Edit2 size={12} /> {label}
    </span>
  );
}

export default function CandidateProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState(null);
  const [parsingProjects, setParsingProjects] = useState(false);
  const [parsedProjects, setParsedProjects] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const fileRef = useRef(null);

  useEffect(() => { fetchProfile(); fetchApplications(); }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/api/profile/candidate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setProfile(data);
      if (data.parsed_projects) {
        try { setParsedProjects(typeof data.parsed_projects === "string" ? JSON.parse(data.parsed_projects) : data.parsed_projects); }
        catch {}
      }
    } catch (err) { showError(err.message || "Failed to load profile"); }
    finally { setLoading(false); }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/jobs/applied/list`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setApplications((await res.json()) || []);
    } catch {}
  };

  const parseProjects = async () => {
    setParsingProjects(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/profile/parse-projects`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse projects");
      setParsedProjects(data.projects || []);
      showSuccess(`Found ${data.total_projects_found || data.projects?.length || 0} project(s) in your resume!`);
    } catch (err) { showError(err.message); }
    finally { setParsingProjects(false); }
  };

  const uploadResumeQuick = async file => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showError("File size must be under 5MB");
    setVerifyLoading(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("skills", JSON.stringify(parseSkills(profile?.skills)));
      const res = await fetch(`${API_BASE_URL}/api/profile/verify`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      if (!res.ok) { const t = await res.text(); let p; try { p = JSON.parse(t); } catch {} throw new Error(p?.message || p?.error || t); }
      showSuccess("Resume updated!");
      await fetchProfile();
    } catch (err) { showError(err.message || "Upload failed"); }
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
    { key: "info",    label: "Profile info" },
    { key: "danger",  label: "Account" },
  ];

  /* ── profile strength ── */
  const strengthItems = [
    { label: "Basic info",       done: !!(profile.name && profile.email) },
    { label: "Resume",           done: !!profile.resume_file_path },
    { label: "Skills",           done: profileSkills.length > 0 },
    { label: "Experience",       done: !!profile.job_role },
    { label: "Education",        done: !!profile.highest_qualification },
    { label: "Certifications",   done: !!profile.address_aadhaar },
  ];
  const strengthPct = Math.round((strengthItems.filter(i => i.done).length / strengthItems.length) * 100);

  /* ── application summary ── */
  const appCounts = {
    total: applications.length,
    in_review: applications.filter(a => a.status === "applied" || a.status === "in_review").length,
    shortlisted: applications.filter(a => a.status === "shortlisted").length,
    interview: applications.filter(a => a.status === "interview").length,
    offer: applications.filter(a => a.status === "offered").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  /* ── next steps ── */
  const nextSteps = [
    { label: "Complete your basic information", done: !!(profile.name && profile.contact && profile.current_location) },
    { label: "Add work experience",              done: !!profile.job_role },
    { label: "Upload or update resume",          done: !!profile.resume_file_path },
    { label: "Add more skills",                  done: profileSkills.length >= 5 },
    { label: "Add certifications",                done: !!profile.address_aadhaar },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F6FA", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "#fff", borderBottom: "0.5px solid #E5E7EB", padding: "0 28px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.06em" }}>
          PICK<span style={{ color: O }}>YOUR</span>HIRE
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "0.5px solid #E5E7EB", backgroundColor: "#fff", fontSize: 13, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>
            <ArrowLeft size={14} /> Back
          </button>
          <button onClick={() => router.push("/candidate-profile/edit")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, backgroundColor: O, border: "none", fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            <Edit2 size={14} /> Edit profile
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1180, margin: "24px auto", padding: "0 24px 56px" }}>

        {/* Profile hero card */}
        <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "24px 26px 0", border: "0.5px solid #E5E7EB", marginBottom: 18, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 20 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
              {profile.image_url
                ? <img src={profile.image_url} alt="" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover" }} />
                : (profile.name || "U").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{profile.name || "Candidate"}</h1>
                {profile.verified
                  ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, backgroundColor: "#EAF3DE", color: "#3B6D11", border: "0.5px solid #97C459" }}><ShieldCheck size={11} /> Verified</span>
                  : <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, backgroundColor: O_LITE, color: "#B35500", border: `0.5px solid ${O_MID}` }}><AlertCircle size={11} /> Pending verification</span>
                }
              </div>
              <p style={{ margin: "5px 0 0", fontSize: 13, color: "#64748b" }}>{profile.email}</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderTop: "0.5px solid #F1F5F9" }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "12px 20px", fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500,
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

        {/* TAB: Profile info — two-column layout */}
        {activeTab === "info" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

            {/* LEFT column */}
            <div>
              {/* Uploaded resume */}
              <Card title="Uploaded resume" icon={<FileText size={16} />}
                action={
                  profile.resume_file_path ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      {profile.resume_file_path && (
                        <a href={`${API_BASE_URL}${profile.resume_file_path}`} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "#475569", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                          <Eye size={12} /> Preview
                        </a>
                      )}
                      <span onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: O, cursor: "pointer", padding: "6px 12px", borderRadius: 8, border: `1px solid ${O_MID}`, backgroundColor: O_LITE }}>
                        <Upload size={12} /> Replace
                      </span>
                      <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => uploadResumeQuick(e.target.files?.[0])} />
                    </div>
                  ) : <EditLink onClick={() => router.push("/candidate-profile/edit")} label="Upload" />
                }
              >
                {profile.resume_file_path ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#0f172a" }}>
                    <FileText size={16} color={O} /> {profile.name ? `${profile.name.replace(/\s+/g, "_")}_Resume.pdf` : "Resume.pdf"}
                    <span style={{ color: "#94a3b8" }}>· Uploaded</span>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", margin: 0 }}>No resume uploaded yet.</p>
                )}
              </Card>

              {/* Skills */}
              <Card title="Skills" icon={<Sparkles size={16} />} action={<EditLink onClick={() => router.push("/candidate-profile/skills")} label="Edit skills" />}>
                {profileSkills.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {profileSkills.map(s => (
                      <span key={s} style={{ padding: "5px 12px", borderRadius: 999, backgroundColor: O_LITE, color: "#B35500", border: `0.5px solid ${O_MID}`, fontSize: 12, fontWeight: 600 }}>{s}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", margin: 0 }}>No skills added to increase your visibility.</p>
                )}
              </Card>

              {/* Experience */}
              <Card title="Experience" icon={<Briefcase size={16} />} action={<EditLink onClick={() => router.push("/candidate-profile/edit")} />}>
                {profile.job_role ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{profile.job_role}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, backgroundColor: "#EAF3DE", color: "#3B6D11" }}>Current</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>{profile.current_company_name || "Company not specified"}</div>
                    {profile.current_location && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}><MapPin size={11} style={{ verticalAlign: -1 }} /> {profile.current_location}</div>}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", margin: 0 }}>No experience details added yet.</p>
                )}
              </Card>

              {/* Education */}
              <Card title="Education" icon={<GraduationCap size={16} />} action={<EditLink onClick={() => router.push("/candidate-profile/edit")} />}>
                {profile.highest_qualification ? (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{profile.highest_qualification}</div>
                    {profile.current_location && <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{profile.current_location}</div>}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", margin: 0 }}>No education details added yet.</p>
                )}
              </Card>

              {/* Referred by */}
              {profile?.referrer && (
                <Card title="Referred by" icon={<Users size={16} />}>
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
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Project parsing */}
              <Card title="Parsed projects" icon={<FolderKanbanIcon />} action={
                profile.resume_file_path ? (
                  <span onClick={parseProjects} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: O, cursor: parsingProjects ? "not-allowed" : "pointer" }}>
                    <Sparkles size={12} /> {parsingProjects ? "Parsing..." : parsedProjects ? "Re-parse" : "Parse from resume"}
                  </span>
                ) : null
              }>
                {parsedProjects && parsedProjects.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {parsedProjects.map((p, i) => (
                      <div key={i} style={{ backgroundColor: "#F8FAFC", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>{p.description}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", margin: 0 }}>
                    {profile.resume_file_path ? "Click parse to extract projects from your resume." : "Upload a resume to enable project parsing."}
                  </p>
                )}
              </Card>
            </div>

            {/* RIGHT sidebar */}
            <div>
              {/* Profile strength */}
              <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 74, height: 74, borderRadius: "50%", flexShrink: 0,
                    background: `conic-gradient(${O} ${strengthPct * 3.6}deg, #F1F5F9 0deg)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                      {strengthPct}%
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {strengthItems.map(item => (
                      <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <CheckCircle2 size={12} color={item.done ? "#3B6D11" : "#CBD5E1"} />
                        <span style={{ fontSize: 11.5, color: item.done ? "#0f172a" : "#94a3b8" }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div onClick={() => router.push("/candidate-profile/edit")} style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: O, cursor: "pointer" }}>
                  Improve your profile →
                </div>
              </div>

              {/* Profile summary */}
              <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Profile summary</span>
                  <EditLink onClick={() => router.push("/candidate-profile/edit")} label="Edit summary" />
                </div>
                {[
                  ["Experience", profile.job_role ? "—" : "Not specified"],
                  ["Current location", profile.current_location],
                  ["Highest education", profile.highest_qualification],
                  ["Preferred role", profile.job_role],
                  ["Employment type", "Full-time"],
                  ["Expected salary", profile.ectc ? `${profile.ectc} LPA` : null],
                  ["Notice period", profile.notice_period],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F8FAFC" }}>
                    <span style={{ fontSize: 12.5, color: "#94a3b8" }}>{k}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Application summary */}
              <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Application summary</span>
                  <span onClick={() => router.push("/applied-jobs")} style={{ fontSize: 12, fontWeight: 700, color: O, cursor: "pointer" }}>View all applications</span>
                </div>
                {[
                  ["Total jobs applied", appCounts.total],
                  ["In review", appCounts.in_review],
                  ["Shortlisted", appCounts.shortlisted],
                  ["Interview", appCounts.interview],
                  ["Offer", appCounts.offer],
                  ["Rejected", appCounts.rejected],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                    <span style={{ fontSize: 12.5, color: "#64748b" }}>{k}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Next steps */}
              <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Next steps</span>
                <div style={{ marginTop: 12 }}>
                  {nextSteps.map(s => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                      <CheckCircle2 size={13} color={s.done ? "#3B6D11" : "#CBD5E1"} />
                      <span style={{ fontSize: 12.5, color: s.done ? "#94a3b8" : "#0f172a", textDecoration: s.done ? "line-through" : "none" }}>{s.label}</span>
                    </div>
                  ))}
                </div>
                <div onClick={() => router.push("/candidate-profile/edit")} style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: O, cursor: "pointer" }}>View all tips →</div>
              </div>

              {/* Why is this important */}
              <div style={{ backgroundColor: O_LITE, border: `1.5px solid ${O_MID}`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <AlertCircle size={14} color="#B35500" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#7A3600" }}>Why is this important?</span>
                </div>
                <p style={{ fontSize: 12, color: "#B35500", margin: 0, lineHeight: 1.6 }}>
                  Candidate profiles go up in more profile views and job opportunities.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Account */}
        {activeTab === "danger" && (
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: 28, border: "0.5px solid #E5E7EB" }}>
            <Card title="Account actions" icon={<User size={16} />}>
              <div style={{ display: "flex", gap: 10 }}>
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
            </Card>

            <Card title="Danger zone" icon={<AlertCircle size={16} />}>
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
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderKanbanIcon() {
  return <Award size={16} />;
}
