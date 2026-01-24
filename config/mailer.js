const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();


const sendEmail = async (email, otp) => {
  console.log(`[MAILER] Attempting to send OTP to: ${email}`);

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER?.trim(),
        pass: process.env.EMAIL_PASSWORD?.trim()
      },
      tls: { rejectUnauthorized: false }
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log("[MAILER] SMTP connection verified");

    const mailOptions = {
      from: `"ONLINE VOTE SYTEM" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "OTP Verification - Online Vote",
      text: `Your OTP for verification is: ${otp}. This OTP will expire in 5 minutes.`
    };

    await transporter.sendMail(mailOptions);
    console.log(`[MAILER] OTP sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error(`[MAILER] Error sending email to ${email}:`, error);
    throw error; // Rethrow to let the controller handle it
  }
};

module.exports = sendEmail;