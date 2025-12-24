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
      firstName,
      department,
      password,
      email,
      role,
    } = req.body;

    if (!facultyId || !firstName  || !password) {
      return res.status(400).json({
        message:
          "facultyId, firstName, lastName and password are required",
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
      firstName: firstName.trim(),
      department: department ,
      email: email ? email.trim().toLowerCase() : undefined,
      password: hashed,
      role: role === "admin" ? "admin" : "teacher", // default teacher
      // isBlocked will default to false from schema
    });

    await teacher.save();

    const out = {
      id: teacher._id,
      facultyId: teacher.facultyId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
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
exports.toggleBlockTeacher = async (req, res) => {
  try {
    const { facultyId } = req.params;
    if (!facultyId) {
      return res.status(400).json({ message: "facultyId is required" });
    }

    const normalizedId = String(facultyId).trim().toUpperCase();

    const teacher = await Teacher.findOne({ facultyId: normalizedId });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    teacher.isBlocked = !teacher.isBlocked;
    await teacher.save();

    const out = {
      id: teacher._id,
      facultyId: teacher.facultyId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      department: teacher.department,
      email: teacher.email,
      role: teacher.role,
      isBlocked: teacher.isBlocked,
      updatedAt: teacher.updatedAt,
    };

    return res.json({
      message: teacher.isBlocked ? "Teacher blocked" : "Teacher unblocked",
      teacher: out,
    });
  } catch (err) {
    console.error("admin.toggleBlockTeacher error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
