import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createProfile, getUserProfile, updateUserProfile, uploadProfileImage, getBankDetails, updateBankDetails, createCandidateProfile, getCandidateProfile, updateCandidateProfile, verifyCandidateProfile, deleteCandidateProfile, getReferrerProfile } from "../controllers/ProfileController.js";
import { parseProjects } from "../controllers/jdMatchController.js";
import { protect } from "../middleware/authMiddleware.js";
import { extractResumeDetails } from "../services/resumeParserService.js";
import { makeResumeUpload } from "../utils/uploadMemory.js";
import { buildObjectKey, uploadBufferToR2, toR2Key } from "../utils/r2Storage.js";

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

const resumeUpload = makeResumeUpload({ maxSizeMB: 10 });

router.post("/create", createProfile);
router.get("/user", protect, getUserProfile);
router.put("/update", protect, updateUserProfile);
router.put("/avatar", protect, upload.single("image"), uploadProfileImage);
router.get("/bank-details", protect, getBankDetails);
router.put("/bank-details", protect, updateBankDetails);
router.post("/candidate", protect, createCandidateProfile);
router.get("/candidate", protect, getCandidateProfile);
router.put("/candidate", protect, updateCandidateProfile);

router.post("/upload-resume", protect, resumeUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    const objectKey = buildObjectKey("resumes/candidates", req.user.id, req.file.originalname);
    await uploadBufferToR2({
      buffer: req.file.buffer,
      key: objectKey,
      contentType: req.file.mimetype,
      originalName: req.file.originalname,
    });
    const storedValue = toR2Key(objectKey);

    let parsed = null;
    let parseNote = null;
    try {
      const extracted = await extractResumeDetails(req.file.buffer, req.file.originalname);
      parsed = extracted.parsed;
      parseNote = extracted.reason;
    } catch (err) {
      console.error("Resume auto-parse failed (non-fatal):", err.message);
    }

    res.json({
      message: "Resume uploaded successfully",
      filePath: storedValue,
      filename: req.file.originalname,
      parsed,
      parseNote,
    });
  } catch (error) {
    console.error("Error uploading resume:", error);
    res.status(500).json({ error: "Failed to upload resume" });
  }
});

router.post("/verify", protect, resumeUpload.single("file"), verifyCandidateProfile);
router.delete("/candidate", protect, deleteCandidateProfile);
router.post("/parse-projects", protect, parseProjects);
router.get("/referrer/:referrerId", getReferrerProfile);

export default router;
