const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const candidateCtrl = require("../../Controller/Candidate/candidateController");
const Studentcontroller = require("../../Controller/Student/studentController");
const auth = require("../../middleware/auth");
const requireAdmin = require("../../middleware/requireAdmin");

// Create student (kept for backward compatibility)
router.post(
  "/create",
  auth,
  Studentcontroller.studentregister
);

// Get all candidates
router.get("/", auth, candidateCtrl.getAllCandidates);

// Get approved candidates
router.get("/approved", auth, candidateCtrl.getApprovedCandidates);

// Get single candidate by ID
router.get("/:id", auth, candidateCtrl.getCandidateById);

// Add candidate
router.post("/add", auth, requireAdmin, candidateCtrl.addCandidate);

// Remove candidate
router.delete("/:id", auth, requireAdmin, candidateCtrl.removeCandidate);

module.exports = router;
