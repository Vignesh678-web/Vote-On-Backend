const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
    },

    position: {
      type: String,
      required: true,
      trim: true,
    },

    manifesto: {
      type: String,
      trim: true,
    },

    photoUrl: {
      type: String,
      trim: true,
    },

    iscandidate: {
      type: Boolean,
      default: false,
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },

    createdByAdmin: {
      type: Boolean,
      default: false,
    },
      
    createdByTeacher: {
      type: Boolean,
      default: false
    },
    classElectionId: {
  type: String,
  default: null,
},

isClassElectionCandidate: {
  type: Boolean,
  default: false,
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
  enum: ["Draft", "Active", "Completed", null],
  default: null,
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

module.exports = mongoose.model("Candidate", candidateSchema);
