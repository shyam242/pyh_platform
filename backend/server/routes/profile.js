import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createProfile, getUserProfile, updateUserProfile, uploadProfileImage, getBankDetails, updateBankDetails } from "../controllers/ProfileController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../../uploads/profile_images");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `profile-${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG and WEBP images are allowed"));
    }
  },
});

// CREATE PROFILE
router.post("/create", createProfile);

// GET USER PROFILE
router.get("/user", protect, getUserProfile);

// UPDATE USER PROFILE
router.put("/update", protect, updateUserProfile);

// UPLOAD PROFILE IMAGE
router.put("/avatar", protect, upload.single("image"), uploadProfileImage);

// GET BANK DETAILS
router.get("/bank-details", protect, getBankDetails);

// UPDATE BANK DETAILS (Referrer only)
router.put("/bank-details", protect, updateBankDetails);

export default router;   // ⭐ VERY IMPORTANT
