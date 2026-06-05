"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MapPin, Briefcase, DollarSign, Clock, Bookmark, Share2, CheckCircle, AlertCircle, Users, Calendar } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722"; const O_LITE = "#FFF3E8"; const O_MID = "#FBBF7A";

export default function JobDetailsPage() {
  const router  = useRouter();
  const params  = useParams();
  const jobId   = params.jobId;
  const [job, setJob]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    if (!jobId) return;
    fetchJob();
    // check saved
    try { const s = JSON.parse(localStorage.getItem("pyh_saved_jobs") || "[]"); setSaved(s.includes(jobId)); } catch {}
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job");
      setJob(await res.json());
    } catch (err) { showError(err.message); router.push("/dashboard"); }
    finally { setLoading(false); }
  };

  const handleApply = async () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/signin"); return; }
    setApplying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/apply`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed to apply"); }
      setApplied(true);
      showSuccess("Applied successfully!");
      setTimeout(() => router.push("/dashboard"), 1600);
    } catch (err) { showError(err.message); }
    finally { setApplying(false); }
  };

  const toggleSave = () => {
    const next = !saved;
    setSaved(next);
    try {
      const s = JSON.parse(localStorage.getItem("pyh_saved_jobs") || "[]");
      const updated = next ? [...s, jobId] : s.filter(x => x !== jobId);
      localStorage.setItem("pyh_saved_jobs", JSON.stringify(updated));
    } catch {}
    showSuccess(next ? "Job saved!" : "Job unsaved");
  };

  const shareJob = () => {
    navigator.clipboard?.writeText(window.location.href);
    showSuccess("Job link copied to clipboard!");
  };

  const parseList = v => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return v.split(/\n|•|-/).map(s => s.trim()).filter(Boolean);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC", fontFamily: "inherit" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${O}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#64748b", fontSize: 14 }}>Loading job details...</p>
      </div>
    </div>
  );
  if (!job) return null;

  const metaItems = [
    { icon: MapPin,      label: "Location",   value: job.location || "Not specified" },
    { icon: Briefcase,   label: "Job type",   value: job.job_type || "Not specified" },
    { icon: DollarSign,  label: "Salary",     value: job.salary_range || "Not disclosed" },
    { icon: Clock,       label: "Experience", value: job.experience_required || "Not specified" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>
      {/* HEADER BAR */}
      <div style={{ backgroundColor: "#fff", padding: "0 48px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1.5px solid #E5E7EB", position: "sticky", top: 0, zIndex: 100 }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 14, fontWeight: 600, fontFamily: "inherit", padding: "8px 0" }}
          onMouseEnter={e => (e.currentTarget.style.color = O)} onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>
          <ArrowLeft size={18} /> Back to dashboard
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "0.04em" }}>PICK<span style={{ color: O }}>YOUR</span>HIRE</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={shareJob} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "1.5px solid #E5E7EB", borderRadius: 8, backgroundColor: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Share2 size={14} /> Share
          </button>
          <button onClick={toggleSave} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: `1.5px solid ${saved ? O_MID : "#E5E7EB"}`, borderRadius: 8, backgroundColor: saved ? O_LITE : "#fff", color: saved ? "#B35500" : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Bookmark size={14} fill={saved ? O : "none"} /> {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 28, alignItems: "start" }}>

        {/* LEFT */}
        <div>
          {/* Hero card */}
          <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "32px", border: "1.5px solid #E5E7EB", marginBottom: 20 }}>
            <div style={{ marginBottom: 24 }}>
              <span style={{ display: "inline-block", padding: "4px 12px", backgroundColor: O_LITE, color: "#B35500", borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1px solid ${O_MID}`, marginBottom: 14 }}>
                {job.department || "General"}
              </span>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{job.job_title || "Untitled Position"}</h1>
              {job.posted_at && (
                <p style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5, margin: 0 }}>
                  <Calendar size={13} /> Posted {job.posted_at}
                </p>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              {metaItems.map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: O_LITE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={16} color={O} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content sections */}
          {[
            { title: "Job description",         content: job.job_description,  isList: false },
            { title: "Responsibilities",        content: job.responsibilities,  isList: true  },
            { title: "Required qualifications", content: job.qualifications,    isList: true  },
            { title: "Benefits",                content: job.benefits,          isList: true  },
          ].filter(s => s.content).map(({ title, content, isList }) => {
            const listItems = isList ? parseList(content) : [];
            return (
              <div key={title} style={{ backgroundColor: "#fff", borderRadius: 16, padding: "28px 32px", border: "1.5px solid #E5E7EB", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: `2px solid ${O_LITE}` }}>
                  <div style={{ width: 4, height: 22, backgroundColor: O, borderRadius: 999 }} />
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h2>
                </div>
                {isList && listItems.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                    {listItems.map((item, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#475569", lineHeight: 1.65 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: O, marginTop: 7, flexShrink: 0 }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: "#475569", lineHeight: 1.75, fontSize: 14, whiteSpace: "pre-wrap" }}>{content}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT */}
        <div style={{ position: "sticky", top: 88, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Apply card */}
          <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "28px 24px", border: "1.5px solid #E5E7EB" }}>
            {applied ? (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <CheckCircle size={40} color="#3B6D11" style={{ margin: "0 auto 12px", display: "block" }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "#3B6D11" }}>Application submitted!</h3>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 }}>You will be redirected to your dashboard shortly.</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Ready to apply?</h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 20px" }}>Submit your application and our team will review it soon.</p>
                <button onClick={handleApply} disabled={applying} style={{ width: "100%", padding: "13px", backgroundColor: applying ? O_LITE : O, color: applying ? "#B35500" : "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: applying ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: applying ? "none" : "0 4px 14px rgba(232,119,34,0.28)", transition: "background-color 0.15s" }}
                  onMouseEnter={e => { if (!applying) e.currentTarget.style.backgroundColor = "#C0601A"; }}
                  onMouseLeave={e => { if (!applying) e.currentTarget.style.backgroundColor = O; }}>
                  {applying ? "Submitting..." : "Apply now"}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 12, color: "#94a3b8" }}>
                  <AlertCircle size={12} /> Your profile info will be shared with the recruiter.
                </div>
              </>
            )}
          </div>

          {/* Similar info card */}
          <div style={{ backgroundColor: O_LITE, borderRadius: 16, padding: "22px 22px", border: `1.5px solid ${O_MID}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Users size={16} color={O} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#7A3600" }}>About this role</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Department", value: job.department || "General" },
                { label: "Job type",   value: job.job_type || "Full-time" },
                { label: "Experience", value: job.experience_required || "Open to all" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#B35500", fontWeight: 500 }}>{label}</span>
                  <span style={{ color: "#7A3600", fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Back button */}
          <button onClick={() => router.push("/dashboard")} style={{ width: "100%", padding: "11px", border: "1.5px solid #E5E7EB", borderRadius: 10, backgroundColor: "#fff", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = O; e.currentTarget.style.color = O; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#475569"; }}>
            Back to all jobs
          </button>
        </div>
      </div>
    </div>
  );
}
