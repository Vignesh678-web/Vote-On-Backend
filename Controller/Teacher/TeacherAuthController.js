
const Teacher = require('../../models/Teacher/Teacher');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function createToken(teacher) {
  return jwt.sign(
    { id: teacher._id, facultyId: teacher.facultyId, role: teacher.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}


exports.login = async (req, res) => {
  try {
    const { facultyId, password } = req.body;
    if (!facultyId || !password) return res.status(400).json({ message: 'facultyId and password required' });

    const normalizedId = String(facultyId).trim().toUpperCase();
    const teacher = await Teacher.findOne({ facultyId: normalizedId });
    if (!teacher) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, teacher.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = createToken(teacher);
    const teacherOut = {
      id: teacher._id,
      facultyId: teacher.facultyId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      department: teacher.department,
      email: teacher.email,
      role: teacher.role
    };

    return res.json({ message: 'Login successful', teacher: teacherOut, token });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
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
