const Student = require('../../models/student/student.js')

//candidate approval by admin


exports.approveCandidate = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.iscandidate === false) {
      return res.status(400).json({
        message: "Student has not been nominated yet"
      });
    }

    if (student.isApproved === true) {
      return res.status(400).json({
        message: "Student is already approved as candidate"
      });
    }

    student.isApproved = true;
    student.electionStatus = "Active";

    await student.save();

    return res.json({
      message: "Candidate approved successfully",
      student
    });

  } catch (err) {
    console.error("approveCandidate error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

exports.getCandidates = async (req, res) => {
  console.log("Fetching candidates...");

  try {
    const candidates = await Student.find({ iscandidate: true })
      .select(
        "_id name email admissionNumber attendence iscandidate isApproved isverified position manifesto candidateBio manifestoPoints photoUrl className section electionStatus votesCount createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(candidates);
  } catch (err) {
    console.error("getCandidates error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};



//candidate rejection by admin
exports.rejectCandidate = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // If they're not even nominated, rejecting makes no sense
    if (!student.iscandidate) {
      return res.status(400).json({
        message: "Student is not nominated, cannot reject"
      });
    }

    // Reset candidate status
    student.iscandidate = false;
    student.isApproved = false;
    student.electionStatus = "Rejected";
    student.votesCount = 0;
    student.position = null;
    student.manifesto = null;
    student.photoUrl = null; // optional: remove campaign photo

    await student.save();

    return res.json({
      message: "Candidate rejected successfully",
      student
    });

  } catch (err) {
    console.error("rejectCandidate error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};


// Revoke approval - moves candidate back to pending (keeps candidate status)
exports.revokeCandidate = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!student.iscandidate) {
      return res.status(400).json({
        message: "Student is not a candidate"
      });
    }

    if (!student.isApproved) {
      return res.status(400).json({
        message: "Candidate is not approved, cannot revoke"
      });
    }

    // Only remove approval, keep candidate status
    student.isApproved = false;
    student.electionStatus = "Pending";

    await student.save();

    return res.json({
      message: "Candidate approval revoked. Moved back to pending.",
      student
    });

  } catch (err) {
    console.error("revokeCandidate error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};








exports.getPendingCandidates = async (req, res) => {
  try {
    const pending = await Student.find({
      iscandidate: true,
      isApproved: false
    })
      .select("_id name email admissionNumber attendence position photoUrl className section createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ candidates: pending });
  } catch (err) {
    console.error("getPendingCandidates error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// --- College-level candidates (promoted after class wins) ---
exports.promoteClassWinnersToCollege = async (req, res) => {
  try {
    // Find class election winners who are not yet promoted
    const winners = await Student.find({
      hasWon: true,
      isCollegeCandidate: false,
    });

    if (winners.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No class election winners to promote",
        promotedCount: 0,
      });
    }

    // Promote them
    for (const student of winners) {
      student.isCollegeCandidate = true;
      await student.save();
    }

    res.status(200).json({
      success: true,
      message: "Class election winners promoted to college candidates",
      promotedCount: winners.length,
    });
  } catch (error) {
    console.error("Promotion error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to promote class election winners",
    });
  }
};


exports.createCandidateByAdmin = async (req, res) => {
  try {
    const { studentId, position, manifesto, photoUrl } = req.body;

    if (!studentId || !position) {
      return res.status(400).json({
        message: "studentId and position are required",
      });
    }

    const studentRecord = await Student.findById(studentId);
    if (!studentRecord) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    if (studentRecord.iscandidate) {
      return res.status(409).json({
        message: "This student is already a candidate",
      });
    }

    // Update student to be a candidate (auto-approved by admin)
    studentRecord.iscandidate = true;
    studentRecord.isApproved = true;
    studentRecord.position = position;
    studentRecord.manifesto = manifesto || null;
    studentRecord.photoUrl = photoUrl || studentRecord.photoUrl;
    studentRecord.electionStatus = "Active";

    await studentRecord.save();

    return res.status(201).json({
      message: "Candidate created by admin",
      candidate: studentRecord,
    });
  } catch (err) {
    console.error("createCandidateByAdmin error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getCollegeCandidates = async (req, res) => {
  try {
    const candidates = await Student.find({ isCollegeCandidate: true })
      .select("name email admissionNumber className section candidateBio manifestoPoints photoUrl votesCount")
      .sort({ votesCount: -1 });

    res.status(200).json({
      success: true,
      count: candidates.length,
      candidates,
    });
  } catch (error) {
    console.error("getCollegeCandidates error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch college candidates",
      error: error.message,
    });
  }
};
