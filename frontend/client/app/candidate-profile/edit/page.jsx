"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, User, Briefcase, MapPin, GraduationCap, Award, Sparkles, Check } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O       = "#E87722";
const O_LITE  = "#FFF3E8";
const O_MID   = "#FBBF7A";

function SectionHeader({ title, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${O_LITE}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: O_LITE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: O }}>{icon}</span>
      </div>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{title}</h2>
    </div>
  );
}

function InputField({ label, name, value, onChange, placeholder, type = "text", required, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 0 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 5 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        type={type} name={name} value={value || ""} onChange={onChange} placeholder={placeholder}
        style={{
          width: "100%", padding: "9px 12px", fontSize: 13,
          border: `0.5px solid ${focused ? O : "#E5E7EB"}`,
          borderRadius: 8, outline: "none", backgroundColor: "#fff",
          color: "#0f172a", fontFamily: "inherit", boxSizing: "border-box",
          transition: "border-color 0.15s",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>{hint}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, placeholder, required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 5 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <select
        name={name} value={value || ""} onChange={onChange}
        style={{
          width: "100%", padding: "9px 12px", fontSize: 13,
          border: `0.5px solid ${focused ? O : "#E5E7EB"}`,
          borderRadius: 8, outline: "none", backgroundColor: "#fff",
          color: value ? "#0f172a" : "#94a3b8", fontFamily: "inherit", boxSizing: "border-box",
          cursor: "pointer",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <option value="">{placeholder || "Select..."}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, placeholder, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 5 }}>{label}</label>
      <textarea
        name={name} value={value || ""} onChange={onChange} placeholder={placeholder}
        style={{
          width: "100%", padding: "9px 12px", fontSize: 13,
          border: `0.5px solid ${focused ? O : "#E5E7EB"}`,
          borderRadius: 8, outline: "none", backgroundColor: "#fff",
          color: "#0f172a", fontFamily: "inherit", boxSizing: "border-box",
          minHeight: 80, resize: "vertical",
          transition: "border-color 0.15s",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>{hint}</p>}
    </div>
  );
}

const QUALIFICATIONS = ["10th", "12th", "Bachelor's", "Master's", "PhD", "Diploma", "Certificate"];
const NOTICE_PERIODS = ["Immediate", "15 days", "30 days", "60 days", "90 days"];

export default function EditCandidateProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    job_role: "", contact: "", skills: "", cctc: "", ectc: "",
    current_location: "", preferred_location: "", notice_period: "",
    offer_in_hand: "No", reason_for_change: "", current_company_name: "",
    highest_qualification: "", address_aadhaar: "", technical_skills: "",
    soft_skills: "", linkedin_profile: "",
  });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/api/profile/candidate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      setFormData(await res.json());
    } catch (err) { showError(err.message || "Failed to load profile"); }
    finally { setLoading(false); }
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async e => {
    e.preventDefault();
    if (!formData.job_role || !formData.contact || !formData.current_location || !formData.preferred_location) {
      showError("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/profile/candidate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      showSuccess("Profile updated successfully!");
      setSaved(true);
      setTimeout(() => { setSaved(false); router.push("/candidate-profile"); }, 1200);
    } catch (err) { showError(err.message || "Failed to update profile"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F5F6FA" }}>
      <p style={{ fontSize: 14, color: "#64748b" }}>Loading profile...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F6FA", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        backgroundColor: "#fff", borderBottom: "0.5px solid #E5E7EB",
        padding: "0 28px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.06em" }}>
          PICK<span style={{ color: O }}>YOUR</span>HIRE
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.back()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "0.5px solid #E5E7EB", backgroundColor: "#fff", fontSize: 13, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}
          >
            <ArrowLeft size={14} /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 18px", borderRadius: 8, border: "none",
              backgroundColor: saved ? "#3B6D11" : saving ? "#FBBF7A" : O,
              color: "#fff", fontSize: 13, fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
              transition: "background-color 0.2s",
            }}
          >
            {saved ? <><Check size={14} /> Saved!</> : saving ? "Saving..." : <><Save size={14} /> Save changes</>}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: "28px auto", padding: "0 24px 48px" }}>

        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Edit profile</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>Fields marked with * are required.</p>
        </div>

        <form onSubmit={handleSave}>

          {/* Personal */}
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "24px 24px 20px", border: "0.5px solid #E5E7EB", marginBottom: 16 }}>
            <SectionHeader title="Personal information" icon={<User size={16} />} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <InputField label="Contact number" name="contact" value={formData.contact} onChange={handleChange} placeholder="+91 98765 43210" required />
              <InputField label="LinkedIn profile" name="linkedin_profile" value={formData.linkedin_profile} onChange={handleChange} placeholder="https://linkedin.com/in/yourprofile" type="url" />
              <TextAreaField label="Address (as per Aadhaar)" name="address_aadhaar" value={formData.address_aadhaar} onChange={handleChange} placeholder="Enter your full address" />
              <SelectField label="Highest qualification" name="highest_qualification" value={formData.highest_qualification} onChange={handleChange} options={QUALIFICATIONS} placeholder="Select qualification" />
            </div>
          </div>

          {/* Professional */}
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "24px 24px 20px", border: "0.5px solid #E5E7EB", marginBottom: 16 }}>
            <SectionHeader title="Professional details" icon={<Briefcase size={16} />} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <InputField label="Job role" name="job_role" value={formData.job_role} onChange={handleChange} placeholder="e.g. Frontend Developer" required />
              <InputField label="Current company" name="current_company_name" value={formData.current_company_name} onChange={handleChange} placeholder="e.g. Tech Corp Ltd" />
              <InputField label="Current CTC (LPA)" name="cctc" value={formData.cctc} onChange={handleChange} placeholder="e.g. 8" hint="In lakhs per annum" />
              <InputField label="Expected CTC (LPA)" name="ectc" value={formData.ectc} onChange={handleChange} placeholder="e.g. 12" hint="In lakhs per annum" />
              <SelectField label="Notice period" name="notice_period" value={formData.notice_period} onChange={handleChange} options={NOTICE_PERIODS} placeholder="Select notice period" />
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 5 }}>Offer in hand</label>
                <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                  {["Yes", "No"].map(opt => (
                    <label
                      key={opt}
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "8px 16px", borderRadius: 8,
                        border: `0.5px solid ${formData.offer_in_hand === opt ? O_MID : "#E5E7EB"}`,
                        backgroundColor: formData.offer_in_hand === opt ? O_LITE : "#F8FAFC",
                        cursor: "pointer", fontSize: 13,
                        color: formData.offer_in_hand === opt ? "#B35500" : "#64748b",
                        fontWeight: formData.offer_in_hand === opt ? 500 : 400,
                      }}
                    >
                      <input
                        type="radio" name="offer_in_hand" value={opt}
                        checked={formData.offer_in_hand === opt}
                        onChange={handleChange}
                        style={{ accentColor: O }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "24px 24px 20px", border: "0.5px solid #E5E7EB", marginBottom: 16 }}>
            <SectionHeader title="Location preferences" icon={<MapPin size={16} />} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <InputField label="Current location" name="current_location" value={formData.current_location} onChange={handleChange} placeholder="e.g. Mumbai, Maharashtra" required />
              <InputField label="Preferred location" name="preferred_location" value={formData.preferred_location} onChange={handleChange} placeholder="e.g. Bangalore, Remote" required />
            </div>
          </div>

          {/* Skills */}
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "24px 24px 20px", border: "0.5px solid #E5E7EB", marginBottom: 16 }}>
            <SectionHeader title="Skills" icon={<Sparkles size={16} />} />
            <div style={{ display: "grid", gap: 14 }}>
              <TextAreaField
                label="General skills (comma-separated)"
                name="skills" value={formData.skills} onChange={handleChange}
                placeholder="e.g. Leadership, Project Management, Communication"
                hint="Soft and interpersonal skills"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <TextAreaField
                  label="Technical skills (comma-separated)"
                  name="technical_skills" value={formData.technical_skills} onChange={handleChange}
                  placeholder="e.g. Python, JavaScript, React, Node.js"
                />
                <TextAreaField
                  label="Soft skills (comma-separated)"
                  name="soft_skills" value={formData.soft_skills} onChange={handleChange}
                  placeholder="e.g. Communication, Teamwork, Problem Solving"
                />
              </div>
            </div>
          </div>

          {/* Additional */}
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "24px 24px 20px", border: "0.5px solid #E5E7EB", marginBottom: 24 }}>
            <SectionHeader title="Additional information" icon={<Award size={16} />} />
            <TextAreaField
              label="Reason for change"
              name="reason_for_change" value={formData.reason_for_change} onChange={handleChange}
              placeholder="Why are you looking for a new opportunity?"
            />
          </div>

          {/* Bottom save bar */}
          <div style={{
            display: "flex", gap: 10, justifyContent: "flex-end",
            padding: "16px 20px", backgroundColor: "#fff",
            borderRadius: 12, border: "0.5px solid #E5E7EB",
          }}>
            <button
              type="button" onClick={() => router.back()}
              style={{ padding: "9px 20px", borderRadius: 8, border: "0.5px solid #E5E7EB", backgroundColor: "#F8FAFC", color: "#475569", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 24px", borderRadius: 8, border: "none",
                backgroundColor: saved ? "#3B6D11" : saving ? O_MID : O,
                color: "#fff", fontSize: 13, fontWeight: 500,
                cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}
            >
              {saved ? <><Check size={14} /> Saved!</> : saving ? "Saving..." : <><Save size={14} /> Save changes</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
