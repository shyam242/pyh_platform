"use client";
import { useState, useEffect, useRef } from "react";
import { Mail, ArrowRight, Shield, Zap, Users, CheckCircle, RefreshCw, HandCoins } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { validateEmail, validateOTP } from "@/utils/validation";

const O = "#E87722";
const O_LITE = "#FFF3E8";

export default function Signin() {
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState(["","","","","",""]);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const [resendTimer, setResendTimer] = useState(0);
  const [emailFocused, setEmailFocused] = useState(false);
  const otpRefs = useRef([]);

  // countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const sendOtp = async () => {
    setErrors({});
    if (!email) { setErrors({ email: "Email is required" }); return; }
    if (!validateEmail(email)) { setErrors({ email: "Enter a valid email address" }); return; }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to send OTP");
      setOtpSent(true);
      setResendTimer(60);
      showSuccess("OTP sent to your email");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) { showError(err.message || "Failed to send OTP"); }
    finally { setLoading(false); }
  };

  const handleOtpInput = (i, val) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  const otpString = otp.join("");

  const verify = async () => {
    setErrors({});
    if (otpString.length !== 6) { setErrors({ otp: "Enter all 6 digits" }); return; }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpString }),
      });
      const rawText = await res.text();
      let data = null;
      try { data = JSON.parse(rawText); } catch {}
      if (!res.ok) throw new Error(data?.message || data?.error || rawText || `Error ${res.status}`);
      if (data.newUser) {
        localStorage.setItem("email", email);
        showSuccess("Account created! Complete your profile.");
        window.location.href = "/create-profile";
        return;
      }
      localStorage.setItem("token", data.token);
      showSuccess("Signed in successfully!");
      window.location.href = data.isAdmin ? "/admin" : "/dashboard";
    } catch (err) { showError(err.message || "Verification failed"); }
    finally { setLoading(false); }
  };

  const resend = async () => {
    if (resendTimer > 0) return;
    setOtp(["","","","","",""]);
    setErrors({});
    await sendOtp();
  };

  const perks = [
    { icon: Shield, text: "Secure Talent Pool" },
    { icon: Zap,    text: "Instant access to jobs" },
    { icon: Users,  text: "Connect with top companies" },
    { icon: HandCoins, text: "Earn referral bonuses" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: "#ffffff" }}>

      {/* LEFT — brand panel */}
      <div style={{
        width: "44%", flexShrink: 0,
        background: `linear-gradient(145deg, #E87722 0%, #C0601A 60%, #8B3A0A 100%)`,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "48px 52px", position: "relative", overflow: "hidden",
      }}>
        {/* decorative circles */}
        {[["top:-60px", "right:-60px", 260], ["bottom:40px", "left:-80px", 200], ["top:40%", "right:-40px", 120]].map(([t, l, s], i) => (
          <div key={i} style={{ position: "absolute", [t.split(":")[0]]: t.split(":")[1], [l.split(":")[0]]: l.split(":")[1], width: s, height: s, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
        ))}

        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "0.04em", marginBottom: 56 }}>
            PICK<span style={{ opacity: 0.7 }}>YOUR</span>HIRE
          </div>
          <h2 style={{ fontSize: 38, fontWeight: 700, color: "#fff", lineHeight: 1.25, margin: "0 0 20px" }}>
            Your next big opportunity starts here
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.78)", lineHeight: 1.7, margin: 0, maxWidth: 340 }}>
            Join thousands of candidates and companies using PickYourHire to hire smarter and faster.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {perks.map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color="#fff" />
              </div>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,0.88)", fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>
          &copy; {new Date().getFullYear()} PickYourHire. All rights reserved.
        </p>
      </div>

      {/* RIGHT — form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* back link */}
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", textDecoration: "none", marginBottom: 40, fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.color = O)}
            onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
          >
            &larr; Back to home
          </a>

          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
              {otpSent ? "Check your inbox" : "Welcome back"}
            </h1>
            <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
              {otpSent
                ? `We sent a 6-digit code to ${email}`
                : "Sign in with your email. No password needed."}
            </p>
          </div>

          {/* step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
            {[{ n: 1, label: "Email" }, { n: 2, label: "Verify" }].map(({ n, label }, i) => {
              const active = otpSent ? n === 2 : n === 1;
              const done   = otpSent && n === 1;
              return (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, backgroundColor: done ? "#3B6D11" : active ? O : "#F1F5F9", color: done || active ? "#fff" : "#94a3b8" }}>
                    {done ? <CheckCircle size={14} /> : n}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: active ? O : done ? "#3B6D11" : "#94a3b8" }}>{label}</span>
                  {i === 0 && <div style={{ width: 40, height: 2, backgroundColor: otpSent ? "#3B6D11" : "#F1F5F9", borderRadius: 1 }} />}
                </div>
              );
            })}
          </div>

          {!otpSent ? (
            // Step 1: Email
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Email address
              </label>
              <div style={{ position: "relative", marginBottom: 8 }}>
                <Mail size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: emailFocused ? O : "#94a3b8", pointerEvents: "none", transition: "color 0.15s" }} />
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setErrors({}); }}
                  onKeyDown={e => e.key === "Enter" && sendOtp()}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="you@company.com"
                  style={{
                    width: "100%", padding: "13px 14px 13px 42px",
                    fontSize: 15, border: `1.5px solid ${errors.email ? "#ef4444" : emailFocused ? O : "#E5E7EB"}`,
                    borderRadius: 10, outline: "none", boxSizing: "border-box",
                    backgroundColor: "#FAFAFA", color: "#0f172a", fontFamily: "inherit",
                    transition: "border-color 0.15s",
                  }}
                />
              </div>
              {errors.email && <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 4 }}>{errors.email}</p>}

              <button
                onClick={sendOtp} disabled={loading}
                style={{ width: "100%", padding: "14px", marginTop: 8, backgroundColor: loading ? O_LITE : O, color: loading ? "#B35500" : "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", transition: "background-color 0.15s" }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = "#C0601A"; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = O; }}
              >
                {loading ? "Sending code..." : <><span>Send verification code</span><ArrowRight size={17} /></>}
              </button>

              <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", marginTop: 20 }}>
                New here? An account is created automatically.
              </p>
            </div>
          ) : (
            // Step 2: OTP
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 14 }}>
                6-digit verification code
              </label>

              {/* OTP boxes */}
              <div style={{ display: "flex", gap: 8, marginBottom: 8, width: "100%" }} onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i} ref={el => (otpRefs.current[i] = el)}
                    type="text" inputMode="numeric" maxLength={1}
                    value={digit}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    style={{
                      width: 0, flex: "1 1 0", minWidth: 0,
                      height: 52, textAlign: "center", fontSize: 20, fontWeight: 700,
                      border: `1.5px solid ${errors.otp ? "#ef4444" : digit ? O : "#E5E7EB"}`,
                      borderRadius: 10, outline: "none", backgroundColor: digit ? O_LITE : "#FAFAFA",
                      color: "#0f172a", fontFamily: "monospace", transition: "all 0.15s",
                      boxSizing: "border-box",
                    }}
                    onFocus={e => (e.target.style.borderColor = O)}
                    onBlur={e => (e.target.style.borderColor = digit ? O : "#E5E7EB")}
                  />
                ))}
              </div>
              {errors.otp && <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 12px" }}>{errors.otp}</p>}

              {/* Resend row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 10 }}>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Didn&apos;t receive it?</p>
                <button
                  onClick={resend} disabled={resendTimer > 0}
                  style={{ fontSize: 13, fontWeight: 600, color: resendTimer > 0 ? "#94a3b8" : O, background: "none", border: "none", cursor: resendTimer > 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}
                >
                  <RefreshCw size={13} />
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                </button>
              </div>

              <button
                onClick={verify} disabled={loading || otpString.length !== 6}
                style={{ width: "100%", padding: "14px", backgroundColor: loading || otpString.length !== 6 ? "#F1F5F9" : O, color: loading || otpString.length !== 6 ? "#94a3b8" : "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading || otpString.length !== 6 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", marginBottom: 12, transition: "background-color 0.15s" }}
                onMouseEnter={e => { if (!loading && otpString.length === 6) e.currentTarget.style.backgroundColor = "#C0601A"; }}
                onMouseLeave={e => { if (!loading && otpString.length === 6) e.currentTarget.style.backgroundColor = O; }}
              >
                {loading ? "Verifying..." : <><span>Verify and sign in</span><ArrowRight size={17} /></>}
              </button>

              <button
                onClick={() => { setOtpSent(false); setOtp(["","","","","",""]); setErrors({}); }}
                style={{ width: "100%", padding: "12px", backgroundColor: "#fff", color: "#475569", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = O)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#E5E7EB")}
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}