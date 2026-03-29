import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import dotenv from 'dotenv';

dotenv.config();

// Generate a random numeric 6 digit OTP
export const generateOTP = (length = 6) => {
  return Math.floor(10 ** (length - 1) + Math.random() * 9 * 10 ** (length - 1)).toString();
};

// Hash the OTP and set it in an HTTP-only cookie
export const hashOTP = async (otp, res) => {
    const saltRounds = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, saltRounds);
    
    res.cookie("otp_hash", hashedOtp, {
        maxAge: 10 * 60 * 1000, // 2 minutes
        httpOnly: true,
        sameSite: "strict",
        secure: false,
    });
}

// Verify the entered OTP against the hashed OTP
export const verifyHashedOTP = async (enteredOtp, hashedOtp) => {
    return await bcrypt.compare(enteredOtp, hashedOtp);
}

// Send OTP email using nodemailer
export const sendEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.COMPANY_EMAIL,
      pass: process.env.COMPANY_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.COMPANY_EMAIL,
    to: email,
    subject: 'Your Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="color: #333;">🔐 Password Reset Request</h2>
        <p style="font-size: 16px; color: #555;">Hello,</p>
        <p style="font-size: 16px; color: #555;">
          We received a request to reset your account password. Please use the OTP (One-Time Password) below to verify your identity:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; padding: 12px 24px; font-size: 22px; letter-spacing: 4px; background-color: #007bff; color: white; border-radius: 6px; font-weight: bold;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 15px; color: #777;">
          ⚠️ This OTP is valid for <strong>2 minutes</strong>. Please do not share this code with anyone.
        </p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 13px; color: #999; text-align: center;">
          Thank you,<br>
          <strong>OwnHR Solutions</strong><br>
          <em>This is an automated message. Please do not reply.</em>
        </p>
      </div>
    `
  });
}