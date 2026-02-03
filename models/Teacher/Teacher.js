const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  facultyId: {
    type: String,
    required: [true, 'facultyId is required'],
    unique: true,
    
    uppercase: true
  },

  Name: { type: String },

  // FIXED: department
  department: { type: String,  },

  email: { type: String, trim: true, lowercase: true },
  password: { type: String, required: [true, 'password is required'] },

  role: { type: String, enum: ['admin', 'teacher', 'returning_officer'], default: 'teacher' },
  
  // Assigned class for 'teacher' role
  className: { type: String },
  section: { type: String },

  otp: String,
  otpExpiry: Date,


  isBlocked : {type: Boolean , default:false},
  
},{ timestamps: true });

module.exports = mongoose.model('Teacher', TeacherSchema);
