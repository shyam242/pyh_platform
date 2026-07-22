"use client";

import { useState, useMemo } from "react";
import { BORDER, O, O_LITE } from "./RecruiterSidebarLayout";

const EMPTY_FILTERS = {
  location: "", preferredLocation: "", skills: "", experience: "",
  position: "", noticePeriod: "", currentCompany: "", project: "",
  education: "", degree: "", institute: "", gender: "",
  candidateFreshness: "all", jobType: "", jobMode: "", industry: "",
};

const ilike = (field, val) => !val || (field || "").toLowerCase().includes(val.toLowerCase());

function withinFreshness(candidate, bucket) {
  if (bucket === "all") return true;
  const raw = candidate.created_at || candidate.upload_date;
  if (!raw) return false;
  const ageMs = Date.now() - new Date(raw).getTime();
  if (bucket === "new") return ageMs <= 24 * 60 * 60 * 1000;
  if (bucket === "week") return ageMs <= 7 * 24 * 60 * 60 * 1000;
  if (bucket === "month") return ageMs <= 30 * 24 * 60 * 60 * 1000;
  return true;
}

/** State + matching logic for the advanced filter panel. */
export function useAdvancedFilters() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);
  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([k, v]) => v && v !== "all").length,
    [filters]
  );

  const matchesFilters = (c) => {
    const f = filters;
    if (!ilike(c.current_location, f.location)) return false;
    if (!ilike(c.preferred_location, f.preferredLocation)) return false;
    if (!ilike(c.skills, f.skills)) return false;
    if (!ilike(c.current_company_name || c.company, f.currentCompany)) return false;
    if (!ilike(c.notice_period, f.noticePeriod)) return false;
    if (!ilike(c.role || c.current_role, f.position)) return false;
    if (!ilike(c.qualification || c.highest_qualification, f.education)) return false;
    if (!ilike(c.qualification || c.highest_qualification, f.degree)) return false;
    if (f.experience) {
      const exp = parseFloat(c.experience);
      const [min, max] = f.experience.split("-").map(Number);
      if (!isNaN(exp) && !isNaN(min)) {
        if (max ? (exp < min || exp > max) : exp < min) return false;
      }
    }
    if (f.gender && c.gender && c.gender.toLowerCase() !== f.gender.toLowerCase()) return false;
    if (f.institute && !ilike(c.institute || c.college, f.institute)) return false;
    if (f.jobType && !ilike(c.job_type || c.employment_type, f.jobType)) return false;
    if (f.jobMode && !ilike(c.work_mode || c.job_mode, f.jobMode)) return false;
    if (f.industry && !ilike(c.industry, f.industry)) return false;
    if (f.project) {
      const raw = c.parsed_projects || c.technical_skills || "";
      const projects = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
      if (Array.isArray(projects)) {
        const match = projects.some(p =>
          [p.title, p.description, ...(p.technologies || [])].join(" ").toLowerCase().includes(f.project.toLowerCase())
        );
        if (!match) return false;
      } else if (!ilike(c.technical_skills, f.project)) {
        return false;
      }
    }
    if (!withinFreshness(c, f.candidateFreshness)) return false;
    return true;
  };

  return { filters, setFilter, clearFilters, activeFilterCount, matchesFilters };
}

const Sel = ({ label, val, onChange, opts }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <select value={val} onChange={e => onChange(e.target.value)} style={fieldStyle}>
      <option value="">All</option>
      {opts.map(o => <option key={o.v || o} value={o.v || o}>{o.l || o}</option>)}
    </select>
  </div>
);

const Inp = ({ label, val, onChange, ph }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <input value={val} onChange={e => onChange(e.target.value)} placeholder={ph || ""} style={{ ...fieldStyle, cursor: "text" }} />
  </div>
);

/** The Advanced Filters card itself — drop this under the search bar on any candidate list page. */
export default function AdvancedFiltersPanel({ filters, setFilter, clearFilters, activeFilterCount }) {
  return (
    <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "20px 24px", marginBottom: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Advanced Filters</span>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} style={{ fontSize: 12, color: O, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Row 1: Location */}
      <div style={rowStyle}>
        <Inp label="Current Location" val={filters.location} onChange={v => setFilter("location", v)} ph="e.g. Delhi, Mumbai..." />
        <Inp label="Preferred Location" val={filters.preferredLocation} onChange={v => setFilter("preferredLocation", v)} ph="e.g. Bangalore..." />
        <Inp label="Skills" val={filters.skills} onChange={v => setFilter("skills", v)} ph="e.g. React, Python..." />
      </div>

      {/* Row 2: Experience, Position, Notice */}
      <div style={rowStyle}>
        <Sel label="Experience" val={filters.experience} onChange={v => setFilter("experience", v)}
          opts={[{ v: "0-1", l: "0–1 yr (Fresher)" }, { v: "1-3", l: "1–3 yrs" }, { v: "3-5", l: "3–5 yrs" }, { v: "5-8", l: "5–8 yrs" }, { v: "8-12", l: "8–12 yrs" }, { v: "12", l: "12+ yrs" }]} />
        <Inp label="Position / Role" val={filters.position} onChange={v => setFilter("position", v)} ph="e.g. Software Engineer..." />
        <Sel label="Notice Period" val={filters.noticePeriod} onChange={v => setFilter("noticePeriod", v)}
          opts={["Immediate", "15 days", "1 month", "2 months", "3 months", "More than 3 months"]} />
      </div>

      {/* Row 3: Company, Project, Gender */}
      <div style={rowStyle}>
        <Inp label="Current Company" val={filters.currentCompany} onChange={v => setFilter("currentCompany", v)} ph="e.g. Infosys, TCS..." />
        <Inp label="Project / Technology" val={filters.project} onChange={v => setFilter("project", v)} ph="e.g. React Native, ML..." />
        <Sel label="Gender" val={filters.gender} onChange={v => setFilter("gender", v)} opts={["Male", "Female", "Other"]} />
      </div>

      {/* Highest Education */}
      <div style={sectionStyle}>
        <p style={sectionLabelStyle}>Highest Education</p>
        <div style={rowStyleNoMargin}>
          <Sel label="Level" val={filters.education} onChange={v => setFilter("education", v)}
            opts={["Graduation", "Post Graduation", "Diploma", "10th", "12th", "PhD", "Certificate"]} />
          <Sel label="Degree" val={filters.degree} onChange={v => setFilter("degree", v)}
            opts={["BBA", "BCom", "BTech", "BE", "MBA", "BA", "MA", "MTech", "MSc", "BSc", "MCA", "BCA", "LLB", "BPharm", "MBBS", "BDS", "CA", "CS", "CFA"]} />
          <Sel label="Institute" val={filters.institute} onChange={v => setFilter("institute", v)}
            opts={["University of Lucknow", "Delhi University", "SRCC", "BIT Mesra", "AKTU", "IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta", "IIT Bombay", "IIT Delhi", "IIT Kanpur", "IIT Kharagpur", "NMIMS", "SIBM", "Jaypee Institute of Information Technology", "Calcutta University", "MAKAUT West Bengal", "Jadavpur University", "SRM University", "Shri Ram Swaroop Memorial University", "BBD University", "NIT Trichy", "NIT Warangal", "VIT Vellore", "Amity University", "BITS Pilani", "Symbiosis", "Christ University"]} />
        </div>
      </div>

      {/* Job Preferences */}
      <div style={sectionStyle}>
        <p style={sectionLabelStyle}>Job Preferences</p>
        <div style={rowStyleNoMargin}>
          <Sel label="Job Type" val={filters.jobType} onChange={v => setFilter("jobType", v)}
            opts={["Full Time", "Part Time", "Temporary", "Contract", "Internship", "Freelance", "Other"]} />
          <Sel label="Work Mode" val={filters.jobMode} onChange={v => setFilter("jobMode", v)}
            opts={["On-site", "Remote", "Hybrid"]} />
          <Sel label="Industry" val={filters.industry} onChange={v => setFilter("industry", v)}
            opts={["IT Services & IT Consulting", "Software Development", "Human Resource Services", "Banking & Finance", "E-commerce", "Healthcare", "EdTech", "Manufacturing", "Marketing & Advertising", "Legal Services", "Real Estate", "Logistics", "Retail", "Media & Entertainment", "Telecom", "Automotive", "Government / PSU"]} />
        </div>
      </div>

      {/* Candidate Freshness */}
      <div style={sectionStyle}>
        <p style={sectionLabelStyle}>Candidate Freshness</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[{ v: "all", l: "All" }, { v: "new", l: "New" }, { v: "week", l: "This week" }, { v: "month", l: "This month" }].map(opt => (
            <button
              key={opt.v}
              onClick={() => setFilter("candidateFreshness", opt.v)}
              style={{
                padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${filters.candidateFreshness === opt.v ? O : BORDER}`,
                backgroundColor: filters.candidateFreshness === opt.v ? O_LITE : "#fff",
                color: filters.candidateFreshness === opt.v ? O : "#475569",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 };
const fieldStyle = { width: "100%", padding: "8px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", backgroundColor: "#fff" };
const rowStyle = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 };
const rowStyleNoMargin = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 };
const sectionStyle = { borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginBottom: 16 };
const sectionLabelStyle = { fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" };
