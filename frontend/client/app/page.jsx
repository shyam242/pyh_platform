"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Check,
  Users,
  Zap,
  Shield,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#000" }}>
      {/* NAVBAR */}
      <nav style={{
        position: "fixed",
        top: 0,
        width: "100%",
        zIndex: 50,
        backgroundColor: "#fff",
        borderBottom: "1px solid #ddd",
        padding: "1rem 0"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer"
            }}
          >
            PickYourHire
          </button>
          <button
            onClick={() => (window.location.href = "/signin")}
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Sign In
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: "5rem" }}>
        {/* HERO SECTION */}
        <section style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center"
        }}>
          <div style={{ maxWidth: "800px" }}>
            <h1 style={{
              fontSize: "3.5rem",
              fontWeight: "bold",
              marginBottom: "1.5rem",
              lineHeight: "1.2"
            }}>
              Hire Smarter With Trust & Speed
            </h1>

            <p style={{
              fontSize: "1.1rem",
              color: "#666",
              marginBottom: "2rem",
              lineHeight: "1.6"
            }}>
              Connect with verified talent, build strong teams, and transform your hiring process with AI-powered insights and real-time collaboration.
            </p>

            <button
              onClick={() => (window.location.href = "/signin")}
              style={{
                padding: "0.75rem 2rem",
                backgroundColor: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              Get Started For Free
              <ArrowRight style={{ width: "1rem", height: "1rem" }} />
            </button>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section style={{
          padding: "3rem 1.5rem",
          backgroundColor: "#f9f9f9"
        }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <h2 style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                marginBottom: "1rem"
              }}>
                Powerful Features for Future Scopes
              </h2>
              <p style={{
                fontSize: "1.1rem",
                color: "#666",
                maxWidth: "600px",
                margin: "0 auto"
              }}>
                Everything you need to streamline recruitment and build winning teams
              </p>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1.5rem"
            }}>
              {[
                { icon: Users, title: "Smart Matching", desc: "AI-powered candidate recommendations tailored to your needs" },
                { icon: Zap, title: "Fast Pipeline", desc: "Move candidates through stages in minutes, not weeks" },
                { icon: Shield, title: "Verified Data", desc: "Trust every candidate with automated credential verification" },
                { icon: TrendingUp, title: "Real-time Analytics", desc: "Track hiring metrics and team performance instantly" },
                { icon: Check, title: "Seamless Integration", desc: "Connect with your existing tools and workflows" },
                { icon: Sparkles, title: "AI Insights", desc: "Get data-driven recommendations to improve hiring outcomes" },
              ].map((feature, i) => {
                const IconComponent = feature.icon;
                return (
                  <div
                    key={i}
                    style={{
                      padding: "1.5rem",
                      border: "1px solid #ddd",
                      borderRadius: "0.75rem",
                      backgroundColor: "#fff"
                    }}
                  >
                    <IconComponent style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      marginBottom: "1rem",
                      color: "#000"
                    }} />
                    <h3 style={{
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      marginBottom: "0.5rem"
                    }}>
                      {feature.title}
                    </h3>
                    <p style={{
                      color: "#666",
                      fontSize: "0.95rem",
                      lineHeight: "1.5"
                    }}>
                      {feature.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{
          padding: "3rem 1.5rem"
        }}>
          <div style={{
            maxWidth: "800px",
            margin: "0 auto",
            textAlign: "center",
            padding: "2rem",
            border: "1px solid #ddd",
            borderRadius: "1rem",
            backgroundColor: "#f9f9f9"
          }}>
            <h2 style={{
              fontSize: "2.5rem",
              fontWeight: "bold",
              marginBottom: "1rem"
            }}>
              Ready to Hire Better?
            </h2>
            <p style={{
              fontSize: "1.1rem",
              color: "#666",
              marginBottom: "1.5rem"
            }}>
              Join companies transforming their recruitment process today
            </p>
            <button
              onClick={() => (window.location.href = "/signin")}
              style={{
                padding: "0.75rem 2rem",
                backgroundColor: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Get Started
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{
          borderTop: "1px solid #ddd",
          padding: "2rem 1.5rem",
          textAlign: "center",
          color: "#666",
          backgroundColor: "#f9f9f9"
        }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <p style={{ marginBottom: "1rem" }}>© 2026 PickYourHire - Smart Referral Hiring Platform</p>
            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: "1.5rem",
              fontSize: "0.9rem"
            }}>
              <a href="#" style={{ color: "#666", textDecoration: "none" }}>Privacy</a>
              <a href="#" style={{ color: "#666", textDecoration: "none" }}>Terms</a>
              <a href="#" style={{ color: "#666", textDecoration: "none" }}>Contact</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
