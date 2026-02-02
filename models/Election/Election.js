const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema({
  // Election basic info
  title: {
    type: String,
    required: [true, 'Election title is required'],
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  // Election type: class-level or college-level
  type: {
    type: String,
    enum: ['class', 'college'],
    required: [true, 'Election type is required']
  },

  // Position being elected (e.g., "Class Representative", "President")
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true
  },

  // For class elections only - restrict who can vote
  className: {
    type: String,
    default: null
  },

  section: {
    type: String,
    default: null
  },

  // Election timing
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },

  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },

  // Election status workflow: Draft → Scheduled → Active → Completed/Cancelled
  status: {
    type: String,
    enum: ['Draft', 'Scheduled', 'Active', 'Completed', 'Cancelled'],
    default: 'Draft'
  },

  // Candidates participating in this election
  candidates: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'student',
      required: true
    },
    votesCount: {
      type: Number,
      default: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Track who has voted (to prevent double voting)
  voters: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'student'
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Winner (set after election is completed)
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'student',
    default: null
  },

  // Total votes cast
  totalVotes: {
    type: Number,
    default: 0
  },

  // Minimum attendance percentage required to be a candidate
  minAttendanceRequired: {
    type: Number,
    default: 75
  },

  // Created by (admin or teacher)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByRole'
  },

  createdByRole: {
    type: String,
    enum: ['admin', 'Teacher']
  }

}, { timestamps: true });

// Index for faster queries
electionSchema.index({ status: 1, type: 1 });
electionSchema.index({ className: 1, section: 1 });
electionSchema.index({ 'voters.student': 1 });

// Virtual to check if election is currently active
electionSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.status === 'Active' &&
    now >= this.startDate &&
    now <= this.endDate;
});

// Method to check if a student has already voted
electionSchema.methods.hasStudentVoted = function (studentId) {
  return this.voters.some(v => v.student.toString() === studentId.toString());
};

// Method to check if a student can vote in this election
electionSchema.methods.canStudentVote = function (student) {
  // For class elections, check class and section match (flexible/partial)
  if (this.type === 'class') {
    const sClass = (student.className || "").toLowerCase();
    const eClass = (this.className || "").toLowerCase();
    const sSection = (student.section || "").toLowerCase();
    const eSection = (this.section || "").toLowerCase();

    const classMatch = sClass.includes(eClass) || eClass.includes(sClass);
    const sectionMatch = (!sSection && !eSection) || 
                         (sSection && eSection && (sSection.includes(eSection) || eSection.includes(sSection)));

    console.log(`[canStudentVote] Election: "${this.title}" (${this.type})`);
    console.log(`[canStudentVote] Student Class: "${student.className}" → normalized: "${sClass}"`);
    console.log(`[canStudentVote] Election Class: "${this.className}" → normalized: "${eClass}"`);
    console.log(`[canStudentVote] Student Section: "${student.section}" → normalized: "${sSection}"`);
    console.log(`[canStudentVote] Election Section: "${this.section}" → normalized: "${eSection}"`);
    console.log(`[canStudentVote] Class Match: ${classMatch}, Section Match: ${sectionMatch}`);
    console.log(`[canStudentVote] Final Result: ${classMatch && sectionMatch}`);

    return classMatch && sectionMatch;
  }
  // For college elections, all verified students can vote
  console.log(`[canStudentVote] Election: "${this.title}" (${this.type}) - College election, allowing all students`);
  return true;
};

// Method to get candidate by student ID
electionSchema.methods.getCandidateByStudentId = function (studentId) {
  return this.candidates.find(c => c.student.toString() === studentId.toString());
};

module.exports = mongoose.model('Election', electionSchema);
