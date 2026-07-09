"use client";
import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Check, Users, User, Briefcase, ShieldCheck, BadgeCheck, Trophy, Phone, Building2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { validateForm } from "@/utils/validation";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722"; const O_LITE = "#FFF3E8"; const O_MID = "#FBBF7A";

const roleCards = [
  {
    id: "referrer", title: "Referrer", icon: Users,
    desc: "Refer talented candidates and earn incentives for successful placements.",
    perks: ["Earn referral bonuses", "Help your network grow", "Track your referrals"],
    color: "#E87722", lite: "#FFF3E8", mid: "#FBBF7A",
  },
  {
    id: "candidate", title: "Candidate", icon: User,
    desc: "Find verified job opportunities that match your skills and experience.",
    perks: ["Browse 50+ jobs", "Get verified quickly", "AI-matched roles"],
    color: "#7C3AED", lite: "#F3E8FF", mid: "#C4B5FD",
  },
  {
    id: "recruiter", title: "Recruiter", icon: Briefcase,
    desc: "Manage your hiring pipeline and connect with pre-verified candidates fast.",
    perks: ["Post unlimited jobs", "Verified candidate pool", "Analytics dashboard"],
    color: "#2563EB", lite: "#EFF6FF", mid: "#93C5FD",
  },
];

function InputField({ label, name, value, onChange, placeholder, type = "text", error, required, icon: Icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: focused ? O : "#94a3b8", pointerEvents: "none" }} />
        )}
        <input
          type={type} name={name} value={value || ""} onChange={onChange} placeholder={placeholder}
          style={{ width: "100%", padding: `11px 14px 11px ${Icon ? 40 : 14}px`, fontSize: 14, border: `1.5px solid ${error ? "#ef4444" : focused ? O : "#E5E7EB"}`, borderRadius: 9, outline: "none", backgroundColor: "#FAFAFA", color: "#0f172a", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
      </div>
      {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, error, required, icon: Icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: focused ? O : "#94a3b8", pointerEvents: "none" }} />
        )}
        <select
          name={name} value={value || ""} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: "100%", padding: `11px 14px 11px ${Icon ? 40 : 14}px`, fontSize: 14, border: `1.5px solid ${error ? "#ef4444" : focused ? O : "#E5E7EB"}`, borderRadius: 9, outline: "none", backgroundColor: "#FAFAFA", color: value ? "#0f172a" : "#94a3b8", fontFamily: "inherit", boxSizing: "border-box", appearance: "none", cursor: "pointer" }}
        >
          <option value="" disabled>Select...</option>
          {options.map(o => <option key={o} value={o} style={{ color: "#0f172a" }}>{o}</option>)}
        </select>
      </div>
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

  // Prefill from referral flow
  useEffect(() => {
    const referralRole  = localStorage.getItem("referral_role");
    const referralName  = localStorage.getItem("referral_name");
    const referralPhone = localStorage.getItem("referral_phone");
    if (referralRole) {
      setRole(referralRole);
      setStep(2); // Skip role selection, go straight to details
      if (referralName)  setName(referralName);
      if (referralPhone) setPhone(referralPhone);
      // Clean up referral flags
      localStorage.removeItem("referral_role");
      localStorage.removeItem("referral_name");
      localStorage.removeItem("referral_phone");
    }
  }, []);

  const selectRole = (id) => { setRole(id); setStep(2); };

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
      const res = await fetch(`${API_BASE_URL}/api/profile/create`, {
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

  const activeRole = roleCards.find(r => r.id === role);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a", position: "relative", overflow: "hidden" }}>
      {/* Decorative background */}
      <div style={{ position: "absolute", top: 90, left: 20, width: 90, height: 90, backgroundImage: "radial-gradient(circle, #CBD5E1 1.5px, transparent 1.5px)", backgroundSize: "14px 14px", opacity: 0.6, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -120, right: -120, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,119,34,0.07), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -140, left: -100, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.06), transparent 70%)", pointerEvents: "none" }} />

      {/* NAV */}
      <nav style={{ backgroundColor: "#fff", borderBottom: "1.5px solid #E5E7EB", padding: "0 48px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "0.04em" }}>PICK<span style={{ color: O }}>YOUR</span>HIRE</span>
        <a href="/signin" style={{ fontSize: 13, color: "#64748b", textDecoration: "none", fontWeight: 500 }}
          onMouseEnter={e => (e.currentTarget.style.color = O)} onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
          &larr; Back to sign in
        </a>
      </nav>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px 64px", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 24 }}>
            {["Choose role", "Your details"].map((label, i) => {
              const s = i + 1;
              const active = step === s; const done = step > s;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, backgroundColor: done ? "#22C55E" : active ? O : "#F1F5F9", color: done || active ? "#fff" : "#94a3b8", flexShrink: 0 }}>
                      {done ? <Check size={13} /> : s}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? O : done ? "#16A34A" : "#94a3b8" }}>{label}</span>
                  </div>
                  {i === 0 && <div style={{ width: 40, height: 2, backgroundColor: step > 1 ? "#22C55E" : "#E5E7EB", borderRadius: 2 }} />}
                </div>
              );
            })}
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            {step === 1 ? <>Welcome to <span>Pick<span style={{ color: O }}>Your</span>Hire</span></> : "Complete your profile"}
          </h1>
          <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
            {step === 1 ? "Select your role to access a personalized experience." : "Just a few more details to get you started."}
          </p>
        </div>

        {/* STEP 1: Role selection */}
        {step === 1 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 36, maxWidth: 980, margin: "0 auto 36px" }}>
              {roleCards.map(({ id, title, icon: Icon, desc, perks, color, lite, mid }) => (
                <div key={id} style={{
                  padding: "26px 24px", border: `1.5px solid #E5E7EB`, borderTop: `4px solid ${color}`,
                  borderRadius: 16, backgroundColor: "#fff", transition: "all 0.18s", display: "flex", flexDirection: "column",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 26px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: lite, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                    <Icon size={24} color={color} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>{title}</h3>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 16px" }}>{desc}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 22, flex: 1 }}>
                    {perks.map(p => (
                      <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", fontWeight: 500 }}>
                        <Check size={13} color={color} /> {p}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => selectRole(id)} style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px 20px", backgroundColor: color, color: "#fff", border: "none",
                    borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    boxShadow: `0 4px 14px ${color}33`,
                  }}>
                    Select role <ArrowRight size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Trust bar */}
            <div style={{ maxWidth: 820, margin: "0 auto", backgroundColor: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 16, padding: "22px 28px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
              {[
                { icon: ShieldCheck, color: "#2563EB", title: "Secure", desc: "Your data is protected at every step" },
                { icon: BadgeCheck,  color: "#16A34A", title: "Trusted", desc: "Used by thousands of professionals and companies" },
                { icon: Trophy,      color: O,         title: "Built for results", desc: "Helping people connect and careers grow" },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <Icon size={20} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{title}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Details */}
        {step === 2 && (
          <div style={{ maxWidth: 760, margin: "0 auto", backgroundColor: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 18, padding: "36px 36px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, paddingBottom: 20, borderBottom: "1.5px solid #F1F5F9" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: activeRole?.lite || O_LITE, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(() => { const C = activeRole?.icon || User; return <C size={20} color={activeRole?.color || O} />; })()}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{activeRole?.title} account</div>
                <button onClick={() => setStep(1)} style={{ fontSize: 12, color: activeRole?.color || O, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                  Change role <ArrowRight size={11} />
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
              <InputField label="Full name" name="name" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" required error={errors.name} icon={User} />
              <InputField label="Mobile number" name="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" required={role !== "candidate"} error={errors.phone} icon={Phone} />

              {role === "referrer" && (
                <>
                  <InputField label="Current company" name="company" value={company} onChange={e => setCompany(e.target.value)} placeholder="Tech Corp Ltd" required error={errors.company} icon={Building2} />
                  <SelectField label="Years of experience" name="experience" value={experience} onChange={e => setExperience(e.target.value)} required error={errors.experience} icon={Briefcase}
                    options={Array.from({ length: 21 }, (_, i) => String(i))} />
                </>
              )}
              {role === "recruiter" && (
                <>
                  <InputField label="Company name" name="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your Company Ltd" required error={errors.companyName} icon={Building2} />
                  <InputField label="Company website" name="companyWebsite" value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="https://yourcompany.com" error={errors.companyWebsite} />
                </>
              )}
            </div>

            {/* Security note */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, backgroundColor: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 12, padding: "16px 18px", marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ShieldCheck size={16} color="#7C3AED" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#4C1D95" }}>Your information is safe with us</div>
                <div style={{ fontSize: 12, color: "#6D28D9", marginTop: 2, lineHeight: 1.5 }}>We use industry-standard security to protect your data and privacy.</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ padding: "12px 24px", border: "1.5px solid #E5E7EB", borderRadius: 10, backgroundColor: "#fff", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                <ArrowLeft size={15} /> Back
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
