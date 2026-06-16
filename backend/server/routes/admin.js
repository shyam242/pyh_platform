import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { protect } from "../middleware/authMiddleware.js";
import {
  getDashboardData,
  getAllCandidates,
  getCandidateDetails,
  getCandidatesByRole,
  approveRecruiter,
  rejectRecruiter,
  updateReferrerIncentive,
  getReferrerIncentive,
  getAllReferrersWithIncentives,
  deleteCandidate,
  bulkUploadJobs,
  bulkUploadCandidates,
  uploadCandidatesCSV,
  getBulkUploadedCandidates,
  deleteBulkCandidate,
  revokeReferrerIncentive,
  updateBulkCandidateStatus,
  getCandidateStatusStats
} from "../controllers/adminController.js";
import { adminParseProjects } from "../controllers/jdMatchController.js";

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

// DASHBOARD
router.get("/dashboard", protect, getDashboardData);

// CANDIDATES
router.get("/candidates", protect, getAllCandidates);
router.get("/candidates/:candidateId", protect, getCandidateDetails);
router.delete("/candidates/:candidateId", protect, deleteCandidate);

// USERS BY ROLE
router.get("/users/:role", protect, getCandidatesByRole);

// RECRUITER MANAGEMENT
router.put("/recruiters/:recruiterId/approve", protect, approveRecruiter);
router.put("/recruiters/:recruiterId/reject", protect, rejectRecruiter);

// INCENTIVE MANAGEMENT
router.get("/referrers", protect, getAllReferrersWithIncentives);
router.get("/incentives/:referrerId", getReferrerIncentive);
router.put("/incentives/:referrerId", protect, updateReferrerIncentive);
router.delete("/incentives/:referrerId", protect, revokeReferrerIncentive);

// BULK UPLOADS
router.post("/bulk-upload/jobs", protect, bulkUploadJobs);
router.post("/bulk-upload/candidates", protect, bulkUploadCandidates);
router.post("/bulk-upload/csv", protect, upload.single("csvFile"), uploadCandidatesCSV);
router.get("/bulk-candidates", protect, getBulkUploadedCandidates);
router.delete("/bulk-candidates/:candidateId", protect, deleteBulkCandidate);

// CANDIDATE STATUS MANAGEMENT
router.put("/bulk-candidates/:candidateId/status", protect, updateBulkCandidateStatus);
router.get("/candidate-status-stats", protect, getCandidateStatusStats);

// PROJECT PARSING (admin can trigger for any candidate)
router.post("/candidates/:userId/parse-projects", protect, adminParseProjects);

export default router;
