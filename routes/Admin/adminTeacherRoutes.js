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
  requireAdmin,
  adminCtrl.createTeacher
);

router.get(
  "/teacher/all",
  auth,
  requireAdmin,
  adminCtrl.getAllTeachers
);

router.patch(
  "/teacher/toggle-block/:facultyId",
  auth,
  requireAdmin,
  adminCtrl.toggleBlockTeacher
);

module.exports = router;
