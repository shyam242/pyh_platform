"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#EBEBEB";

const InputField = ({ label, name, value, onChange, placeholder, type = "text", required, helper }) => {
  const hasError = required && (!value || value.toString().trim() === "");
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "11px 14px",
          fontSize: 14,
          border: `1.5px solid ${hasError ? "#ef4444" : BORDER}`,
          borderRadius: 9,
          outline: "none",
          backgroundColor: "#FAFAFA",
          color: "#0f172a",
          fontFamily: "inherit",
          boxSizing: "border-box"
        }}
        onFocus={e => e.target.style.borderColor = O}
        onBlur={e => e.target.style.borderColor = hasError ? "#ef4444" : BORDER}
      />
      {helper && <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0 0" }}>{helper}</p>}
      {hasError && <p style={{ fontSize: 12, color: "#ef4444", margin: "6px 0 0 0" }}>This field is required</p>}
    </div>
  );
};

export default function EditProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referrerId = searchParams.get("referrer_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [user, setUser] = useState(null);
  const [isReferrer, setIsReferrer] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [completedFields, setCompletedFields] = useState(0);
  const [totalFields, setTotalFields] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    experience: "",
    phone: "",
    linkedin: ""
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token && !referrerId) {
        router.push("/signin");
        return;
      }

      let userData;
      if (referrerId && !token) {
        // Public referrer profile view (from referral details page)
        const res = await fetch(`${API_BASE_URL}/api/profile/referrer/${referrerId}`);
        if (!res.ok) throw new Error("Failed to fetch referrer profile");
        userData = await res.json();
      } else {
        // Logged in user profile
        const res = await fetch(`${API_BASE_URL}/api/profile/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch profile");
        userData = await res.json();
      }

      setUser(userData);
      setIsReferrer(userData.role === "referrer");
      setProfileImage(userData.image_url || null);

      const fields = userData.role === "referrer" ? ["name", "email", "company", "experience", "phone", "linkedin"] : ["name", "email", "company", "phone"];
      setTotalFields(fields.length);

      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        company: userData.company || "",
        experience: userData.experience || "",
        phone: userData.phone || "",
        linkedin: userData.linkedin || ""
      });
    } catch (err) {
      showError(err.message || "Failed to load profile");
      setTimeout(() => router.back(), 1500);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletedFields = (data) => {
    const referrerFields = ["name", "email", "company", "experience", "phone"];
    const otherFields = ["name", "email", "company", "phone"];
    const fieldsToCheck = isReferrer ? referrerFields : otherFields;
    
    let completed = 0;
    fieldsToCheck.forEach(field => {
      if (data[field] && data[field].toString().trim() !== "") {
        completed++;
      }
    });
    setCompletedFields(completed);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    calculateCompletedFields(updated);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showError("Please upload a valid image (JPEG, PNG, GIF, or WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError("Image size must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const token = localStorage.getItem("token");
      const formDataImg = new FormData();
      formDataImg.append("image", file);

      const res = await fetch(`${API_BASE_URL}/api/profile/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataImg
      });

      if (!res.ok) throw new Error("Failed to upload image");
      const data = await res.json();
      setProfileImage(data.user?.image_url);
      showSuccess("Profile image updated successfully!");
    } catch (err) {
      showError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    const required = ["name", "email", "phone", "company"];
    if (isReferrer) required.push("experience");

    for (const field of required) {
      if (!formData[field] || formData[field].toString().trim() === "") {
        showError(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        return false;
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showError("Please enter a valid email address");
      return false;
    }

    if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      showError("Please enter a valid 10-digit phone number");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          company: formData.company,
          experience: formData.experience,
          phone: formData.phone,
          linkedin: formData.linkedin
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profile");
      }

      showSuccess("Profile updated successfully!");
      setTimeout(() => router.back(), 1500);
    } catch (err) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "1.1rem", color: "#666", fontFamily: "inherit" }}>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "1.1rem", color: "#666", fontFamily: "inherit" }}>Failed to load profile</p>
      </div>
    );
  }

  const progressPercentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  const isComplete = completedFields === totalFields;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#fff", borderBottom: `1.5px solid ${BORDER}`, padding: "0 48px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: O, fontWeight: 600, fontSize: 14, fontFamily: "inherit" }}>
            <ArrowLeft size={20} /> Back
          </button>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Edit {isReferrer ? "Referrer" : "User"} Profile</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 48px" }}>
        {/* Profile Completion Card */}
        <div style={{ backgroundColor: isComplete ? "#EAF3DE" : O_LITE, border: `1.5px solid ${isComplete ? "#97C459" : O_MID}`, borderRadius: 16, padding: "20px 24px", marginBottom: 28, display: "flex", alignItems: "flex-start", gap: 12 }}>
          {isComplete ? <CheckCircle2 size={20} color="#3B6D11" style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertCircle size={20} color="#C2410C" style={{ flexShrink: 0, marginTop: 2 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: isComplete ? "#3B6D11" : "#C2410C", marginBottom: 8 }}>
              {isComplete ? "✓ Profile Complete" : `Profile ${progressPercentage}% Complete`}
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 8, height: 6, overflow: "hidden", marginBottom: 4 }}>
              <div style={{ backgroundColor: isComplete ? "#3B6D11" : O, height: "100%", width: `${progressPercentage}%`, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 12, color: isComplete ? "#3B6D11" : "#64748b" }}>
              {completedFields} of {totalFields} fields filled
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ backgroundColor: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 18, padding: "32px 36px" }}>
            {/* Profile Image Section */}
            <div style={{ marginBottom: 32, textAlign: "center", paddingBottom: 28, borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: 16, fontWeight: 600 }}>Profile Picture</h3>
              <div style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto 16px", backgroundColor: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `3px solid ${BORDER}` }}>
                {profileImage ? (
                  <img src={profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 14, color: "#999" }}>No Image</span>
                )}
              </div>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", backgroundColor: O_LITE, border: `1px solid ${O_MID}`, borderRadius: 9, cursor: uploadingImage ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, color: O, opacity: uploadingImage ? 0.6 : 1, fontFamily: "inherit" }}>
                <Upload size={16} />
                <span>{uploadingImage ? "Uploading..." : "Change Photo"}</span>
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageUpload} disabled={uploadingImage} style={{ display: "none" }} />
              </label>
            </div>

            {/* Form Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <InputField
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                helper="Your full name as it appears in official documents"
              />
              <InputField
                label="Email Address"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                type="email"
                required
                helper="We'll use this for important notifications"
              />
              <InputField
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="1234567890"
                required
                helper="10-digit mobile number"
              />
              <InputField
                label="Company/Organization"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="e.g. Tech Corp Ltd"
                required
                helper="Your current company or organization"
              />
              {isReferrer && (
                <>
                  <InputField
                    label="Years of Experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="e.g. 5"
                    type="number"
                    required
                    helper="Total years of professional experience"
                  />
                  <InputField
                    label="LinkedIn Profile URL"
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                    helper="Optional: Link to your LinkedIn profile"
                  />
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 24 }}>
              <button
                type="button"
                onClick={() => router.back()}
                style={{ padding: "12px 24px", border: `1.5px solid ${BORDER}`, borderRadius: 10, backgroundColor: "#fff", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !isComplete}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  backgroundColor: saving || !isComplete ? O_LITE : O,
                  color: saving || !isComplete ? O : "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: saving || !isComplete ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: saving || !isComplete ? "none" : `0 4px 14px rgba(232,119,34,0.28)`,
                  opacity: saving || !isComplete ? 0.6 : 1
                }}>
                <Save size={16} /> {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </form>

        {!isComplete && (
          <div style={{ backgroundColor: "#FEF2F2", border: `1.5px solid #FECACA`, borderRadius: 16, padding: "16px 20px", marginTop: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#dc2626", marginBottom: 4 }}>Complete your profile to save</div>
              <div style={{ fontSize: 12, color: "#991b1b" }}>Fill in all required fields marked with * to enable the save button</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
