import express from "express";
import { sendOtp, verifyOtp, adminLogin } from "../controllers/authControllers.js";
import { verifyEmailConfig } from "../controllers/emailController.js";
import { generateMagicLink, validateMagicLink, getInvitedReferrers } from "../controllers/magicLinkController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// OTP auth (non-admin users)
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Admin password login (no OTP) — see ADMIN_EMAILS / ADMIN_PASSWORD env vars
router.post("/admin-login", adminLogin);

// Magic link — generate (requires logged-in referrer) & validate (public)
router.post("/magic-link/generate", protect, generateMagicLink);
router.get("/magic-link/invitees/me", protect, getInvitedReferrers);
router.get("/magic-link/:token", validateMagicLink);

// Debug
router.get("/test-email", verifyEmailConfig);

export default router;
