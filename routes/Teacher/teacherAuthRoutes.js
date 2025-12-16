// Backend/routes/Teacher/teacherAuthRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const ctrl = require('../../Controller/Teacher/TeacherAuthController');
const auth = require('../../middleware/auth');

// Public: teacher login
router.post(
  '/login',
  [
    body('facultyId').notEmpty().withMessage('facultyId is required'),
    body('password').notEmpty().withMessage('password is required')
  ],
  ctrl.login
);

// Protected: get own profile
router.get('/me', auth, ctrl.getProfile);

module.exports = router;
