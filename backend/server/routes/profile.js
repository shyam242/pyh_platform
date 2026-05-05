import express from "express";
import { createProfile } from "../controllers/ProfileController.js";

const router = express.Router();

// CREATE PROFILE
router.post("/create", createProfile);

export default router;   // ⭐ VERY IMPORTANT
