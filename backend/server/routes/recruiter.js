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
  getReferralDetails
} from "../controllers/recruitercontroller.js";
import { protect } from "../middleware/authMiddleware.js";

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

router.get("/all", getAllReferrals);
router.get("/:referralId/details", getReferralDetails);
router.post("/update", updateStatus);
router.post("/verify", protect, upload.single("resume"), verifyProfile);
router.get("/:referralId/cv/download", downloadReferralCv);
router.get("/candidate/:userId/resume/download", downloadCandidateResume);

export default router;
