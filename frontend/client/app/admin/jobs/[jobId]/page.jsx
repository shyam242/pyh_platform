"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MapPin, Briefcase, DollarSign, Clock, Share2, Users, Calendar, Mail, Phone, ChevronRight } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722"; const O_LITE = "#FFF3E8"; const O_MID = "#FBBF7A";

const getInitials = name => !name ? "?" : name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

export default function AdminJobDetailsPage() {
  const router  = useRouter();
  const params  = useParams();
  const jobId   = params.jobId;
  const [job, setJob]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    fetchJob();
    fetchApplicants();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job");
      setJob(await res.json());
    } catch (err) { showError(err.message); router.push("/admin"); }
    finally { setLoading(false); }
  };

  const fetchApplicants = async () => {
    setLoadingApplicants(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch applicants");
      setApplicants(await res.json());
    } catch (err) {
      showError(err.message || "Failed to load applicants");
    } finally {
      setLoadingApplicants(false);
    }
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

  const timeAgo = iso => {
    if (!iso) return "";
    const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    return `${d}d ago`;
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
        <button onClick={() => router.push("/admin")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 14, fontWeight: 600, fontFamily: "inherit", padding: "8px 0" }}
          onMouseEnter={e => (e.currentTarget.style.color = O)} onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>
          <ArrowLeft size={18} /> Back to admin
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "0.04em" }}>PICK<span style={{ color: O }}>YOUR</span>HIRE
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginLeft: 8, background: "#F1F5F9", padding: "3px 9px", borderRadius: 6 }}>Admin</span>
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={shareJob} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "1.5px solid #E5E7EB", borderRadius: 8, backgroundColor: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Share2 size={14} /> Share
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
              {job.created_at && (
                <p style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5, margin: 0 }}>
                  <Calendar size={13} /> Posted {new Date(job.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
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

          {/* Applicants card — admin only */}
          <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "22px 20px", border: "1.5px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={16} color={O} />
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Applicants</h3>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: O, backgroundColor: O_LITE, padding: "3px 10px", borderRadius: 999 }}>
                {applicants.length}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 16px" }}>Click a candidate to view their full profile.</p>

            {loadingApplicants ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading applicants...</div>
            ) : applicants.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No applications yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
                {applicants.map(a => (
                  <div key={a.id} onClick={() => router.push(`/admin/applicants/${a.candidate_id}`)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #F1F5F9", cursor: "pointer", transition: "background-color 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: O_LITE, color: O, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                      {a.image
                        ? <img src={a.image.startsWith("http") ? a.image : `${API_BASE_URL}/uploads/profile_images/${a.image}`} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : getInitials(a.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name || "Unnamed candidate"}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 4 }}>
                        <Mail size={10} /> {a.email}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>{timeAgo(a.applied_at)}</span>
                      <ChevronRight size={13} color="#cbd5e1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* About this role */}
          <div style={{ backgroundColor: O_LITE, borderRadius: 16, padding: "22px 22px", border: `1.5px solid ${O_MID}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Briefcase size={16} color={O} />
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
          <button onClick={() => router.push("/admin")} style={{ width: "100%", padding: "11px", border: "1.5px solid #E5E7EB", borderRadius: 10, backgroundColor: "#fff", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = O; e.currentTarget.style.color = O; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#475569"; }}>
            Back to all jobs
          </button>
        </div>
      </div>
    </div>
  );
}
