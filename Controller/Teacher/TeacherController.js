

// Controller/Teacher/teacherController.js
const { default: mongoose } = require('mongoose');
const Student =require('../../models/student/student.js')
const { v4: uuidv4 } = require("uuid");


// make studetnt candidate
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
    const filter = {};

    if (req.query.className) filter.className = req.query.className;
    if (req.query.section) filter.section = req.query.section;

    const students = await Student.find(filter)
      .select("name admissionNumber attendence className section")
      .sort({ createdAt: -1 })
      .lean();

    res.json(students); // ✅ frontend-friendly
  } catch (err) {
    console.error("listStudents error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
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

    await candidates.updateMany(
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

/* add attendance */
exports.Addattendance = async (req, res) => {
  try {
    const { studentId, attendancePercentage } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const attendence = Number(attendancePercentage);
    if (isNaN(attendence) || attendence < 0 || attendence > 100) {
      return res.status(400).json({
        message: "attendancePercentage must be between 0 and 100",
      });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.attendence > 0) {
      return res.status(400).json({
        message: "Attendance already added",
      });
    }

    student.attendence = attendence;
    await student.save();

    res.json({
      message: "Attendance added",
      student,
    });
  } catch (err) {
    console.error("Attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// update attendance
exports.updateAttendance = async (req, res) => {

  try {
    const { studentId, attendancePercentage } = req.body;
    const attendence = Number(attendancePercentage);
    if (Number.isNaN(attendence) || attendence < 0 || attendence > 100) {
      return res.status(400).json({ message: 'attendancePercentage must be a number between 0 and 100.' });
    }
    const student = await Student.findByIdAndUpdate(
      studentId,
      { attendence: attendence },
      { new: true }
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ message: 'Attendance updated', student });
  } catch (err) {
    console.error('updateAttendance error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// nominate student as candidate


exports.nominateCandidate = async (req, res) => {
  try {
    const { studentId, position, manifesto } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // file uploaded? -> req.file.path contains cloudinary URL
    const photoUrl = req.file ? req.file.path : student.photoUrl;
    console.log("Photo URL:", photoUrl);
    

    student.iscandidate = true;
    student.isApproved = false;      
    student.position = position || null;
    student.manifesto = manifesto || null;
    student.photoUrl = photoUrl;     // <--- IMPORTANT
    student.electionStatus = "Draft";
     

    await student.save();

    return res.json({
      message: "Student nominated successfully. Awaiting admin approval.",
      student
    });

  } catch (err) {
    console.error("nominateCandidate error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


//list the approved candidates by admin


exports.listApprovedCandidates = async (req, res) => {
  try {
    const candidates = await Student.find({
      iscandidate: true,
      isApproved: true
    })
      .select("_id name className section position photoUrl manifesto attendence")
      .lean();

    return res.json({
      candidates
    });
  } catch (err) {
    console.error("listApprovedCandidates error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};


exports.AddCandidateDetails = async (req, res) => {
  try {
    console.log("jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj");
    
    const { studentId } = req.params;
    const { candidateBio } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 🔒 MUST be approved candidate
    if (!student.iscandidate || !student.isApproved) {
      return res.status(403).json({
        message: "Only approved candidates can update candidate details",
      });
    }

    // 🔒 Prevent editing after election starts
    if (student.electionStatus === "Active") {
      return res.status(403).json({
        message: "Candidate details cannot be edited once election has started",
      });
    }

    /* ---------------- UPDATE FIELDS ---------------- */

    // Candidate Bio
    if (typeof candidateBio === "string") {
      student.candidateBio = candidateBio;
    }

    // Manifesto Points (normalize from FormData)
    let manifestoRaw =
  req.body.manifestoPoints ||
  req.body["manifestoPoints[]"];

if (manifestoRaw) {
  const points = Array.isArray(manifestoRaw)
    ? manifestoRaw
    : [manifestoRaw];

  student.manifestoPoints = points
    .map(p => p.trim())
    .filter(Boolean);
}


    // Photo (Cloudinary)
    if (req.file) {
      student.photoUrl = req.file.path; // Cloudinary URL
    }

    await student.save();

    return res.status(200).json({
      message: "Candidate details updated successfully",
      student: {
        _id: student._id,
        name: student.name,
        candidateBio: student.candidateBio,
        manifestoPoints: student.manifestoPoints,
        photoUrl: student.photoUrl,
      },
    });

  } catch (err) {
    console.error("AddCandidateDetails error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

