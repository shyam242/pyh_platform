import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  bulkDeleteJobs,
  getAdminJobs
} from "../controllers/jobController.js";

const router = express.Router();

// ── SPECIFIC routes MUST come before /:jobId parameterized routes ──

// PUBLIC - GET ALL ACTIVE JOBS
router.get("/", getAllJobs);

// ADMIN - GET OWN JOBS  (must be before /:jobId)
router.get("/admin/my-jobs", protect, getAdminJobs);

// ADMIN - BULK DELETE JOBS  (must be before /:jobId)
router.post("/admin/bulk-delete", protect, bulkDeleteJobs);

// ADMIN - CREATE JOB
router.post("/", protect, createJob);

// PUBLIC - GET JOB BY ID  (parameterized — always last among GETs)
router.get("/:jobId", getJobById);

// ADMIN - UPDATE JOB
router.put("/:jobId", protect, updateJob);

// ADMIN - DELETE JOB (Soft delete)
router.delete("/:jobId", protect, deleteJob);

export default router;