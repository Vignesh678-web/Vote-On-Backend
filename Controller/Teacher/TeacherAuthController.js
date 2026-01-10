
const Teacher = require('../../models/Teacher/Teacher');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require("crypto")
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const sendOtpEmail = require("../../config/mailer")



function createToken(teacher) {
  return jwt.sign(
    { id: teacher._id, facultyId: teacher.facultyId, role: teacher.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}


function generateOtp(length = 6) {
  return crypto
    .randomInt(0, 10 ** length)
    .toString()
    .padStart(length, "0");
}


exports.login = async (req, res) => {
  try {
    const { facultyId, password } = req.body;

    if (!facultyId || !password) {
      return res.status(400).json({
        success: false,
        message: "Faculty ID and password are required",
      });
    }

    const normalizedId = facultyId.trim().toUpperCase();

    const teacher = await Teacher.findOne({ facultyId: normalizedId });
    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    if(teacher.isBlocked){
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact the administrator.",
      });
    }

    const match = await bcrypt.compare(password, teacher.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // // 🔐 GENERATE OTP
    // const otp = generateOtp(6);
    // teacher.otp = otp;
    // teacher.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    // await teacher.save();

    // // 📧 SEND OTP EMAIL
    // await sendOtpEmail(teacher.email, otp);

    return res.status(200).json({
      success: true,
      message: "Teacher logged in successfully",
      teacher: {
        facultyId: teacher.facultyId,
        email: teacher.email,
        role: teacher.role,
      },
    });

  } catch (err) {
    console.error("teacher.login error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { facultyId, otp } = req.body;

    if (!facultyId || !otp) {
      return res.status(400).json({
        success: false,
        message: "Faculty ID and OTP are required",
      });
    }

    const normalizedId = facultyId.trim().toUpperCase();

    const teacher = await Teacher.findOne({ facultyId: normalizedId });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    if (!teacher.otp || Date.now() > teacher.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (String(teacher.otp) !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // ✅ Clear OTP after success
    teacher.otp = undefined;
    teacher.otpExpiry = undefined;
    await teacher.save();

    // 🔑 Issue JWT AFTER OTP verification
    const token = createToken(teacher);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      teacher: {
        id: teacher._id,
        facultyId: teacher.facultyId,
        email: teacher.email,
        role: teacher.role,
      },
    });

  } catch (err) {
    console.error("teacher.verifyOtp error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


exports.getProfile = async (req, res) => {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });
    const teacher = await Teacher.findById(id).select('-password').lean();
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json({ teacher });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
