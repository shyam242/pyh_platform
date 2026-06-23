"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Users, ArrowRight, Shield, CheckCircle, Zap } from "lucide-react";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722";
const O_LITE = "#FFF3E8";

export default function JoinPage() {
  const params = useParams();
  const token = params.token;

  const [status, setStatus] = useState("loading"); // loading | valid | invalid
  const [referrer, setReferrer] = useState(null);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    // Store magic token in sessionStorage so signin page can read it
    sessionStorage.setItem("magic_token", token);

    fetch(`${API_BASE_URL}/api/auth/magic-link/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setReferrer(data);
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const proceed = () => {
    window.location.href = `/signin?invite=${token}`;
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid #FFF3E8", borderTop: `3px solid ${O}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#64748b", fontSize: 15 }}>Validating your invite...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: "#F8FAFC" }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <span style={{ fontSize: 28 }}>🔗</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Invalid invite link</h1>
          <p style={{ fontSize: 15, color: "#64748b", margin: "0 0 28px" }}>This invite link is invalid or has expired. Please ask your referrer for a new link.</p>
          <a href="/signin" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", backgroundColor: O, color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: "#ffffff" }}>

      {/* LEFT — brand panel */}
      <div style={{
        width: "44%", flexShrink: 0,
        background: `linear-gradient(145deg, #E87722 0%, #C0601A 60%, #8B3A0A 100%)`,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "48px 52px", position: "relative", overflow: "hidden",
      }}>
        {[["-60px", "-60px", 260, "top", "right"], ["40px", "-80px", 200, "bottom", "left"], ["40%", "-40px", 120, "top", "right"]].map(([t, l, s, tp, lr], i) => (
          <div key={i} style={{ position: "absolute", [tp]: t, [lr]: l, width: s, height: s, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
        ))}

        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "0.04em" }}>
          PICK<span style={{ opacity: 0.7 }}>YOUR</span>HIRE
        </div>

        <div>
          <h2 style={{ fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1.25, margin: "0 0 20px" }}>
            You've been invited to refer talent
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.78)", lineHeight: 1.7, margin: "0 0 32px", maxWidth: 340 }}>
            Join PickYourHire as a referrer. Refer great candidates, earn incentives, and help people find amazing opportunities.
          </p>
          {[
            { icon: Users, text: "Refer candidates from your network" },
            { icon: Zap, text: "Instant dashboard to track referrals" },
            { icon: Shield, text: "Earn bonuses on successful placements" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={17} color="#fff" />
              </div>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,0.88)", fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>
          &copy; {new Date().getFullYear()} PickYourHire. All rights reserved.
        </p>
      </div>

      {/* RIGHT — invite card */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Invited by card */}
          <div style={{ backgroundColor: O_LITE, border: "1.5px solid #FBBF7A", borderRadius: 14, padding: "20px 22px", marginBottom: 32, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
              {(referrer?.referrer_name || "R").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#C2410C", fontWeight: 600, marginBottom: 2 }}>You were invited by</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{referrer?.referrer_name}</div>
              {referrer?.referrer_company && <div style={{ fontSize: 13, color: "#64748b" }}>{referrer.referrer_company}</div>}
            </div>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
            Join as a Referrer
          </h1>
          <p style={{ fontSize: 15, color: "#64748b", margin: "0 0 28px", lineHeight: 1.6 }}>
            Create your free account in seconds — just verify your email. No role selection needed, you'll join directly as a referrer.
          </p>

          {/* What happens next */}
          <div style={{ backgroundColor: "#F8FAFC", borderRadius: 12, padding: "18px 20px", marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>What happens next</div>
            {[
              { step: "1", text: "Enter your email and verify with OTP" },
              { step: "2", text: "Complete your referrer profile" },
              { step: "3", text: "Start referring candidates and earning" },
            ].map(({ step, text }) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{step}</div>
                <span style={{ fontSize: 14, color: "#475569" }}>{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={proceed}
            style={{ width: "100%", padding: "14px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(232,119,34,0.28)", marginBottom: 12 }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#C0601A"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = O}
          >
            <span>Get started — Verify my email</span>
            <ArrowRight size={17} />
          </button>

          <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", margin: 0 }}>
            Already have an account? <a href="/signin" style={{ color: O, textDecoration: "none", fontWeight: 600 }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
