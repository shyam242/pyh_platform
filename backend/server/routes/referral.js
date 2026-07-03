import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  createReferral,
  getMyReferrals,
  getReferrerStats,
  acceptReferral,
  getReferralById,
  updateReferral,
  getReferrerById,
} from "../controllers/referralController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory with absolute path
const uploadDir = path.join(__dirname, "../../uploads/cv");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // make unique filename
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  },
});

// ✅ Multer setup
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOC files are allowed"));
    }
  },
});

// Routes
router.post("/create", protect, upload.single("cv"), createReferral);
router.get("/my", protect, getMyReferrals);
router.get("/stats", protect, getReferrerStats);
router.get("/:referralId", getReferralById);
router.put("/:referralId/update", updateReferral);
router.post("/:referralId/accept", acceptReferral);
router.get("/referrer/:referrerId", getReferrerById);

export default router;
