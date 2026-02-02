const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true // e.g., 'ELECTION_CREATED', 'CANDIDATE_APPROVED', 'VOTE_CAST'
  },
  module: {
    type: String,
    required: true // e.g., 'ELECTION', 'CANDIDATE', 'AUTH'
  },
  details: {
    type: String,
    required: true
  },
  performedBy: {
    type: String, // adminId, facultyId, or studentId
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'system'],
    required: true
  },
  ipAddress: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
