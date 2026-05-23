"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, Copy, MapPin, Briefcase, Clock, DollarSign,
  Building2, CheckCircle2, Lightbulb, ChevronRight,
  Users, Zap, Star, ExternalLink, Calendar, Award, Target
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId;

  const [job, setJob] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (jobId) fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/jobs/${jobId}`);
      setJob(response.data);
      try {
        const all = await axios.get("http://localhost:5000/api/jobs");
        setSimilarJobs(
          all.data
            .filter(j =>
              j.id !== response.data.id &&
              (j.department === response.data.department || j.location === response.data.location) &&
              j.status === "active"
            )
            .slice(0, 3)
        );
      } catch {}
    } catch (error) {
      showError("Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/admin/jobs/${jobId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    showSuccess("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (job?.linkedin_url) {
      window.open(job.linkedin_url, "_blank");
    } else {
      showSuccess("Application submitted!");
    }
  };

  const parseLines = (text) => {
    if (!text) return [];
    return text
      .split("\n")
      .map(l => l.replace(/^[\u2022\-\*\•]\s*/, "").trim())
      .filter(Boolean);
  };

  const renderRichText = (text) => {
    if (!text) return "";
    const escapeHtml = (unsafe) => unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const lines = escapeHtml(text).split("\n");
    let html = "";
    let listOpen = false;

    const formatInline = (line) => {
      const bold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      return bold.replace(/\*(.+?)\*/g, "<em>$1</em>");
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        if (!listOpen) {
          listOpen = true;
          html += "<ul style='margin:0 0 0.75rem 1.2rem; padding-left:0;'>";
        }
        const itemText = formatInline(trimmed.replace(/^[-*]\s+/, ""));
        html += `<li style='margin-bottom:0.45rem;'>${itemText}</li>`;
      } else {
        if (listOpen) {
          html += "</ul>";
          listOpen = false;
        }
        if (trimmed) {
          html += `<p style='margin:0 0 0.85rem; line-height:1.75; font-size:0.95rem;'>${formatInline(trimmed)}</p>`;
        }
      }
    });

    if (listOpen) {
      html += "</ul>";
    }

    return html;
  };

  // ── LOADING ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #fde8d8", borderTopColor: "#f97316", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <p style={{ marginTop: 16, color: "#6b7280", fontSize: 14 }}>Loading job details…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── NOT FOUND ──
  if (!job) {
    return (
      <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600, color: "#111827" }}>Job not found</h2>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px" }}>This job may have been removed or the link is incorrect.</p>
          <button
            onClick={() => router.back()}
            style={{ padding: "10px 20px", background: "#f97316", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            ← Go Back
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const responsibilities = parseLines(job.responsibilities);
  const qualifications = parseLines(job.qualifications);
  const benefits = parseLines(job.benefits);
  const description = parseLines(job.job_description);

  const BulletList = ({ items, color = "#f97316" }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 7 }} />
          <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.75 }}>{item}</p>
        </div>
      ))}
    </div>
  );

  const Section = ({ title, icon: Icon, children, accentBg = "#fff7ed", accentIcon = "#f97316" }) => (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "24px 28px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={accentIcon} />
        </div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>{title}</h2>
      </div>
      {children}
    </div>
  );

  const metaItems = [
    { icon: MapPin, label: "Location", value: job.location },
    { icon: Briefcase, label: "Job Type", value: job.job_type },
    { icon: Clock, label: "Experience", value: job.experience_required },
    { icon: DollarSign, label: "Salary", value: job.salary_range },
  ].filter(i => i.value);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Sticky Nav ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 32px", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => router.back()}
              style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <ArrowLeft size={16} color="#374151" />
            </button>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>{job.job_title}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>{job.department}{job.department && job.location ? " · " : ""}{job.location}</p>
            </div>
          </div>
          <button
            onClick={handleApply}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", background: "#f97316", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#ea580c"}
            onMouseLeave={e => e.currentTarget.style.background = "#f97316"}
          >
            Apply Now <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 310px", gap: 20 }}>

          {/* ── LEFT COLUMN ── */}
          <div>

            {/* Hero Card */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "28px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #f97316, #fb923c)" }} />
              <div style={{ paddingTop: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
                  <div>
                    <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 700, color: "#111827" }}>{job.job_title}</h1>
                    <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
                      {job.department}{job.department && job.location ? " · " : ""}{job.location}
                    </p>
                  </div>
                  <span style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: job.status === "inactive" ? "#fee2e2" : "#f0fdf4",
                    color: job.status === "inactive" ? "#b91c1c" : "#15803d",
                    border: job.status === "inactive" ? "1px solid #fecaca" : "1px solid #bbf7d0",
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: job.status === "inactive" ? "#b91c1c" : "#16a34a" }} />
                    {job.status === "inactive" ? "Inactive" : "Active"}
                  </span>
                </div>

                {/* Meta chips */}
                {metaItems.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
                    {metaItems.map(({ icon: Icon, label, value }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#f8f9fc", border: "1px solid #e5e7eb", borderRadius: 24 }}>
                        <Icon size={13} color="#f97316" />
                        <div>
                          <p style={{ margin: 0, fontSize: 9, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* About This Role */}
            {(description.length > 0 || job.job_description) && (
              <Section title="About This Role" icon={Zap}>
                <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.85 }}>
                  <div
                    dangerouslySetInnerHTML={{ __html: renderRichText(job.job_description) }}
                    style={{ margin: 0 }}
                  />
                </div>
              </Section>
            )}

            {/* Key Responsibilities */}
            {responsibilities.length > 0 && (
              <Section title="Key Responsibilities" icon={CheckCircle2}>
                <BulletList items={responsibilities} />
              </Section>
            )}

            {/* Eligibility / Requirements */}
            {qualifications.length > 0 && (
              <Section title="Eligibility / Requirements" icon={Star} accentBg="#fefce8" accentIcon="#ca8a04">
                <BulletList items={qualifications} color="#ca8a04" />
              </Section>
            )}

            {/* Why Join Us */}
            {benefits.length > 0 && (
              <Section title="Why Join Us" icon={Award} accentBg="#f0fdf4" accentIcon="#16a34a">
                <BulletList items={benefits} color="#16a34a" />
              </Section>
            )}

            {/* Similar Positions */}
            {similarJobs.length > 0 && (
              <Section title="Similar Positions" icon={Users} accentBg="#eff6ff" accentIcon="#3b82f6">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {similarJobs.map(j => (
                    <div
                      key={j.id}
                      onClick={() => router.push(`/admin/jobs/${j.id}`)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#f8f9fc", border: "1px solid #e5e7eb", borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.background = "#fff7ed"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#f8f9fc"; }}
                    >
                      <div>
                        <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: "#111827" }}>{j.job_title}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{j.department}{j.department && j.location ? " · " : ""}{j.location}</p>
                      </div>
                      <ChevronRight size={16} color="#9ca3af" />
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div>
            {/* Ready to Apply */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px", marginBottom: 16, position: "sticky", top: 76 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#111827" }}>Ready to Apply?</h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                Click the button below to apply on LinkedIn for this exciting opportunity.
              </p>
              <button
                onClick={handleApply}
                style={{ width: "100%", background: "#f97316", color: "#fff", border: "none", padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#ea580c"}
                onMouseLeave={e => e.currentTarget.style.background = "#f97316"}
              >
                <ExternalLink size={15} />
                Apply Now on LinkedIn
              </button>

              <div style={{ margin: "16px 0", borderTop: "1px solid #f3f4f6" }} />

              <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#374151" }}>Share This Job</h4>
              <button
                onClick={copyLink}
                style={{ width: "100%", background: copied ? "#f0fdf4" : "#f8f9fc", color: copied ? "#16a34a" : "#374151", border: `1px solid ${copied ? "#bbf7d0" : "#e5e7eb"}`, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all 0.15s" }}
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Link"}
              </button>

              {/* Pro Tip */}
              <div style={{ marginTop: 14, padding: "13px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Lightbulb size={14} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 700, color: "#9a3412" }}>Pro Tip</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#c2410c", lineHeight: 1.5 }}>
                      Make sure your LinkedIn profile is up to date before applying.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Job Overview */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px" }}>
              <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700, color: "#111827" }}>Job Overview</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: MapPin, label: "Location", value: job.location },
                  { icon: Building2, label: "Department", value: job.department },
                  { icon: Briefcase, label: "Job Type", value: job.job_type },
                  { icon: Clock, label: "Experience", value: job.experience_required },
                  { icon: DollarSign, label: "Salary Range", value: job.salary_range },
                ].filter(i => i.value).map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={13} color="#f97316" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#111827" }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}