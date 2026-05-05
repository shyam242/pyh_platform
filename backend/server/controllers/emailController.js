import nodemailer from "nodemailer";

export const verifyEmailConfig = async (req, res) => {
  try {
    console.log("📋 Email Configuration Check:");
    console.log("EMAIL_USER:", process.env.EMAIL_USER ? "✓ Configured" : "✗ Missing");
    console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "✓ Configured" : "✗ Missing");
    console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "Not set");

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return res.status(400).json({
        status: "error",
        message: "Email credentials not configured",
        issues: {
          EMAIL_USER: !process.env.EMAIL_USER ? "Missing" : "Configured",
          EMAIL_PASSWORD: !process.env.EMAIL_PASSWORD ? "Missing" : "Configured",
        },
      });
    }

    // Try to verify credentials
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.verify();

    res.json({
      status: "success",
      message: "Email configuration is valid",
      email: process.env.EMAIL_USER,
    });
  } catch (error) {
    console.error("Email verification failed:", error.message);
    res.status(400).json({
      status: "error",
      message: "Email configuration test failed",
      error: error.message,
      hint: "Make sure you're using a Gmail App Password, not your regular password. Visit: https://myaccount.google.com/apppasswords",
    });
  }
};
