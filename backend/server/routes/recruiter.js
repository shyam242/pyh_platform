import express from "express";
import path from "path";
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
import {
  listCandidatesForReports,
  generateReports,
  downloadReportPdf,
  getReportHistory,
} from "../controllers/candidateReportController.js";
import { makeResumeUpload } from "../utils/uploadMemory.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = makeResumeUpload({ maxSizeMB: 5 });

router.get("/approval-status", protect, getApprovalStatus);
router.get("/all", protect, checkRecruiterApproved, getAllReferrals);
router.get("/:referralId/details", protect, checkRecruiterApproved, getReferralDetails);
router.post("/update", protect, checkRecruiterApproved, updateStatus);
router.post("/verify", protect, checkRecruiterApproved, upload.single("resume"), verifyProfile);
router.get("/:referralId/cv/download", protect, checkRecruiterApproved, downloadReferralCv);
router.get("/candidate/:userId/resume/download", protect, checkRecruiterApproved, downloadCandidateResume);
router.post("/track-view", protect, trackResumeView);
router.get("/resume-view-stats", protect, getResumeViewStats);

router.put("/candidate-status", protect, checkRecruiterApproved, setCandidateStatus);
router.get("/candidate-statuses", protect, checkRecruiterApproved, getMyCandidateStatuses);

router.post("/ai/analyze/:referralId", protect, checkRecruiterApproved, analyzeCandidate);
router.post("/ai/match-jd/:referralId", protect, checkRecruiterApproved, matchJD);

router.post("/jd/upload", protect, checkRecruiterApproved, jdUpload.single("jd_file"), uploadJD);
router.post("/jd/filter-candidates", protect, checkRecruiterApproved, filterCandidates);
router.post("/jd/bulk-analyze", protect, checkRecruiterApproved, bulkAnalyze);
router.get("/projects/search", protect, checkRecruiterApproved, searchByProjects);
router.get("/jd/match-history", protect, checkRecruiterApproved, getMatchHistory);
router.get("/jd/match-result/:candidateId", protect, checkRecruiterApproved, getCandidateMatchResult);

router.post("/fake-experience/analyze", protect, checkRecruiterApproved, fakeExperienceUpload, recruiterAnalyze);
router.get("/fake-experience/last", protect, checkRecruiterApproved, recruiterGetLast);
router.delete("/fake-experience/last", protect, checkRecruiterApproved, recruiterClearLast);

router.get("/reports/candidates", protect, checkRecruiterApproved, listCandidatesForReports);
router.post("/reports/generate", protect, checkRecruiterApproved, generateReports);
router.get("/reports/:reportId/download", protect, checkRecruiterApproved, downloadReportPdf);
router.get("/reports/history", protect, checkRecruiterApproved, getReportHistory);

export default router;
