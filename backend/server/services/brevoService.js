import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

import axios from "axios";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3";
const SENDER_EMAIL = process.env.SENDER_EMAIL || "pickyourhire@gmail.com";
const SENDER_NAME = process.env.SENDER_NAME || "PYH Consultants";

// Validate Brevo API key on startup
if (!BREVO_API_KEY) {
  console.error("❌ BREVO_API_KEY is not configured in environment variables");
}

/**
 * Send email via Brevo API
 * @param {string} recipientEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email content
 * @param {string} recipientName - Optional recipient name
 * @returns {Promise<boolean>} - Success status
 */
export const sendEmail = async (
  recipientEmail,
  subject,
  htmlContent,
  recipientName = null
) => {
  try {
    if (!BREVO_API_KEY) {
      console.error("❌ BREVO_API_KEY not configured");
      return false;
    }

    const payload = {
      sender: {
        name: SENDER_NAME,
        email: SENDER_EMAIL,
      },
      to: [
        {
          email: recipientEmail,
          name: recipientName || recipientEmail.split("@")[0],
        },
      ],
      subject: subject,
      htmlContent: htmlContent,
    };

    const config = {
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    };

    const response = await axios.post(
      `${BREVO_API_URL}/smtp/email`,
      payload,
      config
    );

    console.log(
      `✓ Email sent to ${recipientEmail} (Message ID: ${response.data.messageId})`
    );
    return true;
  } catch (error) {
    console.error(
      `❌ Error sending email to ${recipientEmail}:`,
      error.response?.data || error.message
    );
    return false;
  }
};

/**
 * Send OTP email
 */
export const sendOtpEmail = async (email, otp) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Your OTP Login Code</h2>
      <p>Hi,</p>
      <p>Use the OTP below to sign in to your account:</p>
      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <h1 style="color: #007bff; letter-spacing: 5px; font-family: monospace;">${otp}</h1>
      </div>
      <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
      <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 11px; text-align: center;">PYH Consultants Recruiter Platform</p>
    </div>
  `;

  return sendEmail(email, "OTP Login - PICKYOURHIRE", htmlContent);
};

/**
 * Send candidate referral email
 */
export const sendCandidateReferralEmail = async (
  email,
  referralId,
  candidateName
) => {
  const verificationLink = `${process.env.FRONTEND_URL}/referral/${referralId}/accept`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Great News! You've Been Referred!</h2>
      
      <p>Hi ${candidateName},</p>
      
      <p>Congratulations! You have been referred by someone who believes in your potential. Below are the details of your referral:</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>What's Next?</strong></p>
        <p>1. Click the button below to open the portal</p>
        <p>2. Review your referral details</p>
        <p>3. Edit if needed and accept the referral</p>
        <p>4. Once you accept, the recruiter will review your profile</p>
      </div>
      
      <a href="${verificationLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin: 20px 0;">
        Open Portal & Review Referral
      </a>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you didn't expect this email or have any questions, please contact the referrer directly.
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 11px; text-align: center;">PYH Consultants Recruiter Platform</p>
    </div>
  `;

  return sendEmail(
    email,
    "You've Been Referred - Review Your Opportunity",
    htmlContent,
    candidateName
  );
};

/**
 * Notify a referrer that the candidate they referred has moved to a new status
 * (Shortlisted / In Process / On Hold / Offer Given)
 */
export const sendReferralStatusUpdateEmail = async (
  referrerEmail,
  referrerName,
  candidateName,
  newStatus
) => {
  const statusColors = {
    "Shortlisted": "#1d4ed8",
    "In Process": "#7c3aed",
    "On Hold": "#C2410C",
    "Offer Given": "#15803d",
  };
  const color = statusColors[newStatus] || "#007bff";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Update on Your Referral</h2>

      <p>Hi ${referrerName || "there"},</p>

      <p>Good news — there's an update on <strong>${candidateName}</strong>, the candidate you referred.</p>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 8px; color: #666; font-size: 13px;">Current Status</p>
        <p style="margin: 0; font-size: 20px; font-weight: bold; color: ${color};">${newStatus}</p>
      </div>

      <p>Thanks for referring great talent to us. Log in to your referrer dashboard to see full details.</p>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you have any questions, feel free to reach out to our team.
      </p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 11px; text-align: center;">PYH Consultants Recruiter Platform</p>
    </div>
  `;

  return sendEmail(
    referrerEmail,
    `Update: ${candidateName}'s status is now "${newStatus}"`,
    htmlContent,
    referrerName
  );
};

/**
 * Send admin notification for pending recruiter approval
 */
export const sendAdminRecruiterApprovalEmail = async (
  adminEmails,
  recruiterName,
  recruiterEmail,
  recruiterDetails
) => {
  const adminDashboardLink = `${process.env.FRONTEND_URL}/admin/recruiters`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Recruiter Approval Required</h2>
      
      <p>Hi Admin,</p>
      
      <p>A new recruiter has registered and needs approval. Please review their details below:</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Recruiter Details:</strong></p>
        <p><strong>Name:</strong> ${recruiterName}</p>
        <p><strong>Email:</strong> ${recruiterEmail}</p>
        <p><strong>Company:</strong> ${recruiterDetails.company || "N/A"}</p>
        <p><strong>Department:</strong> ${recruiterDetails.department || "N/A"}</p>
        <p><strong>Phone:</strong> ${recruiterDetails.phone || "N/A"}</p>
      </div>
      
      <a href="${adminDashboardLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin: 20px 0;">
        Review & Approve
      </a>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Please review the recruiter's information and approve or reject their application from the admin dashboard.
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 11px; text-align: center;">PYH Consultants Admin Panel</p>
    </div>
  `;

  // Send to all admin emails
  const results = await Promise.all(
    adminEmails.map((email) =>
      sendEmail(
        email,
        "Recruiter Approval Required - PYH Consultants",
        htmlContent,
        "Admin"
      )
    )
  );

  return results.every((r) => r === true);
};

/**
 * Send recruiter approval confirmation email
 */
export const sendRecruiterApprovalEmail = async (recruiterEmail, recruiterName) => {
  const loginLink = `${process.env.FRONTEND_URL}/signin`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">✓ Your Account Has Been Approved!</h2>
      
      <p>Hi ${recruiterName},</p>
      
      <p>Congratulations! Your recruiter account has been approved by the administration team. You can now access the full platform.</p>
      
      <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>What You Can Do Now:</strong></p>
        <ul style="color: #333; line-height: 1.8;">
          <li>View all candidate referrals</li>
          <li>Create and manage job postings</li>
          <li>Review candidate profiles</li>
          <li>Accept or reject referrals</li>
          <li>Track hiring metrics</li>
        </ul>
      </div>
      
      <a href="${loginLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin: 20px 0;">
        Log In to Your Account
      </a>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you have any questions or need assistance, please don't hesitate to reach out to our support team.
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 11px; text-align: center;">PYH Consultants Recruiter Platform</p>
    </div>
  `;

  return sendEmail(
    recruiterEmail,
    "Account Approved - Welcome to PYH Consultants",
    htmlContent,
    recruiterName
  );
};

/**
 * Send recruiter rejection email
 */
export const sendRecruiterRejectionEmail = async (recruiterEmail, recruiterName, reason = null) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">Account Status Update</h2>
      
      <p>Hi ${recruiterName},</p>
      
      <p>Thank you for your interest in becoming a recruiter with PYH Consultants. Unfortunately, your application has not been approved at this time.</p>
      
      ${reason ? `<div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p><strong>Reason:</strong></p>
        <p>${reason}</p>
      </div>` : ""}
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you have any questions or would like more information about the decision, please contact our support team.
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 11px; text-align: center;">PYH Consultants Recruiter Platform</p>
    </div>
  `;

  return sendEmail(
    recruiterEmail,
    "Application Status - PYH Consultants",
    htmlContent,
    recruiterName
  );
};

/**
 * Verify Brevo configuration
 */
export const verifyBrevoConfig = async () => {
  try {
    if (!BREVO_API_KEY) {
      console.error("❌ BREVO_API_KEY not configured");
      return false;
    }

    const config = {
      headers: {
        "api-key": BREVO_API_KEY,
      },
    };

    const response = await axios.get(`${BREVO_API_URL}/account`, config);

    console.log("✓ Brevo API configuration is valid");
    console.log(`  Account: ${response.data.email}`);
    return true;
  } catch (error) {
    console.error(
      "❌ Brevo API verification failed:",
      error.response?.data || error.message
    );
    return false;
  }
};

export default {
  sendEmail,
  sendOtpEmail,
  sendCandidateReferralEmail,
  sendAdminRecruiterApprovalEmail,
  sendRecruiterApprovalEmail,
  sendRecruiterRejectionEmail,
  verifyBrevoConfig,
};
