import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  createReferral,
  getMyReferrals,
  getReferrerStats,
  acceptReferral,
  rejectReferral,
  getReferralById,
  updateReferral,
  getReferrerById,
} from "../controllers/referralController.js";
import { protect } from "../middleware/authMiddleware.js";
import { makeResumeUpload } from "../utils/uploadMemory.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = makeResumeUpload({ maxSizeMB: 5 });

router.post("/create", protect, upload.single("cv"), createReferral);
router.get("/my", protect, getMyReferrals);
router.get("/stats", protect, getReferrerStats);
router.get("/:referralId", getReferralById);
router.put("/:referralId/update", updateReferral);
router.post("/:referralId/accept", acceptReferral);
router.post("/:referralId/reject", rejectReferral);
router.get("/referrer/:referrerId", getReferrerById);

export default router;
