import express from "express";
import { sendOtp, verifyOtp } from "../controllers/authControllers.js";
import { verifyEmailConfig } from "../controllers/emailController.js";
import { generateMagicLink, validateMagicLink, getInvitedReferrers } from "../controllers/magicLinkController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// OTP auth
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Magic link — generate (requires logged-in referrer) & validate (public)
router.post("/magic-link/generate", protect, generateMagicLink);
router.get("/magic-link/invitees/me", protect, getInvitedReferrers);
router.get("/magic-link/:token", validateMagicLink);

// Debug
router.get("/test-email", verifyEmailConfig);

export default router;
