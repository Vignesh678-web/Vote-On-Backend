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
        "_id name email admissionNumber attendence iscandidate isApproved isverified position manifesto photoUrl className section electionStatus votesCount createdAt"
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
    student.electionStatus = null;
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
