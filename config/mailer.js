const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();


const sendEmail = async (email, otp) => {
  console.log(email, otp, "lllllllllllllll");

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: { rejectUnauthorized: false }  // dev only
    });


    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OTP Verification",
      text: "Your OTP for verification is: " + otp
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.log("Email error:", error);
  }
};

module.exports = sendEmail;