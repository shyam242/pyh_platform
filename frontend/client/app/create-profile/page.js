"use client";
import { useState } from "react";
import { ArrowRight, Check, Users, User, Briefcase, ChevronRight } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { validateForm } from "@/utils/validation";

const O = "#E87722"; const O_LITE = "#FFF3E8"; const O_MID = "#FBBF7A";

const roleCards = [
  { id: "referrer",  title: "Referrer",   icon: Users,     desc: "Refer talented candidates and earn incentives for successful placements.",  perks: ["Earn referral bonuses", "Help your network grow", "Track your referrals"] },
  { id: "candidate", title: "Candidate",  icon: User,      desc: "Find verified job opportunities that match your skills and experience.",    perks: ["Browse 50+ jobs", "Get verified quickly", "AI-matched roles"] },
  { id: "recruiter", title: "Recruiter",  icon: Briefcase, desc: "Manage your hiring pipeline and connect with pre-verified candidates fast.", perks: ["Post unlimited jobs", "Verified candidate pool", "Analytics dashboard"] },
];

function InputField({ label, name, value, onChange, placeholder, type="text", error, required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        type={type} name={name} value={value || ""} onChange={onChange} placeholder={placeholder}
        style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: `1.5px solid ${error ? "#ef4444" : focused ? O : "#E5E7EB"}`, borderRadius: 9, outline: "none", backgroundColor: "#FAFAFA", color: "#0f172a", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
      {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

export default function CreateProfile() {
  const [name, setName]               = useState("");
  const [role, setRole]               = useState("");
  const [company, setCompany]         = useState("");
  const [experience, setExperience]   = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [phone, setPhone]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState({});
  const [step, setStep]               = useState(1); // 1=role, 2=details

  const handleChange = (setter) => (e) => setter(e.target.value);

  const goToDetails = () => {
    if (!role) { showError("Please select a role"); return; }
    setStep(2);
  };

  const submit = async () => {
    const validationErrors = validateForm({ name, role }, ["name", "role"]);
    if (role === "referrer") {
      if (!company)    validationErrors.company    = "Company name is required";
      if (!experience) validationErrors.experience = "Experience is required";
      if (!phone)      validationErrors.phone      = "Mobile number is required";
    }
    if (role === "recruiter") {
      if (!companyName) validationErrors.companyName = "Company name is required";
      if (!phone)       validationErrors.phone       = "Phone number is required";
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Object.values(validationErrors).forEach(err => showError(err));
      return;
    }
    setLoading(true);
    try {
      const email = localStorage.getItem("email");
      if (!email) { showError("Email not found. Please sign in again."); window.location.href = "/signin"; return; }
      const payload = { name, role, email, company, experience, phone };
      if (role === "recruiter") { payload.company_name = companyName; payload.company_website = companyWebsite; }
      const res = await fetch("http://localhost:5000/api/profile/create", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create profile");
      const data = await res.json();
      localStorage.setItem("token", data.token);
      showSuccess("Profile created! Redirecting to your dashboard...");
      setTimeout(() => { window.location.href = "/dashboard"; }, 800);
    } catch (err) { showError(err.message || "Failed to create profile"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>
      {/* NAV */}
      <nav style={{ backgroundColor: "#fff", borderBottom: "1.5px solid #E5E7EB", padding: "0 48px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "0.04em" }}>PICK<span style={{ color: O }}>YOUR</span>HIRE</span>
        <a href="/signin" style={{ fontSize: 13, color: "#64748b", textDecoration: "none", fontWeight: 500 }}
          onMouseEnter={e => (e.currentTarget.style.color = O)} onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
          &larr; Back to sign in
        </a>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 64px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 24 }}>
            {["Choose role", "Your details"].map((label, i) => {
              const s = i + 1;
              const active = step === s; const done = step > s;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, backgroundColor: done ? "#3B6D11" : active ? O : "#F1F5F9", color: done || active ? "#fff" : "#94a3b8" }}>
                    {done ? <Check size={14} /> : s}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: active ? O : done ? "#3B6D11" : "#94a3b8" }}>{label}</span>
                  {i === 0 && <ChevronRight size={14} color="#cbd5e1" />}
                </div>
              );
            })}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>
            {step === 1 ? "How will you use PickYourHire?" : "Complete your profile"}
          </h1>
          <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
            {step === 1 ? "Select the role that best describes you." : "Just a few more details to get you started."}
          </p>
        </div>

        {/* STEP 1: Role selection */}
        {step === 1 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18, marginBottom: 32 }}>
              {roleCards.map(({ id, title, icon: Icon, desc, perks }) => {
                const selected = role === id;
                return (
                  <button key={id} onClick={() => setRole(id)} style={{
                    padding: "28px 24px", border: `2px solid ${selected ? O : "#E5E7EB"}`,
                    borderRadius: 16, backgroundColor: selected ? O_LITE : "#fff",
                    cursor: "pointer", textAlign: "left", transition: "all 0.18s",
                    boxShadow: selected ? `0 0 0 4px rgba(232,119,34,0.12)` : "none",
                  }}
                    onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = O_MID; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.07)"; } }}
                    onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; } }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: selected ? O : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, transition: "background-color 0.18s" }}>
                      <Icon size={24} color={selected ? "#fff" : "#64748b"} />
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>{title}</h3>
                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 16, margin: "0 0 16px" }}>{desc}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {perks.map(p => (
                        <div key={p} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: selected ? "#B35500" : "#64748b", fontWeight: 500 }}>
                          <Check size={12} color={selected ? O : "#94a3b8"} /> {p}
                        </div>
                      ))}
                    </div>
                    {selected && <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: O }}><Check size={14} /> Selected</div>}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button onClick={goToDetails} style={{ padding: "13px 36px", backgroundColor: role ? O : "#F1F5F9", color: role ? "#fff" : "#94a3b8", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: role ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", boxShadow: role ? "0 4px 14px rgba(232,119,34,0.28)" : "none", transition: "background-color 0.15s" }}>
                Continue <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Details */}
        {step === 2 && (
          <div style={{ backgroundColor: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 18, padding: "36px 36px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, paddingBottom: 20, borderBottom: "1.5px solid #F1F5F9" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: O_LITE, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(() => { const C = roleCards.find(r => r.id === role)?.icon || User; return <C size={20} color={O} />; })()}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{roleCards.find(r => r.id === role)?.title} account</div>
                <button onClick={() => setStep(1)} style={{ fontSize: 12, color: O, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Change role</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
              <InputField label="Full name" name="name" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" required error={errors.name} />
              <InputField label="Mobile number" name="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" required={role !== "candidate"} error={errors.phone} />

              {role === "referrer" && (
                <>
                  <InputField label="Current company" name="company" value={company} onChange={e => setCompany(e.target.value)} placeholder="Tech Corp Ltd" required error={errors.company} />
                  <InputField label="Years of experience" name="experience" value={experience} onChange={e => setExperience(e.target.value)} placeholder="5" type="number" required error={errors.experience} />
                </>
              )}
              {role === "recruiter" && (
                <>
                  <InputField label="Company name" name="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your Company Ltd" required error={errors.companyName} />
                  <InputField label="Company website" name="companyWebsite" value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="https://yourcompany.com" error={errors.companyWebsite} />
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ padding: "12px 24px", border: "1.5px solid #E5E7EB", borderRadius: 10, backgroundColor: "#fff", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Back
              </button>
              <button onClick={submit} disabled={loading} style={{ flex: 1, padding: "12px 24px", backgroundColor: loading ? O_LITE : O, color: loading ? "#B35500" : "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 4px 14px rgba(232,119,34,0.28)", transition: "background-color 0.15s" }}>
                {loading ? "Creating account..." : <><span>Create my account</span><ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}