import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { 
  getAllReferrals, 
  updateStatus,
  verifyProfile,
  downloadReferralCv,
  downloadCandidateResume,
  getReferralDetails,
  getApprovalStatus,
  trackResumeView,
  getResumeViewStats
} from "../controllers/recruitercontroller.js";
import { protect } from "../middleware/authMiddleware.js";
import { checkRecruiterApproved } from "../middleware/recruiterMiddleware.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../../uploads/resumes");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadDir); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "resume-" + uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/approval-status", protect, getApprovalStatus);
router.get("/all", protect, checkRecruiterApproved, getAllReferrals);
router.get("/:referralId/details", protect, checkRecruiterApproved, getReferralDetails);
router.post("/update", protect, checkRecruiterApproved, updateStatus);
router.post("/verify", protect, checkRecruiterApproved, upload.single("resume"), verifyProfile);
router.get("/:referralId/cv/download", protect, checkRecruiterApproved, downloadReferralCv);
router.get("/candidate/:userId/resume/download", protect, checkRecruiterApproved, downloadCandidateResume);
router.post("/track-view", protect, checkRecruiterApproved, trackResumeView);
router.get("/resume-view-stats", protect, getResumeViewStats);

export default router;
