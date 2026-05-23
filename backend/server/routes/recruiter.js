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
  getApprovalStatus
} from "../controllers/recruitercontroller.js";
import { protect } from "../middleware/authMiddleware.js";
import { checkRecruiterApproved } from "../middleware/recruiterMiddleware.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory with absolute path
const uploadDir = path.join(__dirname, "../../uploads/resumes");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "resume-" + uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Get recruiter approval status (any recruiter can check their own status)
router.get("/approval-status", protect, getApprovalStatus);

// Restricted endpoints - only approved recruiters
router.get("/all", protect, checkRecruiterApproved, getAllReferrals);
router.get("/:referralId/details", protect, checkRecruiterApproved, getReferralDetails);
router.post("/update", protect, checkRecruiterApproved, updateStatus);
router.post("/verify", protect, checkRecruiterApproved, upload.single("resume"), verifyProfile);
router.get("/:referralId/cv/download", protect, checkRecruiterApproved, downloadReferralCv);
router.get("/candidate/:userId/resume/download", protect, checkRecruiterApproved, downloadCandidateResume);

export default router;
