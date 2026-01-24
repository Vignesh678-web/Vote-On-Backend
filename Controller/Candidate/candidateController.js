const { validationResult } = require("express-validator");
const Student = require('../../models/student/student.js');

// Add student as candidate
exports.addCandidate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, position, manifesto, photoUrl } = req.body;

    const studentRecord = await Student.findById(studentId);
    if (!studentRecord) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check minimum attendance (75%)
    if (studentRecord.attendence < 75) {
      return res.status(400).json({
        message: "This student is not eligible to be a candidate. Minimum 75% attendance required.",
        currentAttendance: studentRecord.attendence
      });
    }

    // Mark student as candidate
    studentRecord.iscandidate = true;
    studentRecord.isApproved = false;
    studentRecord.position = position || null;
    studentRecord.manifesto = manifesto || null;
    studentRecord.photoUrl = photoUrl || studentRecord.photoUrl;
    studentRecord.electionStatus = "Draft";

    await studentRecord.save();

    return res.status(201).json({
      message: "Candidate added successfully. Awaiting admin approval.",
      candidate: studentRecord,
    });
  } catch (err) {
    console.error("addCandidate error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get all candidates
exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await Student.find({ iscandidate: true })
      .select("_id name email admissionNumber attendence iscandidate isApproved position photoUrl className section")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ candidates });
  } catch (err) {
    console.error("getAllCandidates error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get single candidate by ID
exports.getCandidateById = async (req, res) => {
  try {
    const candidateRecord = await Student.findById(req.params.id);

    if (!candidateRecord) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!candidateRecord.iscandidate) {
      return res.status(400).json({ message: "This student is not a candidate" });
    }

    res.json({ candidate: candidateRecord });
  } catch (err) {
    console.error("getCandidateById error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Remove candidate status from student
exports.removeCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    const studentRecord = await Student.findById(id);
    if (!studentRecord) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!studentRecord.iscandidate) {
      return res.status(400).json({ message: "This student is not a candidate" });
    }

    // Reset candidate fields
    studentRecord.iscandidate = false;
    studentRecord.isApproved = false;
    studentRecord.position = null;
    studentRecord.manifesto = null;
    studentRecord.electionStatus = null;
    studentRecord.votesCount = 0;

    await studentRecord.save();

    return res.json({ message: "Candidate removed successfully", student: studentRecord });
  } catch (err) {
    console.error("removeCandidate error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all approved candidates (filtered for students)
exports.getApprovedCandidates = async (req, res) => {
  try {
    const { role, className, section } = req.user;
    const userRole = (role || '').toLowerCase();

    console.log(`[getApprovedCandidates] Request by Role: ${userRole}`);

    let filter = {
      iscandidate: true,
      isApproved: true
    };

    // If student, use pre-enriched department info from auth middleware
    if (userRole === 'student') {
      console.log(`[getApprovedCandidates] Enforcing Filter for Class: ${className}, Section: ${section}`);

      if (className) {
        const escapedClass = className.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.className = { $regex: new RegExp(`^${escapedClass}$`, 'i') };
      } else {
        filter.className = "UNASSIGNED_CLASS"; // Show nothing if no class assigned
      }

      if (section) {
        const escapedSection = section.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.section = { $regex: new RegExp(`^${escapedSection}$`, 'i') };
      }
    }

    console.log(`[getApprovedCandidates] Filter:`, JSON.stringify(filter));

    const candidates = await Student.find(filter)
      .select("_id name email admissionNumber attendence position photoUrl candidateBio manifestoPoints className section votesCount")
      .lean();

    console.log(`[getApprovedCandidates] SUCCESS: Returned ${candidates.length} matching candidates`);
    res.json({ candidates });
  } catch (err) {
    console.error("getApprovedCandidates error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};