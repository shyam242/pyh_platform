import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendEmail } from "../services/brevoService.js";

const ADMIN_EMAILS = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map(e => e.trim()) : ["shyampickyourhire@gmail.com"];

const sendAdminNotification = async (recruiter) => {
  try {
    const approvalLink = `${process.env.FRONTEND_URL || "https://pyh-platform.vercel.app"}/admin/recruiters`;

    const htmlContent = `
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
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">PYH Consultants Recruiter Platform</p>
      </div>
    `;

    // Send to all admin emails
    const results = await Promise.all(
      ADMIN_EMAILS.map((email) =>
        sendEmail(
          email,
          `New Recruiter Registration - ${recruiter.name}`,
          htmlContent,
          "Admin"
        )
      )
    );

    if (results.some(r => r === true)) {
      console.log(`✓ Admin notification sent to ${ADMIN_EMAILS.join(", ")}`);
    }
  } catch (error) {
    console.error("⚠️ Failed to send admin notification:", error.message);
  }
};

export const createProfile = async (req, res) => {
  const { name, role, email, company, experience, phone } = req.body;

  try {
    if (!name || !role || !email) {
      return res.status(400).json({ error: "Name, role and email are required" });
    }

    if (role === "admin" && !ADMIN_EMAILS.includes(email)) {
      return res.status(403).json({ error: "Admin account can only be created with the authorized email" });
    }

    // Check if user already exists
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const isNew = existingUser.rows.length === 0;

    // If already fully registered, return existing token
    if (!isNew && existingUser.rows[0].role) {
      const token = jwt.sign(
        { id: existingUser.rows[0].id, role: existingUser.rows[0].role },
        process.env.JWT_SECRET
      );
      return res.json({ token, user: existingUser.rows[0] });
    }

    // Upsert user with role-specific fields
    let result;
    if (role === "referrer") {
      result = await pool.query(
        `INSERT INTO users(name,email,role,company,experience,phone) VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT (email) DO UPDATE SET name=$1,role=$3,company=$4,experience=$5,phone=$6
         RETURNING *`,
        [name, email, role, company, experience, phone]
      );
    } else if (role === "recruiter") {
      const { company_name, company_website } = req.body;
      result = await pool.query(
        `INSERT INTO users(name,email,role,company_name,company_website,phone,is_recruiter_approved)
         VALUES($1,$2,$3,$4,$5,$6,false)
         ON CONFLICT (email) DO UPDATE SET name=$1,role=$3,company_name=$4,company_website=$5,phone=$6,is_recruiter_approved=false
         RETURNING *`,
        [name, email, role, company_name, company_website, phone]
      );
      if (isNew) await sendAdminNotification(result.rows[0]);
    } else if (role === "admin") {
      result = await pool.query(
        `INSERT INTO users(name,email,role) VALUES($1,$2,$3)
         ON CONFLICT (email) DO UPDATE SET name=$1,role=$3
         RETURNING *`,
        [name, email, role]
      );
    } else {
      // candidate
      result = await pool.query(
        `INSERT INTO users(name,email,role,phone) VALUES($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE SET name=$1,role=$3,phone=$4
         RETURNING *`,
        [name, email, role, phone || null]
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

// CREATE/UPDATE CANDIDATE PROFILE (After role selection)
export const createCandidateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      job_role,
      contact,
      skills,
      cctc,
      ectc,
      current_location,
      preferred_location,
      notice_period,
      offer_in_hand,
      reason_for_change,
      current_company_name,
      highest_qualification,
      address_aadhaar,
      technical_skills,
      soft_skills,
      linkedin_profile,
      resume_file_path
    } = req.body;

    // Verify user is a candidate
    const userCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userCheck.rows[0].role !== "candidate") {
      return res.status(403).json({ error: "Only candidates can create candidate profiles" });
    }

    // Update candidate profile
    const result = await pool.query(
      `UPDATE users SET 
        job_role=$1,
        contact=$2,
        skills=$3,
        cctc=$4,
        ectc=$5,
        current_location=$6,
        preferred_location=$7,
        notice_period=$8,
        offer_in_hand=$9,
        reason_for_change=$10,
        current_company_name=$11,
        highest_qualification=$12,
        address_aadhaar=$13,
        technical_skills=$14,
        soft_skills=$15,
        linkedin_profile=$16,
        resume_file_path=$17,
        candidate_profile_completed=true
      WHERE id=$18
      RETURNING id, name, email, role, job_role, contact, skills, cctc, ectc, current_location, preferred_location, notice_period, offer_in_hand, reason_for_change, current_company_name, highest_qualification, address_aadhaar, technical_skills, soft_skills, linkedin_profile, resume_file_path, candidate_profile_completed`,
      [
        job_role,
        contact,
        skills,
        cctc || null,
        ectc || null,
        current_location,
        preferred_location,
        notice_period,
        offer_in_hand,
        reason_for_change,
        current_company_name,
        highest_qualification,
        address_aadhaar,
        technical_skills,
        soft_skills,
        linkedin_profile,
        resume_file_path,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Candidate profile created successfully",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Error creating candidate profile:", error);
    res.status(500).json({ error: "Failed to create candidate profile" });
  }
};

// GET CANDIDATE PROFILE
export const getCandidateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        id, name, email, role, job_role, contact, skills, cctc, ectc, 
        current_location, preferred_location, notice_period, offer_in_hand, 
        reason_for_change, current_company_name, highest_qualification, 
        address_aadhaar, technical_skills, soft_skills, linkedin_profile, 
        resume_file_path, candidate_profile_completed
      FROM users WHERE id=$1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = result.rows[0];

    // Attach referrer info if candidate was referred
    const referralResult = await pool.query(
      `SELECT r.id as referral_id, r.referral_status,
              u.name as referrer_name, u.email as referrer_email, u.phone as referrer_phone,
              u.company as referrer_company, u.linkedin_profile as referrer_linkedin
       FROM referrals r
       JOIN users u ON u.id = r.referrer_id
       WHERE r.email = $1
       ORDER BY r.id DESC
       LIMIT 1`,
      [profile.email]
    );

    profile.referrer = referralResult.rows[0] || null;

    res.json(profile);
  } catch (error) {
    console.error("Error fetching candidate profile:", error);
    res.status(500).json({ error: "Failed to fetch candidate profile" });
  }
};

// UPDATE CANDIDATE PROFILE
export const updateCandidateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      job_role,
      contact,
      skills,
      cctc,
      ectc,
      current_location,
      preferred_location,
      notice_period,
      offer_in_hand,
      reason_for_change,
      current_company_name,
      highest_qualification,
      address_aadhaar,
      technical_skills,
      soft_skills,
      linkedin_profile,
      resume_file_path
    } = req.body;

    // Verify user is a candidate
    const userCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update only provided fields
    let query = "UPDATE users SET ";
    const params = [];
    let paramCount = 1;

    if (job_role !== undefined) {
      query += `job_role=$${paramCount}, `;
      params.push(job_role);
      paramCount++;
    }

    if (contact !== undefined) {
      query += `contact=$${paramCount}, `;
      params.push(contact);
      paramCount++;
    }

    if (skills !== undefined) {
      query += `skills=$${paramCount}, `;
      params.push(skills);
      paramCount++;
    }

    if (cctc !== undefined) {
      query += `cctc=$${paramCount}, `;
      params.push(cctc || null);
      paramCount++;
    }

    if (ectc !== undefined) {
      query += `ectc=$${paramCount}, `;
      params.push(ectc || null);
      paramCount++;
    }

    if (current_location !== undefined) {
      query += `current_location=$${paramCount}, `;
      params.push(current_location);
      paramCount++;
    }

    if (preferred_location !== undefined) {
      query += `preferred_location=$${paramCount}, `;
      params.push(preferred_location);
      paramCount++;
    }

    if (notice_period !== undefined) {
      query += `notice_period=$${paramCount}, `;
      params.push(notice_period);
      paramCount++;
    }

    if (offer_in_hand !== undefined) {
      query += `offer_in_hand=$${paramCount}, `;
      params.push(offer_in_hand);
      paramCount++;
    }

    if (reason_for_change !== undefined) {
      query += `reason_for_change=$${paramCount}, `;
      params.push(reason_for_change);
      paramCount++;
    }

    if (current_company_name !== undefined) {
      query += `current_company_name=$${paramCount}, `;
      params.push(current_company_name);
      paramCount++;
    }

    if (highest_qualification !== undefined) {
      query += `highest_qualification=$${paramCount}, `;
      params.push(highest_qualification);
      paramCount++;
    }

    if (address_aadhaar !== undefined) {
      query += `address_aadhaar=$${paramCount}, `;
      params.push(address_aadhaar);
      paramCount++;
    }

    if (technical_skills !== undefined) {
      query += `technical_skills=$${paramCount}, `;
      params.push(technical_skills);
      paramCount++;
    }

    if (soft_skills !== undefined) {
      query += `soft_skills=$${paramCount}, `;
      params.push(soft_skills);
      paramCount++;
    }

    if (linkedin_profile !== undefined) {
      query += `linkedin_profile=$${paramCount}, `;
      params.push(linkedin_profile);
      paramCount++;
    }

    if (resume_file_path !== undefined) {
      query += `resume_file_path=$${paramCount}, `;
      params.push(resume_file_path);
      paramCount++;
    }

    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ` WHERE id=$${paramCount} RETURNING id, name, email, role, job_role, contact, skills, cctc, ectc, current_location, preferred_location, notice_period, offer_in_hand, reason_for_change, current_company_name, highest_qualification, address_aadhaar, technical_skills, soft_skills, linkedin_profile, resume_file_path, candidate_profile_completed`;
    params.push(userId);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Candidate profile updated successfully",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating candidate profile:", error);
    res.status(500).json({ error: "Failed to update candidate profile" });
  }
};

// VERIFY CANDIDATE PROFILE (Resume & Skills)
export const verifyCandidateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get resume file path from multer
    const resumeFilePath = req.file ? `/uploads/resumes/${req.file.filename}` : null;
    const skills = req.body.skills ? JSON.parse(req.body.skills) : [];

    // Verify user is a candidate
    const userCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userCheck.rows[0].role !== "candidate") {
      return res.status(403).json({ error: "Only candidates can verify profiles" });
    }

    // Update resume and skills
    const result = await pool.query(
      "UPDATE users SET resume_file_path=$1, skills=$2, verified=true WHERE id=$3 RETURNING id, name, email, role, resume_file_path, skills, verified",
      [resumeFilePath, JSON.stringify(skills), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile verified successfully",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Error verifying candidate profile:", error);
    res.status(500).json({ error: "Failed to verify profile" });
  }
};

// DELETE CANDIDATE PROFILE
export const deleteCandidateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const userCheck = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userCheck.rows[0].role !== "candidate") {
      return res.status(403).json({ error: "Only candidates can delete their profile" });
    }

    await pool.query("DELETE FROM referrals WHERE id=$1", [userId]);
    const result = await pool.query(
      "DELETE FROM users WHERE id=$1 AND role='candidate' RETURNING *",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }

    res.json({ message: "Candidate profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting candidate profile:", error);
    res.status(500).json({ error: "Failed to delete candidate profile" });
  }
};
