"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building2, User } from "lucide-react";
import { showError } from "@/utils/toast";

export default function RecruiterDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const recruiterId = params.recruiterId;

  const [recruiter, setRecruiter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecruiter();
  }, [recruiterId]);

  const fetchRecruiter = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/admin/users/recruiter/${recruiterId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch recruiter");
      const data = await res.json();
      setRecruiter(data);
    } catch (err) {
      showError(err.message || "Failed to load recruiter");
      setTimeout(() => router.back(), 1200);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading recruiter...</div>;
  if (!recruiter) return <div style={{ padding: 40, textAlign: "center" }}>Recruiter not found</div>;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <nav style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        padding: "1.25rem 0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "1px solid #e5e7eb", padding: "0.5rem", borderRadius: "0.375rem", cursor: "pointer", color: "#1f2937" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#1f2937" }}>Recruiter Details</h2>
        </div>
      </nav>

      <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ backgroundColor: "#ffffff", borderRadius: "1rem", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ width: 72, height: 72, borderRadius: "0.5rem", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={32} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#1f2937" }}>{recruiter.name}</h3>
              <p style={{ margin: 0, color: "#6b7280" }}>{recruiter.company_name || "-"}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af", fontWeight: 600 }}>Email</p>
              <p style={{ margin: 0, color: "#1f2937", fontWeight: 600 }}>{recruiter.email}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af", fontWeight: 600 }}>Phone</p>
              <p style={{ margin: 0, color: "#1f2937", fontWeight: 600 }}>{recruiter.phone || "-"}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af", fontWeight: 600 }}>Approved</p>
              <p style={{ margin: 0, color: "#1f2937", fontWeight: 600 }}>{recruiter.is_recruiter_approved ? "Yes" : "No"}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af", fontWeight: 600 }}>Joined</p>
              <p style={{ margin: 0, color: "#1f2937", fontWeight: 600 }}>{recruiter.created_at ? new Date(recruiter.created_at).toLocaleDateString() : "-"}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
