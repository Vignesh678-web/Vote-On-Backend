const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    admissionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'student',
    },
    attendence: {
      type: Number,
      default: 0,
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
    hasWon: {
      type: Boolean,
      default: false,
    },

    iscandidate: {
      type: Boolean,
      default: false,
    },

    isApproved: {
      type: Boolean,
      default: false,
    },
    isverified: {
      type: Boolean,
      default: false,
    },

    votedFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",        // reference to candidate
      default: null
    },

    classElectionId: {
      type: String,
      default: null,
    },

    className: {
      type: String,
      default: null,
    },

    section: {
      type: String,
      default: null,
    },

    electionStatus: {
      type: String,
      enum: ["Draft", "Active", "Completed"],
      default: "Draft",
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },

    electionStartAt: {
      type: Date,
      default: null,
    },

    electionEndAt: {
      type: Date,
      default: null,
    },

    votesCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("student", candidateSchema);
