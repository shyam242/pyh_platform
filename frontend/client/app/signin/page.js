"use client";
import { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { validateEmail, validateOTP } from "@/utils/validation";

export default function Signin() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const sendOtp = async () => {
    setErrors({});

    if (!email) {
      setErrors({ email: "Email is required" });
      showError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: "Invalid email format" });
      showError("Invalid email format");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if(!res.ok) throw new Error("Failed to send OTP");
      
      setOtpSent(true);
      showSuccess("OTP sent to your email");
    } catch (err) {
      showError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
  };

  const verify = async () => {
    setErrors({});

    if (!otp || !validateOTP(otp)) {
      setErrors({ otp: "OTP must be 6 digits" });
      showError("OTP must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const rawText = await res.text();
      let data = null;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.error("verify-otp non-json response:", res.status, rawText);
      }

      if (!res.ok) {
        console.error("verify-otp error:", res.status, data || rawText);
        const errorMessage = data?.message || data?.error || rawText || `Request failed with status ${res.status}`;
        throw new Error(errorMessage);
      }

      if (data.newUser) {
        localStorage.setItem("email", email);
        showSuccess("Account created. Complete your profile!");
        window.location.href = "/create-profile";
        return;
      }

      localStorage.setItem("token", data.token);
      showSuccess("Login successful!");
      if (data.isAdmin) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.error("verify error:", err);
      showError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#000" }}>
      {/* NAVBAR */}
      <nav style={{
        position: "fixed",
        top: 0,
        width: "100%",
        zIndex: 50,
        backgroundColor: "#fff",
        borderBottom: "1px solid #ddd",
        padding: "1rem 0"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer"
            }}
          >
            PickYourHire
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Back
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: "5rem" }}>
        <section style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem"
        }}>
          <div style={{ maxWidth: "500px", width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <h1 style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                marginBottom: "0.5rem"
              }}>
                Welcome Back
              </h1>
              <p style={{
                fontSize: "1rem",
                color: "#666",
                marginBottom: "1rem"
              }}>
                Sign in with secure OTP verification
              </p>
            </div>

            <div style={{
              padding: "2rem",
              border: "1px solid #ddd",
              borderRadius: "0.75rem",
              backgroundColor: "#f9f9f9"
            }}>
              {!otpSent ? (
                <>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                      color: "#333"
                    }}>
                      Email Address
                    </label>
                    <div style={{ position: "relative" }}>
                      <Mail style={{
                        position: "absolute",
                        left: "1rem",
                        top: "0.75rem",
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "#999"
                      }} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrors({ ...errors, email: "" });
                        }}
                        style={{
                          width: "100%",
                          paddingLeft: "2.75rem",
                          paddingRight: "1rem",
                          paddingTop: "0.75rem",
                          paddingBottom: "0.75rem",
                          border: errors.email ? "2px solid #dc2626" : "1px solid #ddd",
                          borderRadius: "0.5rem",
                          fontSize: "1rem",
                          boxSizing: "border-box",
                          outline: "none"
                        }}
                        onFocus={(e) => {
                          if (!errors.email) e.target.style.borderColor = "#000";
                        }}
                        onBlur={(e) => {
                          if (!errors.email) e.target.style.borderColor = "#ddd";
                        }}
                      />
                    </div>
                    {errors.email && (
                      <p style={{ color: "#dc2626", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={sendOtp}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "0.75rem 2rem",
                      backgroundColor: "#000",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem"
                    }}
                  >
                    {loading ? "Sending..." : "Send OTP"}
                    {!loading && <ArrowRight style={{ width: "1rem", height: "1rem" }} />}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                      color: "#333"
                    }}>
                      Enter 6-Digit OTP
                    </label>
                    <div style={{ position: "relative" }}>
                      <Lock style={{
                        position: "absolute",
                        left: "1rem",
                        top: "0.75rem",
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "#999"
                      }} />
                      <input
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={handleOtpChange}
                        maxLength="6"
                        style={{
                          width: "100%",
                          paddingLeft: "2.75rem",
                          paddingRight: "1rem",
                          paddingTop: "0.75rem",
                          paddingBottom: "0.75rem",
                          border: errors.otp ? "2px solid #dc2626" : "1px solid #ddd",
                          borderRadius: "0.5rem",
                          fontSize: "1.5rem",
                          textAlign: "center",
                          letterSpacing: "0.1em",
                          boxSizing: "border-box",
                          outline: "none",
                          fontFamily: "monospace"
                        }}
                        onFocus={(e) => {
                          if (!errors.otp) e.target.style.borderColor = "#000";
                        }}
                        onBlur={(e) => {
                          if (!errors.otp) e.target.style.borderColor = "#ddd";
                        }}
                      />
                    </div>
                    {errors.otp && (
                      <p style={{ color: "#dc2626", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                        {errors.otp}
                      </p>
                    )}
                    <p style={{ color: "#999", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                      Check your inbox for the code
                    </p>
                  </div>

                  <button
                    onClick={verify}
                    disabled={loading || otp.length !== 6}
                    style={{
                      width: "100%",
                      padding: "0.75rem 2rem",
                      backgroundColor: "#000",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: loading || otp.length !== 6 ? "not-allowed" : "pointer",
                      opacity: loading || otp.length !== 6 ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      marginBottom: "1rem"
                    }}
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                    {!loading && <ArrowRight style={{ width: "1rem", height: "1rem" }} />}
                  </button>

                  <button
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setErrors({});
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem 2rem",
                      backgroundColor: "#fff",
                      color: "#000",
                      border: "1px solid #ddd",
                      borderRadius: "0.5rem",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Use Different Email
                  </button>
                </>
              )}
              </div>
          </div>
        </section>
      </main>
    </div>
  );
}
