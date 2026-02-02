const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    admissionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },

    className: {
      type: String,
      default: null,
    },

    section: {
      type: String,
      default: null,
    },

    attendence: {
      type: Number,
      default: 0,
    },

    /* ===== CLASS ELECTION ===== */

    iscandidate: {
      type: Boolean,
      default: false, // contesting current election
    },

    position: {
      type: String,
      trim: true,
      default: null, // e.g., "Class Representative"
    },

    manifesto: {
      type: String,
      trim: true,
      default: null, // candidate's manifesto text
    },

    electionStatus: {
      type: String,
      enum: ["Draft", "Pending", "Active", "Rejected", null],
      default: null, // tracks nomination/approval status
    },

    hasWon: {
      type: Boolean,
      default: false, // won class election
    },

    /* ===== COLLEGE ELECTION ===== */

    isCollegeCandidate: {
      type: Boolean,
      default: false, // becomes true ONLY after class win
    },

    candidateBio: {
      type: String,
      trim: true,
    },

    manifestoPoints: [
      {
        type: String,
        trim: true,
      },
    ],

    photoUrl: {
      type: String,
      trim: true,
    },

    votesCount: {
      type: Number,
      default: 0,
    },

    votedFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student", // candidate voted for
      default: null,
    },

    /* ===== VERIFICATION ===== */

    isApproved: {
      type: Boolean,
      default: false,
    },

    isverified: {
      type: Boolean,
      default: false,
    },

    otp: {
      type: String,
    },

    otpExpiry: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("student", studentSchema);
