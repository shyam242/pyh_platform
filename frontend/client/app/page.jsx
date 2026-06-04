"use client";
import { useState, useEffect } from "react";
import { Sparkles, Check, Users, Zap, Shield, TrendingUp, ArrowRight, Briefcase, Star, ChevronDown } from "lucide-react";

const O      = "#E87722";
const O_DARK = "#C0601A";
const O_LITE = "#FFF3E8";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState({ jobs: 0, candidates: 0, companies: 0 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Animate counters
  useEffect(() => {
    const targets = { jobs: 25, candidates: 1200, companies: 20};
    const duration = 1800;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount({
        jobs: Math.floor(ease * targets.jobs),
        candidates: Math.floor(ease * targets.candidates),
        companies: Math.floor(ease * targets.companies),
      });
      if (progress < 1) requestAnimationFrame(step);
    };
    const timer = setTimeout(() => requestAnimationFrame(step), 400);
    return () => clearTimeout(timer);
  }, []);

  const features = [
    { icon: Users,      title: "Smart Matching",       desc: "AI-powered candidate recommendations tailored to your job requirements and company culture." },
    { icon: Zap,        title: "Fast Pipeline",         desc: "Move candidates through hiring stages in minutes, not weeks. Keep momentum alive." },
    { icon: Shield,     title: "Verified Profiles",     desc: "Every candidate profile is verified. Trust every data point in your hiring process." },
    { icon: TrendingUp, title: "Real-time Analytics",   desc: "Track hiring metrics, team performance, and pipeline health with live dashboards." },
    { icon: Check,      title: "Seamless Integration",  desc: "Connects with your existing ATS, Slack, and other tools without friction." },
    { icon: Sparkles,   title: "AI-Powered Insights",   desc: "Get data-driven recommendations to reduce time-to-hire and improve quality." },
  ];

  const steps = [
    { n: "01", title: "Create your account", desc: "Sign up with your email. No password needed — OTP only." },
    { n: "02", title: "Complete your profile", desc: "Add your skills, experience, and upload your resume." },
    { n: "03", title: "Browse & apply",        desc: "Explore verified job openings that match your skills." },
    { n: "04", title: "Get hired",             desc: "Receive updates, get shortlisted, and land your dream role." },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, width: "100%", zIndex: 100,
        backgroundColor: "#fff",
        borderBottom: scrolled ? "1.5px solid #F0F0F4" : "1.5px solid transparent",
        boxShadow: scrolled ? "0 1px 12px rgba(0,0,0,0.05)" : "none",
        padding: "0 48px", height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}>
        <a href="/" style={{ fontSize: 19, fontWeight: 800, color: "#0f172a", textDecoration: "none", letterSpacing: "0.04em" }}>
          PICK<span style={{ color: O }}>YOUR</span>HIRE
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href="#features" style={{ fontSize: 14, fontWeight: 500, color: "#64748b", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = O)}
            onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
          >Features</a>
          <a href="#how-it-works" style={{ fontSize: 14, fontWeight: 500, color: "#64748b", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = O)}
            onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
          >How it works</a>
          <button
            onClick={() => (window.location.href = "/signin")}
            style={{ padding: "10px 24px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(232,119,34,0.28)", transition: "background-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = O_DARK)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = O)}
          >
            Get started
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: 68 }}>

        {/* HERO */}
        <section style={{ minHeight: "calc(100vh - 68px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* decorative bg blobs */}
          <div style={{ position: "absolute", top: "10%", left: "5%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,119,34,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "15%", right: "8%", width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,119,34,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ maxWidth: 760, position: "relative" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", backgroundColor: O_LITE, color: "#B35500", borderRadius: 999, fontSize: 13, fontWeight: 600, border: "1.5px solid #FBBF7A", marginBottom: 28 }}>
              <Sparkles size={13} /> Trusted by 50+ companies
            </span>

            <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 3.8rem)", fontWeight: 800, color: "#0f172a", lineHeight: 1.15, marginBottom: 24, letterSpacing: "-0.02em" }}>
              Hire Smarter With<br />
              <span style={{ color: O }}>Trust &amp; Speed</span>
            </h1>

            <p style={{ fontSize: 18, color: "#64748b", lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: "0 auto 40px" }}>
              Connect verified talent with top companies. AI-powered matching, real-time collaboration, and a hiring experience everyone loves.
            </p>

            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
              <button
                onClick={() => (window.location.href = "/signin")}
                style={{ padding: "14px 32px", backgroundColor: O, color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 6px 20px rgba(232,119,34,0.32)", transition: "background-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = O_DARK)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = O)}
              >
                Get started for free <ArrowRight size={18} />
              </button>
              <button
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                style={{ padding: "14px 28px", backgroundColor: "#fff", color: "#0f172a", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = O; e.currentTarget.style.color = O; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#0f172a"; }}
              >
                See how it works
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
              {[
                { value: `${count.jobs}+`,        label: "Active jobs" },
                { value: `${count.candidates.toLocaleString()}+`, label: "Candidates" },
                { value: `${count.companies}+`,   label: "Companies" },
              ].map(({ value, label }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: O }}>{value}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{ padding: "80px 48px", backgroundColor: "#F8FAFC" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: O, textTransform: "uppercase", letterSpacing: "0.1em" }}>Features</span>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 700, margin: "12px 0 16px", letterSpacing: "-0.02em" }}>Everything you need to hire better</h2>
              <p style={{ fontSize: 16, color: "#64748b", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
                A complete platform built for modern hiring teams and ambitious candidates.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} style={{ padding: "28px 28px", border: "1.5px solid #E5E7EB", borderRadius: 16, backgroundColor: "#fff", transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.07)"; e.currentTarget.style.borderColor = O; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#E5E7EB"; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: O_LITE, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                    <Icon size={22} color={O} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: "#0f172a" }}>{title}</h3>
                  <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{ padding: "80px 48px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: O, textTransform: "uppercase", letterSpacing: "0.1em" }}>Process</span>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 700, margin: "12px 0 16px", letterSpacing: "-0.02em" }}>Get hired in 4 steps</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
              {steps.map(({ n, title, desc }) => (
                <div key={n} style={{ textAlign: "center", padding: "28px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: O, marginBottom: 12, letterSpacing: "0.05em" }}>{n}</div>
                  <div style={{ width: 56, height: 3, backgroundColor: O, borderRadius: 999, margin: "0 auto 20px" }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: "#0f172a" }}>{title}</h3>
                  <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: "80px 48px" }}>
          <div style={{
            maxWidth: 760, margin: "0 auto", textAlign: "center",
            background: `linear-gradient(135deg, ${O} 0%, ${O_DARK} 100%)`,
            borderRadius: 24, padding: "60px 48px",
            boxShadow: "0 20px 60px rgba(232,119,34,0.25)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -60, left: -30, width: 200, height: 200, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
            <Briefcase size={40} color="rgba(255,255,255,0.7)" style={{ marginBottom: 20 }} />
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#fff", marginBottom: 16, letterSpacing: "-0.02em" }}>
              Ready to find your next opportunity?
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.82)", marginBottom: 36, lineHeight: 1.7 }}>
              Join thousands of candidates who found their dream jobs on PickYourHire.
            </p>
            <button
              onClick={() => (window.location.href = "/signin")}
              style={{ padding: "14px 36px", backgroundColor: "#fff", color: O, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", transition: "transform 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "none")}
            >
              Get started for free <ArrowRight size={18} />
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ backgroundColor: "#F8FAFC", borderTop: "1.5px solid #E5E7EB", padding: "32px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", letterSpacing: "0.04em" }}>
            PICK<span style={{ color: O }}>YOUR</span>HIRE
          </span>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
            &copy; {new Date().getFullYear()} PickYourHire. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy", "Terms", "Contact"].map(l => (
              <a key={l} href="#" style={{ fontSize: 13, color: "#64748b", textDecoration: "none", fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget.style.color = O)}
                onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
              >{l}</a>
            ))}
          </div>
        </footer>
      </main>
    </div>
  );
}
