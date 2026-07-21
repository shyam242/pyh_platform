"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { API_BASE_URL } from "@/utils/api";
import { showSuccess, showError } from "@/utils/toast";

export function useRecruiterCandidates() {
  const [referrals, setReferrals] = useState([]);
  const [bulkCandidates, setBulkCandidates] = useState([]);
  const [statuses, setStatuses] = useState([]); // [{source, candidate_id, status, updated_at}]
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    const [rRes, bRes, sRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/api/recruiter/all`, { headers }),
      fetch(`${API_BASE_URL}/api/admin/bulk-candidates`, { headers }),
      fetch(`${API_BASE_URL}/api/recruiter/candidate-statuses`, { headers }),
    ]);
    if (rRes.status === "fulfilled" && rRes.value.ok) {
      const d = await rRes.value.json();
      setReferrals(Array.isArray(d) ? d : (d.data || []));
    }
    if (bRes.status === "fulfilled" && bRes.value.ok) {
      const d = await bRes.value.json();
      setBulkCandidates(Array.isArray(d) ? d : (d.data || []));
    }
    if (sRes.status === "fulfilled" && sRes.value.ok) {
      const d = await sRes.value.json();
      setStatuses(d.statuses || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusMap = useMemo(() => {
    const map = {};
    statuses.forEach(s => { map[`${s.source}:${s.candidate_id}`] = s; });
    return map;
  }, [statuses]);

  const candidates = useMemo(() => {
    const combined = [
      ...referrals.map(c => ({ ...c, source: "referred", is_bulk: false, sourceLabel: c.referrer_name ? "Employee Referral" : "Direct Application" })),
      ...bulkCandidates.map(c => ({ ...c, source: "bulk", is_bulk: true, sourceLabel: "Bulk Upload" })),
    ];
    return combined.map(c => {
      const s = statusMap[`${c.source}:${c.id}`];
      return { ...c, myStatus: s?.status || null, myStatusUpdatedAt: s?.updated_at || null };
    });
  }, [referrals, bulkCandidates, statusMap]);

  const setStatus = useCallback(async (source, id, status) => {
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(`${API_BASE_URL}/api/recruiter/candidate-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source, candidateId: id, status }),
      });
      if (!r.ok) throw new Error("Update failed");
      setStatuses(prev => {
        const next = prev.filter(s => !(s.source === source && String(s.candidate_id) === String(id)));
        next.push({ source, candidate_id: id, status, updated_at: new Date().toISOString() });
        return next;
      });
      showSuccess(`Marked as ${status}`);
    } catch (err) {
      showError(err.message || "Failed to update status");
    }
  }, []);

  const downloadCV = useCallback(async (candidate) => {
    const token = localStorage.getItem("token");
    if (candidate.is_bulk) {
      if (candidate.resume_link) window.open(candidate.resume_link, "_blank");
      else showError("No resume on file for this candidate");
      return;
    }
    try {
      const r = await fetch(`${API_BASE_URL}/api/recruiter/${candidate.id}/cv/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) {
        let message = `Download failed (${r.status})`;
        try { const body = await r.json(); if (body?.error || body?.message) message = body.error || body.message; } catch {}
        throw new Error(message);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${candidate.name}-resume.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      fetch(`${API_BASE_URL}/api/recruiter/track-view`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidateId: candidate.id, candidateName: candidate.name, viewType: "referral_cv" }),
      }).catch(() => {});
    } catch (err) {
      showError(err.message || "Failed to download CV");
    }
  }, []);

  return { candidates, loading, setStatus, downloadCV, reload: load };
}
