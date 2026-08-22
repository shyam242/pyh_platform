// server/utils/uploadMemory.js
//
// Shared multer memoryStorage factory. Files land in req.file.buffer /
// req.files[i].buffer instead of on local disk, so route handlers can hand
// the buffer straight to r2Storage.uploadBufferToR2() — nothing ever touches
// the container's filesystem, which is what made resumes disappear before.

import multer from "multer";

const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

export function makeResumeUpload({ maxSizeMB = 10, allowImages = false } = {}) {
  const allowedMimes = allowImages
    ? [...RESUME_MIME_TYPES, ...IMAGE_MIME_TYPES, "image/jpeg", "image/png", "image/webp"]
    : RESUME_MIME_TYPES;
  const allowedExts = allowImages
    ? [...RESUME_EXTENSIONS, ".jpg", ".jpeg", ".png", ".webp"]
    : RESUME_EXTENSIONS;

  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = "." + (file.originalname.split(".").pop() || "").toLowerCase();
      if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            allowImages
              ? "Only PDF, Word (.doc/.docx), or image (.jpg/.png/.webp) files are allowed"
              : "Only PDF and DOC/DOCX files are allowed"
          )
        );
      }
    },
  });
}

export function makeImageUpload({ maxSizeMB = 5 } = {}) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPG, PNG and WEBP images are allowed"));
      }
    },
  });
}

export function makeCsvUpload() {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
        cb(null, true);
      } else {
        cb(new Error("Only CSV files are allowed"));
      }
    },
  });
}
