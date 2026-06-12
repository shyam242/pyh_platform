import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createProfile, getUserProfile, updateUserProfile, uploadProfileImage, getBankDetails, updateBankDetails, createCandidateProfile, getCandidateProfile, updateCandidateProfile, verifyCandidateProfile, deleteCandidateProfile } from "../controllers/ProfileController.js";
import { parseProjects } from "../controllers/jdMatchController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../../uploads/profile_images");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const resumeDir = path.join(__dirname, "../../uploads/resumes");
if (!fs.existsSync(resumeDir)) {
  fs.mkdirSync(resumeDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `profile-${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, uniqueName);
  },
});

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resumeDir),
  filename: (req, file, cb) => {
    const uniqueName = `resume-${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
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

const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOC/DOCX files are allowed"));
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

// CREATE CANDIDATE PROFILE (After role selection)
router.post("/candidate", protect, createCandidateProfile);

// GET CANDIDATE PROFILE
router.get("/candidate", protect, getCandidateProfile);

// UPDATE CANDIDATE PROFILE
router.put("/candidate", protect, updateCandidateProfile);

// UPLOAD RESUME (For candidates)
router.post("/upload-resume", protect, resumeUpload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    const filePath = `/uploads/resumes/${req.file.filename}`;
    res.json({
      message: "Resume uploaded successfully",
      filePath: filePath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error("Error uploading resume:", error);
    res.status(500).json({ error: "Failed to upload resume" });
  }
});

// VERIFY CANDIDATE PROFILE (Resume & Skills)
router.post("/verify", protect, resumeUpload.single("file"), verifyCandidateProfile);

// DELETE CANDIDATE PROFILE
router.delete("/candidate", protect, deleteCandidateProfile);

// PARSE PROJECTS FROM RESUME
router.post("/parse-projects", protect, parseProjects);

export default router;   // ⭐ VERY IMPORTANT
