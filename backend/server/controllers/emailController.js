import { verifyBrevoConfig } from "../services/brevoService.js";

export const verifyEmailConfig = async (req, res) => {
  try {
    console.log("📋 Email Configuration Check:");
    console.log("BREVO_API_KEY:", process.env.BREVO_API_KEY ? "✓ Configured" : "✗ Missing");
    console.log("SENDER_EMAIL:", process.env.SENDER_EMAIL || "noreply@pyh-consultants.com");
    console.log("SENDER_NAME:", process.env.SENDER_NAME || "PYH Consultants");
    console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "Not set");

    if (!process.env.BREVO_API_KEY) {
      return res.status(400).json({
        status: "error",
        message: "Email service not configured",
        issues: {
          BREVO_API_KEY: "Missing",
        },
      });
    }

    // Verify Brevo configuration
    const isValid = await verifyBrevoConfig();

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Brevo API verification failed",
        hint: "Please check your BREVO_API_KEY configuration",
      });
    }

    res.json({
      status: "success",
      message: "Email configuration is valid",
      provider: "Brevo",
      senderEmail: process.env.SENDER_EMAIL || "noreply@pyh-consultants.com",
      senderName: process.env.SENDER_NAME || "PYH Consultants",
    });
  } catch (error) {
    console.error("Email verification failed:", error.message);
    res.status(400).json({
      status: "error",
      message: "Email configuration test failed",
      error: error.message,
      hint: "Please ensure your BREVO_API_KEY is correct. Visit: https://app.brevo.com/settings/keys",
    });
  }
};
