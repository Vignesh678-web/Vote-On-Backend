// Backend/Controller/Admin/adminTeacherController.js

const Teacher = require("../../models/Teacher/Teacher");
const bcrypt = require("bcryptjs");

/**
 * POST /api/admin/teacher/create
 * Body: { facultyId, firstName, lastName, department?, email?, password, role? }
 */
exports.createTeacher = async (req, res) => {
  try {
    const {
      facultyId,
      Name,
      department,
      password,
      email,
      role,
      className,
      section
    } = req.body;

    if (!facultyId || !Name || !password) {
      return res.status(400).json({
        message: "facultyId, Name and password are required",
      });
    }

    const normalizedId = String(facultyId).trim().toUpperCase();

    const existing = await Teacher.findOne({ facultyId: normalizedId });
    if (existing) {
      return res.status(409).json({ message: "Faculty ID already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const teacher = new Teacher({
      facultyId: normalizedId,
      Name: Name,
      department: department,
      email: email ? email.toLowerCase() : undefined,
      password: hashed,
      role: ['admin', 'teacher', 'returning_officer'].includes(role) ? role : 'teacher',
      className: role === 'teacher' ? (className ? className.trim().toUpperCase() : undefined) : undefined,
      section: role === 'teacher' ? (section ? section.trim().toUpperCase() : undefined) : undefined,
    });

    await teacher.save();

    //  AUDIT LOG
    try {
      const { logAction } = require('../Audit/AuditController');
      await logAction(
        'OFFICER_CREATED',
        'AUTH',
        `New faculty officer registered: ${teacher.Name} (${teacher.facultyId})`,
        req.user.adminId || req.user.facultyId || req.user.id,
        req.user.role
      );
    } catch (logErr) {
      console.error("Audit log failed:", logErr);
    }

    const out = {
      id: teacher._id,
      facultyId: teacher.facultyId,
      Name: teacher.Name,
      
      department: teacher.department,
      email: teacher.email,
      role: teacher.role,
      isBlocked: teacher.isBlocked,
      createdAt: teacher.createdAt,
    };

    return res.status(201).json({ message: "Teacher created", teacher: out });
  } catch (err) {
    console.error("admin.createTeacher error:", err);
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Duplicate key", detail: err.keyValue });
    }
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * POST /api/admin/teacher/reset-password
 * Body: { facultyId, newPassword }
 */
exports.resetTeacherPassword = async (req, res) => {
  try {
    const { facultyId, newPassword } = req.body;

    if (!facultyId || !newPassword) {
      return res
        .status(400)
        .json({ message: "facultyId and newPassword required" });
    }

    const normalizedId = String(facultyId).trim().toUpperCase();

    const teacher = await Teacher.findOne({ facultyId: normalizedId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const salt = await bcrypt.genSalt(10);
    teacher.password = await bcrypt.hash(newPassword, salt);
    await teacher.save();

    return res.json({
      message: `Password reset successfully for ${teacher.facultyId}`,
    });
  } catch (err) {
    console.error("admin.resetTeacherPassword error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/admin/teacher/all
 * Returns all teachers (without password)
 */
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find({})
      .select("-password")
      .lean();

    return res.json({ teachers });
  } catch (err) {
    console.error("admin.getAllTeachers error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * PATCH /api/admin/teacher/:facultyId/toggle-block
 * Toggles isBlocked for a teacher
 */

const mongoose = require("mongoose");

exports.toggleBlockTeacher = async (req, res) => {
  try {
    const { facultyId } = req.params; // this is actually _id

    console.log("id",facultyId);
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID",
      });
    }

    // ✅ THIS IS THE FIX
    const teacher = await Teacher.findById(facultyId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    teacher.isBlocked = !teacher.isBlocked;
    await teacher.save();

    // 📝 AUDIT LOG
    try {
      const { logAction } = require('../Audit/AuditController');
      await logAction(
        'OFFICER_BLOCK_TOGGLED',
        'AUTH',
        `Access for officer ${teacher.Name} set to ${teacher.isBlocked ? 'Blocked' : 'Active'}`,
        req.user.adminId || req.user.facultyId || req.user.id,
        req.user.role
      );
    } catch (logErr) {
      console.error("Audit log failed:", logErr);
    }

    return res.status(200).json({
      success: true,
      message: teacher.isBlocked
        ? "Teacher blocked"
        : "Teacher unblocked",
      teacher: {
        id: teacher._id,
        facultyId: teacher.facultyId,
        firstName: teacher.firstName,
        department: teacher.department,
        email: teacher.email,
        role: teacher.role,
        isBlocked: teacher.isBlocked,
        updatedAt: teacher.updatedAt,
      },
    });

  } catch (err) {
    console.error("toggleBlockTeacher error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

