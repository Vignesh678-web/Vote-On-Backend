
const Admin = require('../../models/Admin/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const sendOtpEmail = require('../../config/mailer')
if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable for admin auth');
}

function createToken(admin) {
  return jwt.sign(
    {
      id: admin._id,
      adminId: admin.adminId,
      role: admin.role || 'admin', // Ensure role is always passed
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}


exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID and password are required',
      });
    }

    const normalizedAdminId = adminId.trim().toUpperCase();

    const admin = await Admin.findOne({ adminId: normalizedAdminId });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    //  GENERATE JWT
    const token = createToken(admin);

    //  AUDIT LOG
    const { logAction } = require('../Audit/AuditController');
    await logAction(
      'ADMIN_LOGIN',
      'AUTH',
      `Administrator ${admin.adminId} logged into the dashboard`,
      admin.adminId,
      'admin'
    );

    return res.status(200).json({
      success: true,
      message: 'Admin logged in successfully',
      token,
      admin: {
        adminId: admin.adminId,
        email: admin.email,
        role: admin.role,
        Name: admin.Name,
      },
    });

  } catch (err) {
    console.error('admin.login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const id = req.user?.id;
    const role = req.user?.role;

    if (!id) return res.status(401).json({ message: 'Unauthorized' });
    if (role !== 'admin' && role !== 'teacher')
      return res.status(403).json({ message: 'Forbidden: Administrative access required' });

    let profile;
    if (role === 'admin') {
      profile = await Admin.findById(id).select('-password').lean();
    } else {
      const Teacher = require('../../models/Teacher/Teacher');
      profile = await Teacher.findById(id).select('-password').lean();
    }

    if (!profile) return res.status(404).json({ message: 'User not found' });

    return res.json({ success: true, profile });
  } catch (err) {
    console.error('admin.getProfile error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};





function generateOtp(length = 6) {
  return crypto.randomInt(0, 10 ** length).toString().padStart(length, '0');
}

exports.createAdmin = async (req, res) => {
  try {
    const { adminId, password, Name, email } = req.body;

    if (!adminId || !password || !email) {
      return res.status(400).json({
        message: 'adminId, password and email are required',
      });
    }

    const normalizedAdminId = adminId.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    const existingAdminId = await Admin.findOne({
      adminId: normalizedAdminId,
    });

    if (existingAdminId) {
      return res.status(409).json({ message: 'Admin ID already exists' });
    }

    const existingEmail = await Admin.findOne({
      email: normalizedEmail,
    });

    if (existingEmail) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = new Admin({
      adminId: normalizedAdminId,
      Name,
      email: normalizedEmail,
      password: hashed,
      role: 'admin',
    });

    await admin.save();

    const otp = generateOtp(6);
    admin.otp = otp;
    admin.otpExpiry = Date.now() + 10 * 60 * 1000;
    await admin.save();

    await sendOtpEmail(admin.email, otp);

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully. OTP sent to email!',
      admin: {
        adminId: admin.adminId,
        email: admin.email,
      },
    });
  } catch (err) {
    console.error('admin.createAdmin error:', err);
    return res.status(500).json({
      message: 'Server error',
      error: err.message,
    });
  }
};

// controllers/AdminAuthController.js (or otpController.js)

exports.updateProfile = async (req, res) => {
  try {
    const id = req.user?.id;
    const role = req.user?.role;
    const { name } = req.body;

    if (!id) return res.status(401).json({ message: 'Unauthorized' });
    if (!name) return res.status(400).json({ message: 'Name is required' });

    let profile;
    if (role === 'admin') {
      profile = await Admin.findById(id);
      if (profile) profile.Name = name;
    } else {
      const Teacher = require('../../models/Teacher/Teacher');
      profile = await Teacher.findById(id);
      if (profile) profile.Name = name;
    }

    if (!profile) return res.status(404).json({ message: 'User not found' });
    await profile.save();

    // 📝 AUDIT LOG
    try {
      const { logAction } = require('../Audit/AuditController');
      await logAction(
        'PROFILE_UPDATED',
        'AUTH',
        `User ${name} updated their administrative profile`,
        req.user.adminId || req.user.facultyId || req.user.id,
        req.user.role
      );
    } catch (logErr) {
      console.error("Audit log failed:", logErr);
    }

    return res.json({ success: true, message: 'Profile updated successfully', profile });
  } catch (err) {
    console.error('admin.updateProfile error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const id = req.user?.id;
    const role = req.user?.role;
    const { currentPassword, newPassword } = req.body;

    if (!id) return res.status(401).json({ message: 'Unauthorized' });
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    let user;
    if (role === 'admin') {
      user = await Admin.findById(id);
    } else {
      const Teacher = require('../../models/Teacher/Teacher');
      user = await Teacher.findById(id);
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    // Hash and save new password
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    // 📝 AUDIT LOG
    try {
      const { logAction } = require('../Audit/AuditController');
      await logAction(
        'PASSWORD_CHANGED',
        'AUTH',
        `User ${user.Name || user.adminId || user.facultyId} updated their security credentials`,
        user.adminId || user.facultyId || user.id,
        role
      );
    } catch (logErr) {
      console.error("Audit log failed:", logErr);
    }

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('admin.updatePassword error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.veriffffyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log("ooooooooooooooooooooooooooooo");


    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Check if OTP matches
    if (admin.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check if OTP expired
    if (Date.now() > admin.otpExpiry) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Mark admin as verified
    admin.isVerified = true;
    admin.otp = undefined;        // Optional: clear stored OTP
    admin.otpExpiry = undefined;  // Clear expiry
    await admin.save();

    return res.json({ message: 'OTP verified successfully', success: true });
  } catch (err) {
    console.error('OTP verify error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
