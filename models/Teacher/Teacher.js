const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  facultyId: {
    type: String,
    required: [true, 'facultyId is required'],
    unique: true,
    trim: true,
    uppercase: true
  },

  firstName: { type: String, required: [true, 'firstName is required'], trim: true },
  lastName: { type: String, required: [true, 'lastName is required'], trim: true },

  // FIXED: department
  department: { type: String, trim: true },

  email: { type: String, trim: true, lowercase: true },
  password: { type: String, required: [true, 'password is required'] },

  role: { type: String, enum: ['admin', 'teacher'], default: 'teacher' },

  isBlocked : {type: Boolean , default:false},
  
},{ timestamps: true });

module.exports = mongoose.model('Teacher', TeacherSchema);
