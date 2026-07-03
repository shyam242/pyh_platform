"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, Briefcase, Award, Users, 
  FileText, Linkedin, DollarSign, CheckCircle2, AlertCircle, 
  Clock, ExternalLink, Download, Edit3, Save, X
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#EBEBEB";

const STATUS_COLORS = {
  pending: { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA", icon: Clock },
  accepted: { bg: "#EAF3DE", color: "#3B6D11", border: "#97C459", icon: CheckCircle2 },
  rejected: { bg: "#FEF2F2", color: "#dc2626", border: "#FECACA", icon: AlertCircle },
  pending_candidate_acceptance: { bg: "#EFF6FF", color: "#1d4ed8", border: "#BFDBFE", icon: Clock },
  verified: { bg: "#EAF3DE", color: "#3B6D11", border: "#97C459", icon: CheckCircle2 },
};

const statusLabel = s => ({
  pending: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  pending_candidate_acceptance: "Awaiting Candidate",
  verified: "Verified",
}[s] || s);

const timeAgo = iso => {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
};

const formatDate = iso => {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function ReferralDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const referralId = params?.referralId;

  const [referral, setReferral] = useState(null);
  const [referrer, setReferrer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (!referralId) return;
    fetchDetails();
  }, [referralId]);

  const fetchDetails = async () => {
    try {
      // Fetch referral details
      const refRes = await fetch(`${API_BASE_URL}/api/referral/${referralId}`);
      if (!refRes.ok) throw new Error("Failed to fetch referral");
      const refData = await refRes.json();
      setReferral(refData);

      // Fetch referrer details
      if (refData.referrer_id) {
        const token = localStorage.getItem("token");
        const refererRes = await fetch(`${API_BASE_URL}/api/profile/referrer/${refData.referrer_id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (refererRes.ok) {
          const refererData = await refererRes.json();
          setReferrer(refererData);
        }
      }
    } catch (err) {
      showError(err.message || "Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveReferral = async () => {
    if (!editForm.name?.trim() || !editForm.email?.trim() || !editForm.phone?.trim()) {
      showError("Name, email, and phone are required");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/referral/${referralId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(editForm)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update referral");
      }

      const updated = await res.json();
      setReferral(updated.data);
      setEditMode(false);
      showSuccess("Referral updated successfully!");
    } catch (err) {
      showError(err.message || "Failed to update referral");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    setEditForm({
      name: referral?.name || "",
      email: referral?.email || "",
      phone: referral?.phone || "",
      linkedin: referral?.linkedin || "",
      company: referral?.company || "",
      skills: Array.isArray(referral?.skills) ? referral.skills.join(", ") : (referral?.skills || ""),
      experience: referral?.experience || "",
      industry: referral?.industry || "",
      department: referral?.department || "",
    });
    setEditMode(true);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1rem", color: "#666", fontFamily: "inherit" }}>Loading referral details...</div>
      </div>
    );
  }

  if (!referral) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={40} color="#dc2626" style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontSize: "1.1rem", color: "#666", marginBottom: 16 }}>Referral not found</p>
          <Link href="/referrer" style={{ color: O, textDecoration: "none", fontWeight: 600 }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const sc = STATUS_COLORS[referral.referral_status || referral.status] || STATUS_COLORS.pending;
  const StatusIcon = sc.icon;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 48px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: O, fontWeight: 600 }}>
            <ArrowLeft size={20} /> Back
          </button>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Referral Details</span>
        </div>
        {!editMode && (
          <button
            onClick={startEdit}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: `1.5px solid ${BORDER}`, borderRadius: 9, backgroundColor: "#fff", fontSize: 14, color: O, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
            <Edit3 size={15} /> Edit Details
          </button>
        )}
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 48px" }}>
        {editMode ? (
          // EDIT MODE
          <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 18, padding: "32px 36px" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: "#0f172a" }}>Edit Referral Information</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              {[
                { label: "Full Name", name: "name", placeholder: "Full name", type: "text", required: true },
                { label: "Email Address", name: "email", placeholder: "email@example.com", type: "email", required: true },
                { label: "Phone Number", name: "phone", placeholder: "Phone number", type: "tel", required: true },
                { label: "Years of Experience", name: "experience", placeholder: "e.g. 5", type: "number", required: false },
                { label: "Current Company", name: "company", placeholder: "Company name", type: "text", required: false },
                { label: "Industry", name: "industry", placeholder: "e.g. Technology", type: "text", required: false },
                { label: "Department", name: "department", placeholder: "e.g. Engineering", type: "text", required: false },
              ].map(({ label, name, placeholder, type, required }) => (
                <div key={name}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>
                  <input
                    type={type}
                    name={name}
                    value={editForm[name] || ""}
                    onChange={e => handleEditChange(name, e.target.value)}
                    placeholder={placeholder}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      fontSize: 14,
                      border: `1.5px solid ${BORDER}`,
                      borderRadius: 9,
                      outline: "none",
                      backgroundColor: "#FAFAFA",
                      color: "#0f172a",
                      fontFamily: "inherit",
                      boxSizing: "border-box"
                    }}
                    onFocus={e => e.target.style.borderColor = O}
                    onBlur={e => e.target.style.borderColor = BORDER}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Skills (comma separated)
              </label>
              <textarea
                value={editForm.skills || ""}
                onChange={e => handleEditChange("skills", e.target.value)}
                placeholder="React, Node.js, Python..."
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  fontSize: 14,
                  border: `1.5px solid ${BORDER}`,
                  borderRadius: 9,
                  outline: "none",
                  backgroundColor: "#FAFAFA",
                  color: "#0f172a",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  minHeight: 80,
                  resize: "vertical"
                }}
                onFocus={e => e.target.style.borderColor = O}
                onBlur={e => e.target.style.borderColor = BORDER}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={editForm.linkedin || ""}
                onChange={e => handleEditChange("linkedin", e.target.value)}
                placeholder="https://linkedin.com/in/..."
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  fontSize: 14,
                  border: `1.5px solid ${BORDER}`,
                  borderRadius: 9,
                  outline: "none",
                  backgroundColor: "#FAFAFA",
                  color: "#0f172a",
                  fontFamily: "inherit",
                  boxSizing: "border-box"
                }}
                onFocus={e => e.target.style.borderColor = O}
                onBlur={e => e.target.style.borderColor = BORDER}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setEditMode(false)}
                style={{
                  padding: "12px 24px",
                  border: `1.5px solid ${BORDER}`,
                  borderRadius: 10,
                  backgroundColor: "#fff",
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                <X size={16} /> Cancel
              </button>
              <button
                onClick={handleSaveReferral}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  backgroundColor: saving ? O_LITE : O,
                  color: saving ? O : "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: saving ? "none" : `0 4px 14px rgba(232,119,34,0.28)`
                }}>
                <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          // VIEW MODE
          <>
            {/* Main Referral Card */}
            <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", marginBottom: 28 }}>
              {/* Header with status */}
              <div style={{ backgroundColor: sc.bg, borderBottom: `1px solid ${sc.border}`, padding: "24px 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    backgroundColor: O,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {(referral.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{referral.name || "N/A"}</div>
                    <div style={{ fontSize: 14, color: "#64748b" }}>Referral ID: #{referral.id}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: sc.color, marginBottom: 8 }}>
                    <StatusIcon size={16} /> {statusLabel(referral.referral_status || referral.status)}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Created {timeAgo(referral.created_at)}</div>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: "32px" }}>
                {/* Contact Information */}
                <div style={{ marginBottom: 32 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <Users size={18} color={O} /> Contact Information
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { icon: Mail, label: "Email", value: referral.email },
                      { icon: Phone, label: "Phone", value: referral.phone },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} style={{ backgroundColor: O_LITE, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <Icon size={18} color={O} style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", wordBreak: "break-all" }}>{value || "N/A"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Incentive Information — only meaningful once the referral has been accepted */}
                <div style={{ marginBottom: 32 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <DollarSign size={18} color={O} /> Incentive
                  </h3>
                  {(referral.referral_status || referral.status) === "accepted" ? (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      backgroundColor: referral.incentive_status === "paid" ? "#EAF3DE" : O_LITE,
                      border: `1px solid ${referral.incentive_status === "paid" ? "#97C459" : O_MID}`,
                      borderRadius: 12, padding: "16px 18px"
                    }}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: referral.incentive_status === "paid" ? "#3B6D11" : O }}>
                          ₹{referrer?.incentive_value ? Number(referrer.incentive_value).toLocaleString("en-IN") : "500"}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {referral.incentive_status === "paid"
                            ? `Paid on ${formatDate(referral.incentive_paid_at)}${referral.payment_mode ? ` via ${referral.payment_mode}` : ""}`
                            : "Awaiting payout from admin"}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 999, backgroundColor: "#fff", color: referral.incentive_status === "paid" ? "#3B6D11" : "#C2410C", border: `1px solid ${referral.incentive_status === "paid" ? "#97C459" : "#FED7AA"}` }}>
                        {referral.incentive_status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: "#F8FAFC", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#64748b" }}>
                      Incentive is credited once this referral is accepted. Current status: {statusLabel(referral.referral_status || referral.status)}.
                    </div>
                  )}
                </div>

                {/* Professional Information */}
                <div style={{ marginBottom: 32 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <Briefcase size={18} color={O} /> Professional Information
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { icon: Briefcase, label: "Company", value: referral.company },
                      { icon: Award, label: "Experience", value: referral.experience ? `${referral.experience} years` : null },
                      { icon: Users, label: "Industry", value: referral.industry },
                      { icon: FileText, label: "Department", value: referral.department },
                    ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
                      <div key={label} style={{ backgroundColor: "#F8FAFC", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, border: `1px solid ${BORDER}` }}>
                        <Icon size={18} color={O} style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                {referral.skills && (
                  <div style={{ marginBottom: 32 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Skills</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(Array.isArray(referral.skills) ? referral.skills : JSON.parse(referral.skills || "[]")).map((skill, i) => (
                        <div key={i} style={{ backgroundColor: O_LITE, color: O, padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, border: `1px solid ${O_MID}` }}>
                          {skill}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LinkedIn */}
                {referral.linkedin && (
                  <div style={{ marginBottom: 32 }}>
                    <a
                      href={referral.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 16px",
                        backgroundColor: "#0A66C2",
                        color: "#fff",
                        borderRadius: 10,
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: 14
                      }}>
                      <Linkedin size={16} /> View on LinkedIn
                    </a>
                  </div>
                )}

                {/* CV Download */}
                {referral.cv_file && (
                  <div style={{ marginBottom: 32 }}>
                    <a
                      href={`${API_BASE_URL}/uploads/cv/${referral.cv_file}`}
                      download
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 16px",
                        backgroundColor: O_LITE,
                        color: O,
                        borderRadius: 10,
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: 14,
                        border: `1px solid ${O_MID}`
                      }}>
                      <Download size={16} /> Download CV
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Referrer Information */}
            {referrer && (
              <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 18, padding: "32px" }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <Users size={20} color={O} /> Referrer Information
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[
                    { icon: Users, label: "Name", value: referrer.name },
                    { icon: Mail, label: "Email", value: referrer.email },
                    { icon: Phone, label: "Phone", value: referrer.phone },
                    { icon: Briefcase, label: "Company", value: referrer.company },
                    { icon: Award, label: "Experience", value: referrer.experience ? `${referrer.experience} years` : null },
                    { icon: DollarSign, label: "Incentive Value", value: referrer.incentive_value ? `₹${referrer.incentive_value}` : null },
                  ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
                    <div key={label} style={{ backgroundColor: "#F8FAFC", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, border: `1px solid ${BORDER}` }}>
                      <Icon size={18} color={O} style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", wordBreak: "break-word" }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href={`/edit-profile?referrer_id=${referrer.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 20,
                    padding: "10px 18px",
                    backgroundColor: O,
                    color: "#fff",
                    borderRadius: 9,
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 14
                  }}>
                  <Edit3 size={14} /> Edit Referrer Profile
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
