import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  bulkDeleteJobs,
  getAdminJobs,
  applyForJob,
  getJobApplications,
  getCandidateAppliedCount,
  getCandidateAppliedJobs
} from "../controllers/jobController.js";

const router = express.Router();

// ── SPECIFIC routes MUST come before /:jobId parameterized routes ──

// PUBLIC - GET ALL ACTIVE JOBS
router.get("/", getAllJobs);

// CANDIDATE - GET APPLIED COUNT
router.get("/applied/count", protect, getCandidateAppliedCount);

// CANDIDATE - GET FULL APPLIED JOBS LIST (with status)
router.get("/applied/list", protect, getCandidateAppliedJobs);

// ADMIN - GET OWN JOBS  (must be before /:jobId)
router.get("/admin/my-jobs", protect, getAdminJobs);

// ADMIN - BULK DELETE JOBS  (must be before /:jobId)
router.post("/admin/bulk-delete", protect, bulkDeleteJobs);

// ADMIN - CREATE JOB
router.post("/", protect, createJob);

// PUBLIC - GET JOB BY ID  (parameterized — always last among GETs)
router.get("/:jobId", getJobById);

// CANDIDATE - APPLY FOR JOB
router.post("/:jobId/apply", protect, applyForJob);

// ADMIN - GET JOB APPLICATIONS
router.get("/:jobId/applications", protect, getJobApplications);

// ADMIN - UPDATE JOB
router.put("/:jobId", protect, updateJob);

// ADMIN - DELETE JOB (Soft delete)
router.delete("/:jobId", protect, deleteJob);

export default router;
