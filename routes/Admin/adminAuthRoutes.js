const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// const adminAuthCtrl = require('../../Controller/Admin/AdminAuthController');
const auth = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');
const {createAdmin
  ,login,
  veriffffyOtp
}=require("../../Controller/Admin/AdminAuthController");
const { veriffyOtp } = require('../../Controller/Student/studentController');

router.post ('/login',login);
router.post('/create',createAdmin);
router.post('/verify-ottp',veriffffyOtp);



// router.get('/me', auth, , adminAuthCtrl.getProfile);


module.exports = router;