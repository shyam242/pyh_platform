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
  getResumeViewStats,
  setCandidateStatus,
  getMyCandidateStatuses
} from "../controllers/recruitercontroller.js";
import { protect } from "../middleware/authMiddleware.js";
import { analyzeCandidate, matchJD } from "../controllers/aiController.js";
import { jdUpload, uploadJD, filterCandidates, bulkAnalyze, parseProjects, searchByProjects, getMatchHistory, getCandidateMatchResult } from "../controllers/jdMatchController.js";
import { checkRecruiterApproved } from "../middleware/recruiterMiddleware.js";
import {
  fakeExperienceUpload,
  recruiterAnalyze,
  recruiterGetLast,
  recruiterClearLast,
} from "../controllers/fakeExperienceController.js";

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
router.post("/track-view", protect, trackResumeView);
router.get("/resume-view-stats", protect, getResumeViewStats);

// Private per-recruiter candidate status (not visible to other recruiters)
router.put("/candidate-status", protect, checkRecruiterApproved, setCandidateStatus);
router.get("/candidate-statuses", protect, checkRecruiterApproved, getMyCandidateStatuses);

router.post("/ai/analyze/:referralId", protect, checkRecruiterApproved, analyzeCandidate);
router.post("/ai/match-jd/:referralId", protect, checkRecruiterApproved, matchJD);

// Bulk JD-CV match flow
router.post("/jd/upload", protect, checkRecruiterApproved, jdUpload.single("jd_file"), uploadJD);
router.post("/jd/filter-candidates", protect, checkRecruiterApproved, filterCandidates);
router.post("/jd/bulk-analyze", protect, checkRecruiterApproved, bulkAnalyze);
router.get("/projects/search", protect, checkRecruiterApproved, searchByProjects);
router.get("/jd/match-history", protect, checkRecruiterApproved, getMatchHistory);
router.get("/jd/match-result/:candidateId", protect, checkRecruiterApproved, getCandidateMatchResult);

// Fake Experience Check — upload a batch of resumes (+ optional JD), get an
// authenticity report back. Nothing here is persisted: files are processed
// in memory only, and only the single most-recent batch is kept server-side
// (in RAM, not the database) so the recruiter can revisit it as "last
// uploaded CVs" until they run a new batch or the server restarts.
router.post("/fake-experience/analyze", protect, checkRecruiterApproved, fakeExperienceUpload, recruiterAnalyze);
router.get("/fake-experience/last", protect, checkRecruiterApproved, recruiterGetLast);
router.delete("/fake-experience/last", protect, checkRecruiterApproved, recruiterClearLast);

export default router;
