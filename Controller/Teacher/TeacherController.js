// Controller/Teacher/teacherController.js
const { default: mongoose } = require('mongoose');
const Candidate = require('../../models/candidate/Candidate');
const Student = require('../../models/Teacher/Student'); // adjust path if you put model elsewhere
const { v4: uuidv4 } = require("uuid");

/**
 * Register a student (POST /api/teacher/students)
 * Body: { firstName, lastName, admissionNumber, attendancePercentage, className?, section? }
 */
exports.registerStudent = async (req, res) => {
  try {
    const { firstName, lastName, admissionNumber, attendancePercentage, className, section } = req.body;

    // Basic validation
    if (!firstName || !lastName || !admissionNumber || attendancePercentage === undefined) {
      return res.status(400).json({ message: 'firstName, lastName, admissionNumber and attendancePercentage are required.' });
    }

    // ensure numeric attendance
    const attendance = Number(attendancePercentage);
    if (Number.isNaN(attendance) || attendance < 0 || attendance > 100) {
      return res.status(400).json({ message: 'attendancePercentage must be a number between 0 and 100.' });
    }

    // Check duplicate admission number
    const existing = await Student.findOne({ admissionNumber });
    if (existing) {
      return res.status(409).json({ message: 'A student with this admission number already exists.' });
    }

    // Optionally attach teacher id if you have authentication
    const createdBy = req.user?.id || undefined; // requires auth middleware that sets req.user

    const student = new Student({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      admissionNumber: admissionNumber.trim(),
      attendancePercentage: attendance,
      className,
      section,
      createdBy
    });

    await student.save();

    return res.status(201).json({ message: 'Student registered successfully', student });
  } catch (err) {
    console.error('registerStudent error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.listStudents = async (req, res) => {
  try {
    // You can filter by class/section/createdBy etc.
    const filter = {};
    if (req.query.className) filter.className = req.query.className;
    if (req.query.section) filter.section = req.query.section;

    const students = await Student.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ students });
  } catch (err) {
    console.error('listStudents error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ student });
  } catch (err) {
    console.error('getStudent error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.attendancePercentage !== undefined) {
      const a = Number(updates.attendancePercentage);
      if (Number.isNaN(a) || a < 0 || a > 100) {
        return res.status(400).json({ message: 'attendancePercentage must be between 0 and 100.' });
      }
      updates.attendancePercentage = a;
      updates.eligible = a >= 75;
    }
    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student updated', student });
  } catch (err) {
    console.error('updateStudent error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error('deleteStudent error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.nominate = async (req, res) => {
  try {
    const { studentId, position, manifesto } = req.body;

    const existing = await Candidate.findOne({ student: studentId });
    if (existing) {
      return res.status(400).json({ message: "Already nominated" });
    }

    const newCandidate = new Candidate({
      student: studentId,
      position,
      manifesto,
      iscandidate: true,
      isApproved: false,
      createdByTeacher: true,
      createdByAdmin: false,
      createdBy: req.user.id
    });

    await newCandidate.save();
    res.json({ message: "Candidate nominated by teacher", newCandidate });

  } catch (err) {
    console.error("Teacher nomination error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// class level election 
exports.createClassElection = async (req, res) => {
  try {
    const { className, section, position, description } = req.body;

    if (!className || !section || !position) {
      return res.status(400).json({ message: "className, section, position are required" });
    }

    const election = {
      electionId: new mongoose.Types.ObjectId(),
      className,
      section,
      position,
      description,
      createdBy: req.user.id,
      status: "Not Started",
      createdAt: new Date()
    };

    return res.status(201).json({ message: "Class election created", election });
  } catch (err) {
    console.error("createClassElection error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

//Add candidate to class election
exports.addCandidateToClassElection = async (req, res) => {
  try {
    const { studentId, position, classElectionId, className, section } = req.body;

    const existing = await Candidate.findOne({ student: studentId });
    if (existing) {
      return res.status(400).json({ message: "Candidate already exists" });
    }

    const newCandidate = new Candidate({
      student: studentId,
      position,
      manifesto: "",
      iscandidate: true,
      isApproved: true,
      createdByTeacher: true,
      createdByAdmin: false,
      createdBy: req.user.id,

      // class election values
      classElectionId,
      isClassElectionCandidate: true,
      className,
      section,
      electionStatus: "Draft",
    });

    await newCandidate.save();

    res.json({
      message: "Candidate added to class election",
      newCandidate
    });

  } catch (err) {
    console.error("addCandidateToClassElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
//Start class election
exports.startClassElection = async (req, res) => {
  try {
    const { classElectionId } = req.params;

    await Candidate.updateMany(
      { classElectionId },
      {
        $set: {
          electionStatus: "Active",
          electionStartAt: new Date()
        }
      }
    );

    res.json({ message: "Class election started", classElectionId });

  } catch (err) {
    console.error("startClassElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
//End class election
exports.endClassElection = async (req, res) => {
  try {
    const { classElectionId } = req.params;

    const candidates = await Candidate.find({ classElectionId });

    let winner = null;
    if (candidates.length > 0) {
      winner = candidates.reduce((a, b) =>
        a.votesCount > b.votesCount ? a : b
      );
    }

    await Candidate.updateMany(
      { classElectionId },
      {
        $set: {
          electionStatus: "Completed",
          electionEndAt: new Date()
        }
      }
    );

    res.json({
      message: "Class election ended",
      classElectionId,
      winner
    });

  } catch (err) {
    console.error("endClassElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
//List class elections
exports.listClassElections = async (req, res) => {
  try {
    const elections = await Candidate.aggregate([
      { $match: { isClassElectionCandidate: true } },
      {
        $group: {
          _id: "$classElectionId",
          className: { $first: "$className" },
          section: { $first: "$section" },
          electionStatus: { $first: "$electionStatus" },
          candidatesCount: { $sum: 1 }
        }
      }
    ]);

    res.json({ elections });

  } catch (err) {
    console.error("listClassElections error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
