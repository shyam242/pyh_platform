"use client";
import { useSession } from "next-auth/react";
import axios from "axios";
import { redirect } from "next/navigation";
import { Users, Briefcase, User, Shield, ArrowRight } from "lucide-react";

export default function RolePage() {
  const { data: session } = useSession();
  if (!session) redirect("/signin");

  const roles = [
    { id: "referrer", title: "Referrer", description: "Refer talented candidates", icon: Users, bgColor: "#f3f4f6" },
    { id: "candidate", title: "Candidate", description: "Find job opportunities", icon: User, bgColor: "#f3f4f6" },
    { id: "recruiter", title: "Recruiter", description: "Manage recruitment", icon: Briefcase, bgColor: "#f3f4f6" },
    { id: "admin", title: "Admin", description: "Manage platform", icon: Shield, bgColor: "#f3f4f6" },
  ];

  const setRole = async (role) => {
    try {
      // For admin role, verify the email
      if (role === "admin" && session.user.email !== "shyampickyourhire@gmail.com") {
        alert("Admin account can only be created with the authorized email address");
        return;
      }

      const response = await axios.post("http://localhost:5000/api/profile/create", {
        name: session.user.name || "User",
        email: session.user.email,
        role: role
      });

      // Store token
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }

      redirect("/dashboard");
    } catch (error) {
      console.error("Error setting role:", error);
      alert(error.response?.data?.error || "Failed to set role");
    }
  };

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
          <div style={{ maxWidth: "1000px", width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <h1 style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                marginBottom: "1rem"
              }}>
                Select Your Role
              </h1>
              <p style={{
                fontSize: "1.1rem",
                color: "#666"
              }}>
                Choose how you want to use PickYourHire
              </p>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.5rem"
            }}>
              {roles.map((role) => {
                const IconComponent = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => setRole(role.id)}
                    style={{
                      padding: "1.5rem",
                      border: "1px solid #ddd",
                      borderRadius: "0.75rem",
                      backgroundColor: role.bgColor,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#000";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#ddd";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <IconComponent style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      marginBottom: "1rem",
                      color: "#000"
                    }} />
                    <h3 style={{
                      fontSize: "1.25rem",
                      fontWeight: "bold",
                      marginBottom: "0.5rem"
                    }}>
                      {role.title}
                    </h3>
                    <p style={{
                      color: "#666",
                      fontSize: "0.95rem",
                      lineHeight: "1.5",
                      marginBottom: "1rem"
                    }}>
                      {role.description}
                    </p>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#000",
                      fontSize: "0.9rem",
                      fontWeight: "600"
                    }}>
                      Get Started
                      <ArrowRight style={{ width: "1rem", height: "1rem" }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
