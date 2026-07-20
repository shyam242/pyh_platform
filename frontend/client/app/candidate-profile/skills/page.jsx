"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, User, Briefcase, GraduationCap, Sparkles, FileText,
  FolderKanban, Sliders, Star, Trash2, Edit2, Plus, X, ChevronRight,
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O      = "#E87722";
const O_LITE = "#FFF3E8";
const O_MID  = "#FBBF7A";
const BORDER = "#EBEBEB";

const SKILL_ICONS = { Java: "☕", "Spring Boot": "🌱", SQL: "🗄️", "React.js": "⚛️", AWS: "☁️" };

const SUGGESTED_POOL = ["Hibernate", "Microservices", "REST API", "Docker", "Kubernetes", "Git", "Maven", "Jenkins", "CI/CD", "PostgreSQL", "GraphQL", "TypeScript", "Redis", "Kafka"];

// naive role/skill map to compute a believable "match" score from the candidate's own skills
const ROLES = [
  { title: "Java Developer",     needs: ["Java", "Spring Boot", "SQL", "Hibernate", "Maven", "REST API"] },
  { title: "Backend Developer",  needs: ["Java", "SQL", "REST API", "Docker", "Microservices", "AWS"] },
  { title: "Software Engineer",  needs: ["Java", "React.js", "SQL", "Git", "AWS", "CI/CD"] },
  { title: "Frontend Developer", needs: ["React.js", "TypeScript", "Git", "REST API"] },
  { title: "DevOps Engineer",    needs: ["AWS", "Docker", "Kubernetes", "Jenkins", "CI/CD"] },
];

function parseSkills(raw) {
  if (!raw) return [];
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; }
  catch { return typeof raw === "string" ? raw.split(",").map(s => s.trim()).filter(Boolean) : []; }
}

function loadLevels() {
  try { return JSON.parse(localStorage.getItem("pyh_skill_levels") || "{}"); } catch { return {}; }
}

const NAV_ITEMS = [
  { key: "basic",       label: "Basic information", Icon: User,          href: "/candidate-profile/edit" },
  { key: "experience",  label: "Experience",         Icon: Briefcase,     href: "/candidate-profile/edit" },
  { key: "education",   label: "Education",          Icon: GraduationCap, href: "/candidate-profile/edit" },
  { key: "skills",      label: "Skills",              Icon: Sparkles,      href: "/candidate-profile/skills" },
  { key: "resume",      label: "Resume",              Icon: FileText,      href: "/candidate-profile" },
  { key: "projects",    label: "Projects",            Icon: FolderKanban,  href: "/candidate-profile" },
  { key: "preferences", label: "Preferences",         Icon: Sliders,       href: "/candidate-profile/edit" },
];

export default function SkillsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState([]);
  const [levels, setLevels] = useState({});
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/signin"); return; }
    setLevels(loadLevels());
    fetch(`${API_BASE_URL}/api/profile/user`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSkills(parseSkills(d.skills)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rating = s => levels[s] || 3;
  const setRating = (s, val) => setLevels(p => ({ ...p, [s]: val }));

  const addSkill = name => {
    const trimmed = name.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills(p => [...p, trimmed]);
  };
  const removeSkill = s => setSkills(p => p.filter(x => x !== s));

  const suggested = SUGGESTED_POOL.filter(s => !skills.includes(s)).slice(0, 8);

  const recommendationScore = Math.min(98, 32 + skills.length * 10);

  const matchedRoles = ROLES
    .map(r => ({ title: r.title, pct: Math.round((r.needs.filter(n => skills.includes(n)).length / r.needs.length) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  const saveChanges = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(`${API_BASE_URL}/api/profile/candidate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ skills: JSON.stringify(skills) }),
      });
      if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.error || "Failed to save skills"); }
      localStorage.setItem("pyh_skill_levels", JSON.stringify(levels));
      showSuccess("Skills updated!");
      router.push("/candidate-profile");
    } catch (err) { showError(err.message || "Failed to save skills"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>Loading...</div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F6FA", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#0f172a" }}>
      <nav style={{ position: "sticky", top: 0, zIndex: 200, backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 32px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.push("/candidate-profile")} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, backgroundColor: "#fff", cursor: "pointer" }}>
          <ArrowLeft size={15} color="#475569" />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Edit profile</span>
      </nav>

      <div style={{ maxWidth: 1240, margin: "24px auto", padding: "0 24px 60px", display: "grid", gridTemplateColumns: "220px 1fr 300px", gap: 22 }}>

        {/* LEFT — section nav */}
        <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "10px", height: "fit-content" }}>
          {NAV_ITEMS.map(item => {
            const active = item.key === "skills";
            return (
              <div
                key={item.key}
                onClick={() => router.push(item.href)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 9,
                  cursor: "pointer", marginBottom: 2,
                  backgroundColor: active ? O_LITE : "transparent",
                  color: active ? O : "#475569",
                  fontWeight: active ? 700 : 500, fontSize: 13.5,
                }}
              >
                <item.Icon size={16} /> {item.label}
              </div>
            );
          })}
        </div>

        {/* MIDDLE — skills editor */}
        <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "26px 28px" }}>
          <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>Skills & Expertise</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 6, marginBottom: 22 }}>
            Add the skills that best describe your expertise. These help us recommend more relevant jobs.
          </p>

          <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Your skills ({skills.length})</div>

          {skills.length === 0 && (
            <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", marginBottom: 16 }}>No skills added yet — add one below.</p>
          )}

          {skills.map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 4px", borderBottom: `1px solid #F1F5F9` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 17 }}>{SKILL_ICONS[s] || "🔧"}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{s}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star
                      key={n} size={15}
                      fill={n <= rating(s) ? O : "none"}
                      stroke={n <= rating(s) ? O : "#CBD5E1"}
                      style={{ cursor: "pointer" }}
                      onClick={() => setRating(s, n)}
                    />
                  ))}
                </div>
                <Edit2 size={14} color="#94a3b8" style={{ cursor: "pointer" }} />
                <Trash2 size={14} color="#94a3b8" style={{ cursor: "pointer" }} onClick={() => removeSkill(s)} />
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <input
              value={newSkill} onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { addSkill(newSkill); setNewSkill(""); } }}
              placeholder="Type a skill and press Enter"
              style={{ flex: 1, padding: "10px 13px", fontSize: 13, border: `1.5px solid ${BORDER}`, borderRadius: 9, outline: "none", fontFamily: "inherit", backgroundColor: "#FAFAFA" }}
              onFocus={e => (e.target.style.borderColor = O)}
              onBlur={e => (e.target.style.borderColor = BORDER)}
            />
            <button
              onClick={() => { addSkill(newSkill); setNewSkill(""); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 9, border: "none", backgroundColor: O, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              <Plus size={14} /> Add skill
            </button>
          </div>
        </div>

        {/* RIGHT — recommendation + suggestions + roles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10 }}>Recommendation score</div>
            <div style={{ height: 8, borderRadius: 999, backgroundColor: "#F1F5F9", marginBottom: 8 }}>
              <div style={{ height: "100%", borderRadius: 999, backgroundColor: "#3B6D11", width: `${recommendationScore}%`, transition: "width 0.4s" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3B6D11" }}>{recommendationScore}%</div>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Great! Keep adding more relevant skills.</p>
          </div>

          <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Suggested skills</div>
            <p style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 12 }}>Based on your profile and preferences</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {suggested.map(s => (
                <span
                  key={s} onClick={() => addSkill(s)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999, border: `1px solid ${O_MID}`, backgroundColor: O_LITE, color: "#B35500", cursor: "pointer" }}
                >
                  {s} <Plus size={11} />
                </span>
              ))}
            </div>
            <div onClick={() => addSkill(newSkill)} style={{ marginTop: 12, fontSize: 12.5, color: O, fontWeight: 700, cursor: "pointer" }}>View more skills →</div>
          </div>

          <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Top roles you can unlock</div>
            {matchedRoles.map(r => (
              <div key={r.title} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ color: "#0f172a", fontWeight: 600 }}>{r.title}</span>
                  <span style={{ color: O, fontWeight: 700 }}>{r.pct}% match</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, backgroundColor: "#F1F5F9" }}>
                  <div style={{ height: "100%", borderRadius: 999, backgroundColor: O, width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12.5, color: O, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
              View all matched roles <ChevronRight size={13} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{ position: "sticky", bottom: 0, backgroundColor: "#fff", borderTop: `1.5px solid ${BORDER}`, padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span onClick={() => router.push("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", cursor: "pointer", fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to dashboard
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/candidate-profile")} style={{ padding: "10px 22px", borderRadius: 9, border: `1.5px solid ${BORDER}`, backgroundColor: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={saveChanges} disabled={saving} style={{ padding: "10px 26px", borderRadius: 9, border: "none", backgroundColor: O, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
