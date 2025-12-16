const express = require("express");
const router = express.Router();
const {
  sendOtp,
  verifyOtp,
  loginwithPassword
} = require("../../Controller/User/authController");

router.post("/send-otp",sendOtp);
// router.post("/verify-otp", verifyOtp);
router.post("/login",loginwithPassword);

module.exports = router; 