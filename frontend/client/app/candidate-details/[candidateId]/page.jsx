"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";
import CandidateDetailView from "@/components/recruiter/CandidateDetailView";

export default function CandidateDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = params.candidateId;
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const sourceType = searchParams ? (searchParams.get("source_type") || "referral") : "referral";

  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [jdMatch, setJdMatch] = useState(null);
  const [shortlisted, setShortlisted] = useState(false);

  useEffect(() => { fetchCandidateDetails(); fetchCachedMatch(); }, [candidateId]);

  const fetchCachedMatch = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/recruiter/jd/match-result/${candidateId}?source_type=${sourceType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.has_match) setJdMatch(data);
    } catch {}
  };

  const trackView = (name, type = "profile_view") => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_BASE_URL}/api/recruiter/track-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ candidateId: Number(candidateId), candidateName: name, viewType: type }),
    }).catch(() => {});
  };

  const fetchCandidateDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/recruiter/${candidateId}/details?source_type=${sourceType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch candidate details");
      const data = await res.json();
      setRaw(data);
      if (data.status === "shortlist") setShortlisted(true);
      trackView(data.name, "profile_view");
    } catch (err) {
      showError(err.message || "Failed to load candidate details");
      setTimeout(() => router.back(), 2000);
    } finally {
      setLoading(false);
    }
  };

  const downloadCV = async () => {
    if (!raw?.cv_file) return showError("CV file not available");
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/recruiter/${candidateId}/cv/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download CV");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${raw.name}-CV.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      trackView(raw.name, "candidate_cv");
      showSuccess("CV downloaded!");
    } catch (err) {
      showError(err.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleShortlist = async () => {
    try {
      const token = localStorage.getItem("token");
      const nextStatus = shortlisted ? null : "Shortlisted";
      const r = await fetch(`${API_BASE_URL}/api/recruiter/candidate-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source: "referred", candidateId, status: nextStatus || "Shortlisted" }),
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
  // Deliberately drops any field that reveals how the candidate was sourced.
  const candidate = {
    name: raw.name,
    role: raw.current_role || raw.department,
    location: raw.current_location,
    preferredLocation: raw.preferred_location,
    email: raw.email,
    phone: raw.phone,
    linkedin: raw.linkedin,
    experience: raw.experience,
    currentCtc: raw.current_ctc,
    expectedCtc: raw.expected_ctc,
    noticePeriod: raw.notice_period,
    currentCompany: raw.current_company_name,
    qualification: raw.qualification || raw.highest_qualification,
    reasonForChange: raw.reason_for_change,
    offerInHand: raw.offer_in_hand === "yes" ? "Yes" : raw.offer_in_hand === "no" ? "No" : null,
    skills: raw.skills,
    core_skills: raw.core_skills,
    technical_skills: raw.technical_skills,
    soft_skills: raw.soft_skills,
    hasCv: !!raw.cv_file,
    imageUrl: raw.candidate_image_url,
  };

  const referrer = raw.referrer_id ? {
    name: raw.referrer_name,
    company: raw.referrer_company,
  } : null;

  return (
    <CandidateDetailView
      candidate={candidate}
      statusLabel={shortlisted ? "Shortlisted" : null}
      matchScore={jdMatch?.jd_match_score}
      matchLabel={jdMatch?.jd_match_data?.job_title ? `Matched — ${jdMatch.jd_match_data.job_title}` : (jdMatch ? "Matched" : null)}
      matchAnalyzedAt={jdMatch?.jd_match_at}
      matchWhyShortlist={jdMatch?.jd_match_data?.why_shortlist || []}
      matchConcerns={jdMatch?.jd_match_data?.concerns || []}
      onBack={() => router.back()}
      onDownloadCV={downloadCV}
      downloading={downloading}
      onShortlist={handleShortlist}
      shortlisted={shortlisted}
      referrer={referrer}
    />
  );
}
