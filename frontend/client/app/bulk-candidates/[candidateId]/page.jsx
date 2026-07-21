"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import axios from "axios";
import { API_BASE_URL } from "@/utils/api";
import CandidateDetailView from "@/components/recruiter/CandidateDetailView";

export default function BulkCandidateDetailPage() {
  const router = useRouter();
  const { candidateId } = useParams();

  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shortlisted, setShortlisted] = useState(false);

  useEffect(() => { fetchCandidateDetails(); }, [candidateId]);

  const fetchCandidateDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/admin/bulk-candidates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const found = response.data.find(c => c.id === parseInt(candidateId));
      if (found) {
        setRaw(found);
      } else {
        showError("Candidate not found");
        router.back();
      }
    } catch (err) {
      showError("Failed to load candidate details");
    } finally {
      setLoading(false);
    }
  };

  const downloadCV = () => {
    if (!raw?.resume_link) return showError("CV file not available");
    window.open(raw.resume_link, "_blank", "noopener,noreferrer");
  };

  const handleShortlist = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(`${API_BASE_URL}/api/recruiter/candidate-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source: "bulk", candidateId, status: "Shortlisted" }),
      });
      if (!r.ok) throw new Error("Update failed");
      setShortlisted(!shortlisted);
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

  // Normalize into the shape CandidateDetailView expects.
  // Deliberately drops upload/status/uploaded_by fields — a recruiter never sees
  // that this candidate came from a bulk upload.
  const candidate = {
    name: raw.name,
    role: raw.role,
    location: raw.current_location,
    preferredLocation: raw.preferred_location,
    email: raw.email,
    phone: raw.contact,
    linkedin: raw.linkedin,
    experience: raw.experience,
    currentCtc: raw.current_ctc,
    expectedCtc: raw.expected_ctc,
    noticePeriod: raw.notice_period,
    currentCompany: raw.current_company_name,
    qualification: raw.highest_qualification,
    reasonForChange: raw.reason_for_change,
    offerInHand: raw.offer_in_hand,
    skills: raw.skills,
    technical_skills: raw.technical_skills,
    soft_skills: raw.soft_skills,
    hasCv: !!raw.resume_link,
  };

  return (
    <CandidateDetailView
      candidate={candidate}
      statusLabel={shortlisted ? "Shortlisted" : null}
      onBack={() => router.back()}
      onDownloadCV={downloadCV}
      onShortlist={handleShortlist}
      shortlisted={shortlisted}
    />
  );
}
