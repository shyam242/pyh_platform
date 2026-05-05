import express from "express";
import { sendOtp, verifyOtp } from "../controllers/authControllers.js";
import { verifyEmailConfig } from "../controllers/emailController.js";

const router = express.Router();

// 📩 Send OTP
router.post("/send-otp", sendOtp);

// 🔐 Verify OTP
router.post("/verify-otp", verifyOtp);

// 🧪 Test email configuration (debug endpoint)
router.get("/test-email", verifyEmailConfig);

export default router;
