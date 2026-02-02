const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// const adminAuthCtrl = require('../../Controller/Admin/AdminAuthController');
const auth = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');
const {
  createAdmin,
  login,
  veriffffyOtp,
  getProfile,
  updateProfile
} = require("../../Controller/Admin/AdminAuthController");
const { veriffyOtp } = require('../../Controller/Student/studentController');

router.post ('/login',login);
router.post('/create',createAdmin);
router.post('/verify-ottp',veriffffyOtp);
router.put('/update-profile', auth, updateProfile);



router.get('/me', auth, getProfile);


module.exports = router;