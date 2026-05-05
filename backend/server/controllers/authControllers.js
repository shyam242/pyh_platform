import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import otpGenerator from "otp-generator";
import pool from "../config/db.js";

const otpStore = new Map();

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    console.log("🔧 Initializing OTP email transporter...");
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error("❌ Email credentials missing (EMAIL_USER or EMAIL_PASSWORD)");
      throw new Error("Email credentials not configured");
    }
    
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    console.log("✓ OTP email transporter initialized");
  }
  return transporter;
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    otpStore.set(email, otp);
    console.log(`📧 Generated OTP for ${email}: ${otp}`);

    const transport = getTransporter();

    await transport.sendMail({
      to: email,
      from: process.env.EMAIL_USER,
      subject: "OTP Login - Recruiter Platform",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your OTP Login Code</h2>
          <p>Hi,</p>
          <p>Use the OTP below to sign in to your account:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #007bff; letter-spacing: 5px; font-family: monospace;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    console.log(`✓ OTP sent to ${email}`);
    res.json({ message: "OTP Sent Successfully" });
  } catch (error) {
    console.error("❌ Error sending OTP:", error.message);
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const storedOtp = otpStore.get(email);
    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    otpStore.delete(email);

    const user = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.json({ newUser: true, email });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      process.env.JWT_SECRET
    );

    res.json({ token, user: user.rows[0] });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error.message);
    res.status(500).json({ message: "Failed to verify OTP", error: error.message });
  }
};
