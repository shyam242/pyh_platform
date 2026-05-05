import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import referralRoutes from "./routes/referral.js";
import recruiterRoutes from "./routes/recruiter.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/recruiter", recruiterRoutes);

app.listen(5000, () => console.log("Server running on 5000"));
