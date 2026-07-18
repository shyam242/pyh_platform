import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { protect } from "../middleware/authMiddleware.js";
import {
  getDashboardData,
  getAllCandidates,
  getCandidateDetails,
  getCandidatesByRole,
  updateReferrerIncentive,
  getReferrerIncentive,
  getAllReferrersWithIncentives,
  getReferrerFullDetails,
  updateReferralIncentiveStatus,
  deleteReferrer,
  sendReferrerEmail,
  deleteCandidate,
  bulkUploadJobs,
  bulkUploadCandidates,
  uploadCandidatesCSV,
  getBulkUploadedCandidates,
  deleteBulkCandidate,
  revokeReferrerIncentive,
  updateBulkCandidateStatus,
  getCandidateStatusStats,
  bulkUploadResumeLinks,
  bulkUploadResumeFiles,
  updateBulkCandidateDetails,
  updateCandidateDetails,
  getUnifiedCandidateStatusList,
  getUnifiedCandidateStatusOverview,
  updateUnifiedCandidateStatus,
  exportUnifiedCandidateStatusCSV,
  getReferralsForAdmin,
  getRecruiterCandidateStatuses,
  getRecruiterApprovalCenter,
  getRecruiterDetails,
  exportRecruitersCSV,
  approveRecruiterV2,
  rejectRecruiterV2,
  reconsiderRecruiter,
} from "../controllers/adminController.js";
import { adminParseProjects } from "../controllers/jdMatchController.js";
import {
  fakeExperienceUpload,
  adminAnalyze,
  adminGetLast,
  adminClearLast,
} from "../controllers/fakeExperienceController.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads")),
  filename: (req, file, cb) => {
    const uniqueName = `candidates-${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// Setup multer for direct resume file uploads (PDFs, up to 50 at once)
const resumeUploadDir = path.join(__dirname, "../../uploads/resumes/bulk");
if (!fs.existsSync(resumeUploadDir)) fs.mkdirSync(resumeUploadDir, { recursive: true });

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resumeUploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `resume-${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, uniqueName);
  },
});

// Accepted so that even resumes we can't auto-parse (scanned images, legacy
// .doc, etc.) are still kept on disk and attached to a manual-review
// candidate record instead of being rejected outright.
const RESUME_EXT_ALLOWLIST = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"];

const uploadResumes = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (RESUME_EXT_ALLOWLIST.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, Word (.doc/.docx), or image (.jpg/.png/.webp) files are allowed"));
    }
  },
});

// DASHBOARD
router.get("/dashboard", protect, getDashboardData);

// CANDIDATES
router.get("/candidates", protect, getAllCandidates);
router.get("/candidates/:candidateId", protect, getCandidateDetails);
router.delete("/candidates/:candidateId", protect, deleteCandidate);

// USERS BY ROLE
router.get("/users/:role", protect, getCandidatesByRole);
router.get("/users/recruiter/:recruiterId", protect, getRecruiterDetails);

// RECRUITER MANAGEMENT
router.put("/recruiters/:recruiterId/approve", protect, approveRecruiterV2);
router.put("/recruiters/:recruiterId/reject", protect, rejectRecruiterV2);
router.put("/recruiters/:recruiterId/reconsider", protect, reconsiderRecruiter);
router.get("/recruiters/approval-center", protect, getRecruiterApprovalCenter);
router.get("/recruiters/export", protect, exportRecruitersCSV);

// INCENTIVE MANAGEMENT
router.get("/referrers", protect, getAllReferrersWithIncentives);
router.get("/referrers/:referrerId", protect, getReferrerFullDetails);
router.delete("/referrers/:referrerId", protect, deleteReferrer);
router.post("/referrers/:referrerId/email", protect, sendReferrerEmail);
router.put("/referrals/:referralId/incentive-status", protect, updateReferralIncentiveStatus);
router.get("/incentives/:referrerId", getReferrerIncentive);
router.put("/incentives/:referrerId", protect, updateReferrerIncentive);
router.delete("/incentives/:referrerId", protect, revokeReferrerIncentive);

// BULK UPLOADS
router.post("/bulk-upload/jobs", protect, bulkUploadJobs);
router.post("/bulk-upload/candidates", protect, bulkUploadCandidates);
router.post("/bulk-upload/csv", protect, upload.single("csvFile"), uploadCandidatesCSV);
router.post("/bulk-upload/resume-links", protect, bulkUploadResumeLinks);
router.post("/bulk-upload/resume-files", protect, uploadResumes.array("resumes", 50), bulkUploadResumeFiles);
router.get("/bulk-candidates", protect, getBulkUploadedCandidates);
router.delete("/bulk-candidates/:candidateId", protect, deleteBulkCandidate);

// CANDIDATE STATUS MANAGEMENT
router.put("/bulk-candidates/:candidateId/status", protect, updateBulkCandidateStatus);
router.put("/bulk-candidates/:candidateId/details", protect, updateBulkCandidateDetails);
router.put("/candidates/:candidateId/details", protect, updateCandidateDetails);
router.get("/candidate-status-stats", protect, getCandidateStatusStats);

// UNIFIED CANDIDATE STATUS MANAGEMENT (portal + bulk, tagged & filterable)
router.get("/candidate-status/list", protect, getUnifiedCandidateStatusList);
router.get("/candidate-status/overview", protect, getUnifiedCandidateStatusOverview);
router.get("/candidate-status/export", protect, exportUnifiedCandidateStatusCSV);
router.put("/candidate-status/:source/:id", protect, updateUnifiedCandidateStatus);
router.get("/referrals", protect, getReferralsForAdmin);
router.get("/recruiter-candidate-statuses", protect, getRecruiterCandidateStatuses);

// PROJECT PARSING (admin can trigger for any candidate)
router.post("/candidates/:userId/parse-projects", protect, adminParseProjects);

// Fake Experience Check — same feature as the recruiter version, kept as a
// separate route/store namespace so an admin's "last uploaded batch" doesn't
// collide with any recruiter's. Nothing here is persisted to the database.
router.post("/fake-experience/analyze", protect, fakeExperienceUpload, adminAnalyze);
router.get("/fake-experience/last", protect, adminGetLast);
router.delete("/fake-experience/last", protect, adminClearLast);

export default router;
