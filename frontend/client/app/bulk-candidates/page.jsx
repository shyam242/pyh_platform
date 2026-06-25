"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Trash2, AlertCircle, Users, Search, X, Upload } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

export default function BulkCandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchBulkCandidates(); }, []);

  const fetchBulkCandidates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/admin/bulk-candidates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCandidates(response.data || []);
    } catch (error) {
      showError("Failed to fetch bulk candidates");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (id, e) => {
    e.stopPropagation();
    const newSelected = new Set(selectedCandidates);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedCandidates(newSelected);
    setSelectAll(newSelected.size === candidates.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCandidates(new Set());
      setSelectAll(false);
    } else {
      setSelectedCandidates(new Set(candidates.map(c => c.id)));
      setSelectAll(true);
    }
  };

  const handleDeleteCandidate = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this candidate?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/admin/bulk-candidates/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCandidates(prev => prev.filter(c => c.id !== id));
      setSelectedCandidates(prev => { const u = new Set(prev); u.delete(id); return u; });
      showSuccess("Candidate deleted");
    } catch {
      showError("Failed to delete candidate");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedCandidates.size) return showError("Select candidates first");
    if (!window.confirm(`Delete ${selectedCandidates.size} candidates?`)) return;
    try {
      setDeleting(true);
      const token = localStorage.getItem("token");
      for (const id of selectedCandidates) {
        await axios.delete(`${API_BASE_URL}/api/admin/bulk-candidates/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setCandidates(prev => prev.filter(c => !selectedCandidates.has(c.id)));
      setSelectedCandidates(new Set());
      setSelectAll(false);
      showSuccess(`${selectedCandidates.size} candidates deleted`);
    } catch {
      showError("Failed to delete some candidates");
    } finally {
      setDeleting(false);
    }
  };

  const handlePushToMainCandidates = async () => {
    if (!selectedCandidates.size) return showError("Select candidates first");
    if (!window.confirm(`Push ${selectedCandidates.size} candidate(s) to main candidates pool?`)) return;
    try {
      setPushing(true);
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/bulk-candidates/push-to-candidates`,
        { ids: Array.from(selectedCandidates) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { pushedCount, errorCount, errors } = res.data;
      if (pushedCount > 0) showSuccess(`${pushedCount} candidate(s) pushed successfully`);
      if (errorCount > 0) showError(`${errorCount} failed: ${errors.map(e => e.error).join("; ")}`);
      setSelectedCandidates(new Set());
      setSelectAll(false);
      fetchBulkCandidates();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to push candidates");
    } finally {
      setPushing(false);
    }
  };

  const filtered = candidates.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.skills?.toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name) => name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

  const avatarPalette = [
    { bg: "#e8f0fe", text: "#1a56db" },
    { bg: "#fce8f3", text: "#9b1c82" },
    { bg: "#e3faf0", text: "#057a55" },
    { bg: "#fdf6e3", text: "#92400e" },
    { bg: "#ede9fe", text: "#6d28d9" },
  ];

  const getAvatar = (idx) => avatarPalette[idx % avatarPalette.length];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#f97316", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <p style={{ marginTop: 16, color: "#6b7280", fontSize: 14 }}>Loading candidates…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc" }}>
      {/* Top Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fef3e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={18} color="#f97316" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" }}>Bulk Candidates</p>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{candidates.length} total · CSV upload</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {selectedCandidates.size > 0 && (
              <>
                <button
                  onClick={handlePushToMainCandidates}
                  disabled={pushing}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: pushing ? "#f3f4f6" : "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: pushing ? "not-allowed" : "pointer", opacity: pushing ? 0.7 : 1 }}
                >
                  <Upload size={14} />
                  {pushing ? "Pushing…" : `Push ${selectedCandidates.size} to Candidates`}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: deleting ? 0.6 : 1 }}
                >
                  <Trash2 size={14} />
                  Delete {selectedCandidates.size} selected
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
        {/* Search + Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or skill…"
              style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, color: "#374151", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#374151", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              style={{ width: 15, height: 15, accentColor: "#f97316", cursor: "pointer" }}
            />
            Select all
          </label>

          {filtered.length > 0 && (
            <span style={{ fontSize: 13, color: "#9ca3af" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertCircle size={24} color="#9ca3af" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#374151", margin: "0 0 6px" }}>
              {search ? "No candidates match your search" : "No candidates yet"}
            </p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
              {search ? "Try a different keyword" : "Upload a CSV to get started"}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 16 }}>
            {filtered.map((candidate, idx) => {
              const isSelected = selectedCandidates.has(candidate.id);
              const avatar = getAvatar(idx);
              const skills = typeof candidate.skills === "string"
                ? candidate.skills.split(",").map(s => s.trim()).filter(Boolean)
                : [];

              return (
                <div
                  key={candidate.id}
                  onClick={() => router.push(`/admin/bulk-candidates/${candidate.id}`)}
                  style={{
                    background: "#fff",
                    border: `1px solid ${isSelected ? "#fed7aa" : "#e5e7eb"}`,
                    borderRadius: 12,
                    padding: "20px",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s, border-color 0.15s",
                    boxShadow: isSelected ? "0 0 0 3px #fef3e2" : "none",
                    position: "relative",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.boxShadow = "none"; }}
                >
                  {/* Checkbox */}
                  <div
                    style={{ position: "absolute", top: 16, right: 16 }}
                    onClick={e => handleSelectCandidate(candidate.id, e)}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 6,
                      border: `1.5px solid ${isSelected ? "#f97316" : "#d1d5db"}`,
                      background: isSelected ? "#f97316" : "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s", cursor: "pointer"
                    }}>
                      {isSelected && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Avatar + Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingRight: 28 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: avatar.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: avatar.text, flexShrink: 0 }}>
                      {initials(candidate.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {candidate.name || "Unknown"}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {candidate.email}
                      </p>
                    </div>
                  </div>

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                      {skills.slice(0, 4).map((skill, i) => (
                        <span key={i} style={{ padding: "3px 9px", background: "#fef3e2", color: "#ea580c", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                          {skill}
                        </span>
                      ))}
                      {skills.length > 4 && (
                        <span style={{ padding: "3px 9px", background: "#f3f4f6", color: "#6b7280", borderRadius: 20, fontSize: 11 }}>
                          +{skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Company</p>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#374151" }}>{candidate.current_company_name || "—"}</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Exp.</p>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#374151" }}>{candidate.experience ? `${candidate.experience} yrs` : "—"}</p>
                      </div>
                    </div>
                    <button
                      onClick={e => handleDeleteCandidate(candidate.id, e)}
                      style={{ padding: "5px 8px", background: "none", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", color: "#dc2626" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                      title="Delete candidate"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
