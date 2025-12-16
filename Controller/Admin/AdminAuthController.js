
const Admin = require('../../models/Admin/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const sendOtpEmail =require('../../config/mailer')
if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable for admin auth');
}

function createToken(admin) {
  return jwt.sign(
    {
      id: admin._id,
      adminId: admin.adminId,
      role: admin.role, // 'admin'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}


exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: 'Validation failed', errors: errors.array() });
    }

    const { adminId, password } = req.body;

    const normalizedId = String(adminId).trim().toUpperCase();

    const admin = await Admin.findOne({ adminId: normalizedId });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createToken(admin);

    const adminOut = {
      id: admin._id,
      adminId: admin.adminId,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
    };

    return res.json({
      message: 'Login successful',
      admin: adminOut,
      token,
    });
  } catch (err) {
    console.error('admin.login error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};


exports.getProfile = async (req, res) => {
  try {
    const id = req.user?.id;
    const role = req.user?.role;

    if (!id) return res.status(401).json({ message: 'Unauthorized' });
    if (role !== 'admin')
      return res.status(403).json({ message: 'Forbidden: admin only' });

    const admin = await Admin.findById(id).select('-password').lean();
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    return res.json({ admin });
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
console.log("ethiiiii");

    const { password, Name, email } = req.body;
    console.log(req.body,"jhhhhhhhhhhhhhh");
    

    if (!email) {
      return res.status(400).json({ message: 'Email is required to send OTP' });
    }


    const existing = await Admin.findOne({email});
    console.log(existing,"llllllllllllllllllllllll");
    
    if (existing) {
      return res.status(409).json({ message: 'Admin ID already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const admin = new Admin({
      Name: Name,
      email: email,
      password: hashed,
    });

    await admin.save();

    // ===== Send OTP =====
    const otp = generateOtp(6);

    // save otp to admin doc (temporary) for verification later
    admin.otp = otp;
    admin.otpExpiry = Date.now() + 10 * 60 * 1000; // expire in 5 minutes

    await admin.save();
console.log("ok");

    await sendOtpEmail(admin.email, otp);


    return res.status(201).json({
      message: 'Admin created successfully. OTP sent to email!',
      success:true,
      admin: {
        adminId: admin.adminId,
        email: admin.email,
      }
    });

  } catch (err) {
    console.error('admin.createAdmin error:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};
// controllers/AdminAuthController.js (or otpController.js)

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

    return res.json({ message: 'OTP verified successfully' ,success :true});
  } catch (err) {
    console.error('OTP verify error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
