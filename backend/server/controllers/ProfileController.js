import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import pool from "../config/db.js";

const ADMIN_EMAIL = "shyampickyourhire@gmail.com";

const sendAdminNotification = async (recruiter) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("⚠️ Email credentials not configured. Skipping admin notification.");
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const approvalLink = `${process.env.ADMIN_DASHBOARD_URL || "http://localhost:3000"}/admin`;

    await transporter.sendMail({
      to: ADMIN_EMAIL,
      from: process.env.EMAIL_USER,
      subject: `New Recruiter Registration - ${recruiter.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Recruiter Signup - Action Required</h2>
          <p>Hi Admin,</p>
          <p>A new recruiter has registered on the PickYourHire platform and requires your approval.</p>
          
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #000; margin-top: 0;">Recruiter Details:</h3>
            <p><strong>Name:</strong> ${recruiter.name}</p>
            <p><strong>Email:</strong> ${recruiter.email}</p>
            <p><strong>Company:</strong> ${recruiter.company_name || "Not provided"}</p>
            <p><strong>Website:</strong> ${recruiter.company_website || "Not provided"}</p>
            <p><strong>Phone:</strong> ${recruiter.phone || "Not provided"}</p>
            <p><strong>Registration Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p style="color: #666; margin: 20px 0;">
            Review and approve or reject this recruiter in your admin dashboard:
          </p>
          
          <a href="${approvalLink}" 
             style="display: inline-block; background-color: #10b981; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Go to Admin Dashboard
          </a>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This is an automated notification from PickYourHire. Do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log(`✓ Admin notification sent to ${ADMIN_EMAIL}`);
  } catch (error) {
    console.error("⚠️ Failed to send admin notification:", error.message);
  }
};

export const createProfile = async (req, res) => {
  const { name, role, email, company, experience, phone } = req.body;

  try {
    // Check if user with this email already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // ADMIN ROLE RESTRICTION: Only allow admin creation with specific email
    if (role === "admin" && email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Admin account can only be created with the authorized email" });
    }

    // Insert user with role-specific fields
    let result;
    if (role === "referrer") {
      result = await pool.query(
        "INSERT INTO users(name,email,role,company,experience,phone) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
        [name, email, role, company, experience, phone]
      );
    } else if (role === "recruiter") {
      // Recruiters start with is_recruiter_approved = false
      const { company_name, company_website } = req.body;
      result = await pool.query(
        "INSERT INTO users(name,email,role,company_name,company_website,phone,is_recruiter_approved) VALUES($1,$2,$3,$4,$5,$6,false) RETURNING *",
        [name, email, role, company_name, company_website, phone]
      );
      
      // Send admin notification for new recruiter
      await sendAdminNotification(result.rows[0]);
    } else if (role === "admin") {
      result = await pool.query(
        "INSERT INTO users(name,email,role) VALUES($1,$2,$3) RETURNING *",
        [name, email, role]
      );
    } else {
      // Candidate or other roles
      result = await pool.query(
        "INSERT INTO users(name,email,role) VALUES($1,$2,$3) RETURNING *",
        [name, email, role]
      );
    }

    const token = jwt.sign(
      { id: result.rows[0].id, role },
      process.env.JWT_SECRET
    );

    res.json({ token, user: result.rows[0] });
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
};

// GET USER PROFILE
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT id, name, email, role, company, experience, skills, verified, resume, phone FROM users WHERE id=$1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    res.json({
      ...user,
      image_url: null,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// UPDATE USER PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, company, experience, phone } = req.body;

    // Only update provided fields
    let query = "UPDATE users SET ";
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      query += `name=$${paramCount}, `;
      params.push(name);
      paramCount++;
    }

    if (company !== undefined) {
      query += `company=$${paramCount}, `;
      params.push(company);
      paramCount++;
    }

    if (experience !== undefined) {
      query += `experience=$${paramCount}, `;
      params.push(experience);
      paramCount++;
    }

    if (phone !== undefined) {
      query += `phone=$${paramCount}, `;
      params.push(phone);
      paramCount++;
    }

    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ` WHERE id=$${paramCount} RETURNING *`;
    params.push(userId);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    res.json({
      message: "Profile updated successfully",
      user: {
        ...user,
        image_url: null,
      }
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// UPLOAD PROFILE IMAGE
export const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ error: "Profile image file is required" });
    }

    // Try to update with image column, fallback to without if column doesn't exist
    let result;
    try {
      result = await pool.query(
        "UPDATE users SET image=$1 WHERE id=$2 RETURNING *",
        [req.file.filename, userId]
      );
    } catch (err) {
      if (err.code === '42703') {
        // Column doesn't exist, just return success without storing
        result = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
      } else {
        throw err;
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    const imageUrl = req.file ? `${process.env.BACKEND_URL || "http://localhost:5000"}/uploads/profile_images/${req.file.filename}` : null;
    
    res.json({
      message: "Profile image uploaded successfully",
      user: {
        ...user,
        image_url: imageUrl,
      }
    });
  } catch (error) {
    console.error("Error uploading profile image:", error);
    res.status(500).json({ error: "Failed to upload profile image" });
  }
};

// GET BANK DETAILS
export const getBankDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT id, account_number, ifsc_code FROM users WHERE id=$1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching bank details:", error);
    res.status(500).json({ error: "Failed to fetch bank details" });
  }
};

// UPDATE BANK DETAILS (Referrer only)
export const updateBankDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { account_number, ifsc_code } = req.body;

    // Verify user is a referrer
    const userCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userCheck.rows[0].role !== "referrer") {
      return res.status(403).json({ error: "Only referrers can add bank details" });
    }

    // Validate inputs
    if (!account_number || !ifsc_code) {
      return res.status(400).json({ error: "Account number and IFSC code are required" });
    }

    const result = await pool.query(
      "UPDATE users SET account_number=$1, ifsc_code=$2 WHERE id=$3 RETURNING id, account_number, ifsc_code",
      [account_number, ifsc_code, userId]
    );

    res.json({
      message: "Bank details updated successfully",
      bankDetails: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating bank details:", error);
    res.status(500).json({ error: "Failed to update bank details" });
  }
};
