// Backend/routes/Admin/adminTeacherRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const adminCtrl = require('../../Controller/Admin/adminTeacherController');
const auth = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');


router.post(
  '/teacher/create',
  auth,
  adminCtrl.createTeacher
);

// router.post(
//   '/teacher/reset-password',
//   auth,
//   requireAdmin,
//   [
//     body('facultyId').notEmpty().withMessage('facultyId is required'),
//     body('newPassword').isLength({ min: 6 }).withMessage('newPassword must be at least 6 chars')
//   ],
//   adminCtrl.resetTeacherPassword
// );

router.get(
  "/teacher/all",
  adminCtrl.getAllTeachers
);

router.patch(
  "/teacher/toggle-block/:facultyId",
  adminCtrl.toggleBlockTeacher
);



module.exports = router;




