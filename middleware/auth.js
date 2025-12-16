const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher/Teacher');
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader || req.query.token;

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = { id: decoded.id, facultyId: decoded.facultyId, role: decoded.role };
   
    next();
  } catch (err) {
    console.error('auth middleware error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};