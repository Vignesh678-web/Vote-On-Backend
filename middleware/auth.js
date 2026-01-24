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

    // Safety fallback for legacy tokens or missing roles
    if (!userRole && decoded.id) {
      userRole = 'student';
    }

    req.user = {
      id: decoded.id,
      facultyId: decoded.facultyId,
      role: userRole
    };

    // If student, enrich req.user with department info for guaranteed filtering
    if (userRole === 'student') {
      const Student = require('../models/student/student');
      const student = await Student.findById(decoded.id).select('className section name').lean();
      if (student) {
        req.user.className = student.className;
        req.user.section = student.section;
        req.user.name = student.name;
        console.log(`[AUTH] Student identified: ${student.name} (${student.className}/${student.section})`);
      } else {
        console.log(`[AUTH] WARNING: Student record not found for ID: ${decoded.id}`);
      }
    } else {
      console.log(`[AUTH] Teacher/Admin: ${req.user.id}, Role: ${req.user.role}`);
    }

    next();
  } catch (err) {
    console.error('auth middleware error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};