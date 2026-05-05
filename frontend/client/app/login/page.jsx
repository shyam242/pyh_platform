"use client";
import { signIn, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Linkedin, ArrowRight } from "lucide-react";

export default function Login() {
  const { data: session } = useSession();

  if (session) redirect("/dashboard");

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
            onClick={() => (window.location.href = "/")}
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
            Back
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: "5rem" }}>
        <section style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem"
        }}>
          <div style={{ maxWidth: "500px", width: "100%", textAlign: "center" }}>
            <h1 style={{
              fontSize: "2.5rem",
              fontWeight: "bold",
              marginBottom: "1rem"
            }}>
              Sign In with LinkedIn
            </h1>
            <p style={{
              fontSize: "1rem",
              color: "#666",
              marginBottom: "2rem"
            }}>
              Connect your professional profile to get started with PickYourHire
            </p>

            <button
              onClick={() => signIn("linkedin")}
              style={{
                padding: "0.75rem 2rem",
                backgroundColor: "#0A66C2",
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
              <Linkedin style={{ width: "1.25rem", height: "1.25rem" }} />
              Sign in with LinkedIn
              <ArrowRight style={{ width: "1rem", height: "1rem" }} />
            </button>

            <p style={{
              color: "#999",
              fontSize: "0.9rem",
              marginTop: "2rem"
            }}>
              We only request basic profile information from your LinkedIn account
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
