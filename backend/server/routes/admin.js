import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { protect } from "../middleware/authMiddleware.js";
import { makeResumeUpload } from "../utils/uploadMemory.js";
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
  getBulkCandidateDetails,
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
  getReferredCandidateDetails,
  updateReferredCandidateDetails,
  deleteReferredCandidate,
  getRecruiterCandidateStatuses,
  getRecruiterApprovalCenter,
  getRecruiterDetails,
  updateRecruiterProfile,
  exportRecruitersCSV,
  approveRecruiterV2,
  rejectRecruiterV2,
  reconsiderRecruiter,
  deleteRecruiter,
} from "../controllers/adminController.js";
import { adminParseProjects } from "../controllers/jdMatchController.js";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
} from "../controllers/notificationController.js";
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

const uploadResumes = makeResumeUpload({ maxSizeMB: 10, allowImages: true });

router.get("/dashboard", protect, getDashboardData);

router.get("/notifications", protect, getNotifications);
router.get("/notifications/unread-count", protect, getUnreadNotificationCount);
router.put("/notifications/:id/read", protect, markNotificationRead);

router.get("/candidates", protect, getAllCandidates);
router.get("/candidates/:candidateId", protect, getCandidateDetails);
router.delete("/candidates/:candidateId", protect, deleteCandidate);

router.get("/users/:role", protect, getCandidatesByRole);
router.get("/users/recruiter/:recruiterId", protect, getRecruiterDetails);
router.put("/users/recruiter/:recruiterId", protect, updateRecruiterProfile);

router.put("/recruiters/:recruiterId/approve", protect, approveRecruiterV2);
router.put("/recruiters/:recruiterId/reject", protect, rejectRecruiterV2);
router.put("/recruiters/:recruiterId/reconsider", protect, reconsiderRecruiter);
router.delete("/recruiters/:recruiterId", protect, deleteRecruiter);
router.get("/recruiters/approval-center", protect, getRecruiterApprovalCenter);
router.get("/recruiters/export", protect, exportRecruitersCSV);

router.get("/referrers", protect, getAllReferrersWithIncentives);
router.get("/referrers/:referrerId", protect, getReferrerFullDetails);
router.delete("/referrers/:referrerId", protect, deleteReferrer);
router.post("/referrers/:referrerId/email", protect, sendReferrerEmail);
router.put("/referrals/:referralId/incentive-status", protect, updateReferralIncentiveStatus);
router.get("/incentives/:referrerId", getReferrerIncentive);
router.put("/incentives/:referrerId", protect, updateReferrerIncentive);
router.delete("/incentives/:referrerId", protect, revokeReferrerIncentive);

router.post("/bulk-upload/jobs", protect, bulkUploadJobs);
router.post("/bulk-upload/candidates", protect, bulkUploadCandidates);
router.post("/bulk-upload/csv", protect, upload.single("csvFile"), uploadCandidatesCSV);
router.post("/bulk-upload/resume-links", protect, bulkUploadResumeLinks);
router.post("/bulk-upload/resume-files", protect, uploadResumes.array("resumes", 50), bulkUploadResumeFiles);
router.get("/bulk-candidates", protect, getBulkUploadedCandidates);
router.get("/bulk-candidates/:candidateId", protect, getBulkCandidateDetails);
router.delete("/bulk-candidates/:candidateId", protect, deleteBulkCandidate);

router.put("/bulk-candidates/:candidateId/status", protect, updateBulkCandidateStatus);
router.put("/bulk-candidates/:candidateId/details", protect, updateBulkCandidateDetails);
router.put("/candidates/:candidateId/details", protect, updateCandidateDetails);
router.get("/candidate-status-stats", protect, getCandidateStatusStats);

router.get("/candidate-status/list", protect, getUnifiedCandidateStatusList);
router.get("/candidate-status/overview", protect, getUnifiedCandidateStatusOverview);
router.get("/candidate-status/export", protect, exportUnifiedCandidateStatusCSV);
router.put("/candidate-status/:source/:id", protect, updateUnifiedCandidateStatus);
router.get("/referrals", protect, getReferralsForAdmin);
router.get("/referred-candidates/:referralId", protect, getReferredCandidateDetails);
router.put("/referred-candidates/:referralId/details", protect, updateReferredCandidateDetails);
router.delete("/referred-candidates/:referralId", protect, deleteReferredCandidate);
router.get("/recruiter-candidate-statuses", protect, getRecruiterCandidateStatuses);

router.post("/candidates/:userId/parse-projects", protect, adminParseProjects);

router.post("/fake-experience/analyze", protect, fakeExperienceUpload, adminAnalyze);
router.get("/fake-experience/last", protect, adminGetLast);
router.delete("/fake-experience/last", protect, adminClearLast);

export default router;
