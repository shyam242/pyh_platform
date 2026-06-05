"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    experience: "",
    phone: ""
  });

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
      console.log("Fetched user data:", data); // Debug log
      setUser(data);
      setProfileImage(data.image_url || null);
      setFormData({
        name: data.name || "",
        company: data.company || "",
        experience: data.experience || "",
        phone: data.phone || ""
      });
    } catch (err) {
      showError(err.message || "Failed to load profile");
      setTimeout(() => router.push("/dashboard"), 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showError("Please upload a valid image (JPEG, PNG, GIF, or WEBP)");
      return;
    }

    // Validate file size (max 5MB)
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
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataImg
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload image");
      }

      const data = await res.json();
      console.log("Image upload response:", data); // Debug log
      setProfileImage(data.user?.image_url);
      showSuccess("Profile image updated successfully!");
    } catch (err) {
      console.error("Image upload error:", err);
      showError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profile");
      }

      showSuccess("Profile updated successfully!");
      setTimeout(() => router.push("/profile"), 1500);
    } catch (err) {
      console.error("Update error:", err);
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", minHeight: "100vh" }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "40px", textAlign: "center", minHeight: "100vh" }}>
        <p>Failed to load profile</p>
      </div>
    );
  }

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
        <h2 style={{ margin: 0, flex: 1 }}>Edit Profile</h2>
      </div>

      {/* Form Content */}
      <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
        <form onSubmit={handleSubmit}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
          }}>
            {/* Profile Image Section */}
            <div style={{ marginBottom: "32px", textAlign: "center" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#333", fontSize: "16px", fontWeight: "600" }}>Profile Picture</h3>
              <div style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                margin: "0 auto 16px",
                backgroundColor: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "3px solid #e0e0e0"
              }}>
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: "14px", color: "#999" }}>No Image</span>
                )}
              </div>
              
              <label style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: "6px",
                cursor: uploadingImage ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s",
                opacity: uploadingImage ? 0.6 : 1
              }}
                onMouseEnter={(e) => !uploadingImage && (e.currentTarget.style.backgroundColor = "#efefef")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
              >
                <Upload size={16} />
                <span>{uploadingImage ? "Uploading..." : "Change Photo"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "24px" }}>
              {/* Name Field */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#333"
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    transition: "border 0.2s"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#1e88e5")}
                  onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                />
              </div>

              {/* Phone Field - Always show for all roles */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#333"
                }}>
                  Mobile Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10 digit phone number"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    transition: "border 0.2s"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#1e88e5")}
                  onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                />
              </div>

              {/* Company Field - Referrer Only */}
              {user?.role === "referrer" && (
                <div style={{ marginBottom: "24px" }}>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#333"
                  }}>
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      transition: "border 0.2s"
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#1e88e5")}
                    onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                  />
                </div>
              )}

              {/* Experience Field - Referrer Only */}
              {user?.role === "referrer" && (
                <div style={{ marginBottom: "24px" }}>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#333"
                  }}>
                    Experience (years)
                  </label>
                  <input
                    type="text"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="e.g., 5+ years"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      transition: "border 0.2s"
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#1e88e5")}
                    onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  backgroundColor: saving ? "#ccc" : "#1e88e5",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => !saving && (e.target.style.backgroundColor = "#1565c0")}
                onMouseLeave={(e) => !saving && (e.target.style.backgroundColor = "#1e88e5")}
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
