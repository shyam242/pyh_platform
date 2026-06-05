"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, Phone, Briefcase, Award, Users, FileText } from "lucide-react";
import { showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/signin");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/profile/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to fetch profile");

      const data = await res.json();
      setUser(data);
    } catch (err) {
      showError(err.message || "Failed to load profile");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>User not found</p>
      </div>
    );
  }

  const ProfileSection = ({ icon: Icon, title, value }) => (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "16px",
      padding: "16px",
      backgroundColor: "#f9f9f9",
      borderRadius: "8px",
      marginBottom: "12px"
    }}>
      <Icon size={24} style={{ color: "#1e88e5", marginTop: "4px" }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#666", fontWeight: "500" }}>
          {title}
        </p>
        <p style={{ margin: 0, fontSize: "16px", color: "#333", fontWeight: "500" }}>
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <div style={{
        backgroundColor: "white",
        padding: "20px 40px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px",
            borderRadius: "6px",
            transition: "background 0.2s"
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#f0f0f0")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ margin: 0, flex: 1 }}>My Profile</h2>
        <Link
          href="/edit-profile"
          style={{
            padding: "10px 20px",
            backgroundColor: "#1e88e5",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            transition: "background 0.2s",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#1565c0")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#1e88e5")}
        >
          Edit Profile
        </Link>
      </div>

      {/* Profile Content */}
      <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
        {/* Basic Info Card */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "32px",
          marginBottom: "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ width: "86px", height: "86px", borderRadius: "9999px", overflow: "hidden", backgroundColor: "#f3f4f6" }}>
              {user.image_url ? (
                <img src={user.image_url} alt="Profile avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <img src="/user.svg" alt="Default avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#111827" }}>{user.name}</h3>
              <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.95rem" }}>{user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}</p>
            </div>
          </div>

          <h3 style={{ margin: "0 0 24px 0", color: "#333" }}>Personal Information</h3>

          <ProfileSection icon={Mail} title="Email" value={user.email} />
          <ProfileSection icon={Users} title="Full Name" value={user.name} />
          <ProfileSection icon={Award} title="Role" value={user.role?.charAt(0).toUpperCase() + user.role?.slice(1)} />
          {user.phone && <ProfileSection icon={Phone} title="Mobile" value={user.phone} />}

          {user.role === "referrer" && (
            <>
              <ProfileSection icon={Briefcase} title="Company" value={user.company} />
              <ProfileSection icon={Award} title="Experience" value={user.experience} />
            </>
          )}

          {(user.role === "candidate" || user.role === "recruiter") && user.skills && (
            <div style={{
              padding: "16px",
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
              marginBottom: "12px"
            }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#666", fontWeight: "500" }}>
                Skills
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(typeof user.skills === 'string' ? JSON.parse(user.skills) : user.skills).map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: "#1e88e5",
                      color: "white",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {user.verified && (
            <div style={{
              padding: "16px",
              backgroundColor: "#e8f5e9",
              border: "1px solid #4caf50",
              borderRadius: "8px",
              marginTop: "16px"
            }}>
              <p style={{ margin: 0, color: "#2e7d32", fontWeight: "500" }}>
                ✓ Profile Verified
              </p>
            </div>
          )}
        </div>

        {/* Stats Card */}
        {user.role === "referrer" && (
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "32px",
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
          }}>
            <h3 style={{ margin: "0 0 24px 0", color: "#333" }}>Referral Stats</h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px"
            }}>
              <StatCard label="Total Referrals" value={user.total_referrals || 0} />
              <StatCard label="Successful Joinings" value={user.successful_joinings || 0} />
              <StatCard label="Total Incentives" value={`$${user.total_incentives || 0}`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      backgroundColor: "#f9f9f9",
      padding: "20px",
      borderRadius: "8px",
      textAlign: "center",
      border: "1px solid #eee"
    }}>
      <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666", fontWeight: "500" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "#1e88e5" }}>
        {value}
      </p>
    </div>
  );
}
