import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createJobRequest,
  getMyJobRequests,
  getAllJobRequests,
  updateJobRequestStatus,
  deleteJobRequest,
} from "../controllers/jobRequestController.js";

const router = express.Router();

// ── SPECIFIC routes before /:requestId ──

// CANDIDATE — submit a new "can't find my job" request
router.post("/", protect, createJobRequest);

// CANDIDATE — view my own submitted requests
router.get("/mine", protect, getMyJobRequests);

// ADMIN — view all submitted requests
router.get("/", protect, getAllJobRequests);

// ADMIN — update status / notes on a request
router.put("/:requestId", protect, updateJobRequestStatus);

// ADMIN — delete a request
router.delete("/:requestId", protect, deleteJobRequest);

export default router;
