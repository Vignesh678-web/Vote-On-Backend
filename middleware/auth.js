const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher/Teacher');
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader || req.query.token;

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    let userRole = (decoded.role || '').toLowerCase();

    // 🛡️ RECOVERY: If role is missing from token, identify user from DB
    if (!userRole && decoded.id) {
      console.log(`[AUTH] Role missing in token for ID: ${decoded.id}. Attempting DB recovery...`);
      const Admin = require('../models/Admin/Admin');
      const isAdmin = await Admin.exists({ _id: decoded.id });
      if (isAdmin) {
        userRole = 'admin';
      } else {
        const Teacher = require('../models/Teacher/Teacher');
        const isTeacher = await Teacher.exists({ _id: decoded.id });
        userRole = isTeacher ? 'teacher' : 'student';
      }
      console.log(`[AUTH] Role recovered from DB: ${userRole}`);
    } else {
      console.log(`[AUTH] Role found in token: ${userRole} for ID: ${decoded.id}`);
    }

    req.user = {
      id: decoded.id,
      adminId: decoded.adminId,
      facultyId: decoded.facultyId,
      role: userRole
    };

    console.log(`[AUTH] Authenticated ID: ${decoded.id} | Role: ${userRole}`);

    // If student, enrich req.user with department info
    if (userRole === 'student') {
      const Student = require('../models/student/student');
      const student = await Student.findById(decoded.id).select('className section name').lean();
      if (student) {
        req.user.className = student.className;
        req.user.section = student.section;
        req.user.name = student.name;
        console.log(`[AUTH] Student: ${student.name}`);
      }
    } else {
      console.log(`[AUTH] User: ${req.user.id}, Role: ${req.user.role}`);
    }

    next();
  } catch (err) {
    console.error('auth middleware error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};