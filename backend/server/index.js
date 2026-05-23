import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import referralRoutes from "./routes/referral.js";
import recruiterRoutes from "./routes/recruiter.js";
import adminRoutes from "./routes/admin.js";
import jobRoutes from "./routes/jobs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/recruiter", recruiterRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/jobs", jobRoutes);

app.listen(5000, () => console.log("Server running on 5000"));
