import nodemailer from "nodemailer";

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    console.log("🔧 Initializing email transporter...");
    console.log("EMAIL_USER:", process.env.EMAIL_USER ? "✓ Set" : "✗ Missing");
    console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "✓ Set" : "✗ Missing");
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error("❌ Email credentials not configured. Emails will not be sent.");
      throw new Error("EMAIL_USER or EMAIL_PASSWORD not configured in environment variables");
    }
    
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    console.log("✓ Email transporter initialized successfully");
  }
  return transporter;
};

export const sendCandidateReferralEmail = async (email, referralId, candidateName) => {
  try {
    console.log(`📧 Attempting to send referral email to ${email}...`);
    
    const verificationLink = `${process.env.FRONTEND_URL}/referral/${referralId}/accept`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Great News! You've Been Referred!</h2>
        
        <p>Hi ${candidateName},</p>
        
        <p>Congratulations! Someone has referred you for an exciting job opportunity. Below are the details of your referral:</p>
        
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
        
        <p style="color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 20px;">
          Best regards,<br/>
          PYH Consultants Team
        </p>
      </div>
    `;

    const transport = getTransporter();

    const info = await transport.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "You've Been Referred - Review Your Opportunity",
      html: htmlContent,
    });

    console.log(`✓ Referral email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    // Don't throw - just log and continue
    return false;
  }
};
