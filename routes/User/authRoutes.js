const express = require("express");
const router = express.Router();
const {
  sendOtp,
  verifyOtp,
  loginwithPassword
} = require("../../Controller/User/authController");

// Route to send OTP using Admission Number
router.post("/send-otp", sendOtp);

// Route to verify OTP (Now uncommented)
router.post("/verify-otp", verifyOtp);

// router.post("/login", loginwithPassword);

module.exports = router;