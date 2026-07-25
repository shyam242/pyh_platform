"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import axios from "axios";
import { API_BASE_URL } from "@/utils/api";
import CandidateDetailView from "@/components/recruiter/CandidateDetailView";

export default function AdminReferredCandidateDetailsPage() {
  const router = useRouter();
  const { referralId } = useParams();

  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shortlisted, setShortlisted] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { if (referralId) fetchDetails(); }, [referralId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/admin/referred-candidates/${referralId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRaw(res.data.candidate);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load referred candidate details");
    } finally {
      setLoading(false);
    }
  };

  const downloadCV = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/recruiter/${referralId}/cv/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("CV not available");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${raw?.name || "candidate"}-CV.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError(err.message || "Failed to download CV");
    } finally {
      setDownloading(false);
    }
  };

  const handleShortlist = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(`${API_BASE_URL}/api/recruiter/candidate-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source: "referred", candidateId: referralId, status: "Shortlisted" }),
      });
      if (!r.ok) throw new Error("Update failed");
      setShortlisted(s => !s);
      showSuccess(shortlisted ? "Removed from shortlist" : "Candidate shortlisted");
    } catch (err) {
      showError(err.message || "Failed to update status");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100%", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#E87722", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <p style={{ marginTop: 16, color: "#6b7280", fontSize: 14 }}>Loading…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!raw) {
    return (
      <div style={{ minHeight: "100%", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} color="#9ca3af" />
          <p style={{ marginTop: 12, color: "#374151" }}>Candidate not found</p>
        </div>
      </div>
    );
  }

  const skillsArr = Array.isArray(raw.skills) ? raw.skills : (raw.skills ? String(raw.skills).split(",").map(s => s.trim()).filter(Boolean) : []);

  // Normalize into the shape CandidateDetailView expects — the referrals
  // table collects a smaller field set than bulk/portal candidates, so
  // several fields will simply show "Not provided", same as any other
  // candidate whose recruiter/uploader didn't fill them in.
  const candidate = {
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    linkedin: raw.linkedin,
    experience: raw.experience,
    currentCompany: raw.company,
    department: raw.department,
    skills: skillsArr.join(","),
    hasCv: !!raw.cv_file,
  };

  return (
    <CandidateDetailView
      candidate={candidate}
      statusLabel={raw.status}
      onBack={() => router.back()}
      onDownloadCV={downloadCV}
      downloading={downloading}
      onShortlist={handleShortlist}
      shortlisted={shortlisted}
      referrer={raw.referrer ? {
        name: raw.referrer.name,
        company: raw.referrer.company,
      } : undefined}
    />
  );
}
