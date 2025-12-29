const express = require("express");
const router = express.Router();
const {
  sendOtp,
  verifyOtp,
  loginwithPassword,
  studentregister,
  voteCandidate
} = require("../../Controller/Student/studentController");
const auth = require("../../middleware/auth");


router.post('/studentregister',studentregister)
router.post("/vote/:candidateId",auth,voteCandidate);

// Route to send OTP using Admission Number

// router.post("/send-otp", sendOtp);

// Route to verify OTP (Now uncommented)
router.post("/verify-otp", verifyOtp);

router.post("/login", loginwithPassword);

module.exports = router;  