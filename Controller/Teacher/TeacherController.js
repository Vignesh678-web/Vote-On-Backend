

// Controller/Teacher/teacherController.js
const { default: mongoose } = require('mongoose');
const Student = require('../../models/student/student.js')
const { v4: uuidv4 } = require("uuid");


// make studetnt candidate
exports.registerStudent = async (req, res) => {
  try {
    const { name, firstName, lastName, email, admissionNumber, attendancePercentage, className, section } = req.body;

    // Support both combined Name or separate names
    const finalName = name || `${firstName || ''} ${lastName || ''}`.trim();

    // Basic validation
    if (!finalName || !admissionNumber || attendancePercentage === undefined) {
      return res.status(400).json({ message: 'name, admissionNumber and attendancePercentage are required.' });
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

    const createdBy = req.user?.id || undefined;

    // IMPORTANT: Provide defaults for required fields if missing from teacher UI
    const student = new Student({
      name: finalName,
      email: email || `${admissionNumber}@college.edu`,
      password: "studentPassword123", // Default password for teacher-added students
      admissionNumber: admissionNumber.trim(),
      attendence: attendance, // Corrected spelling to match model
      className,
      section,
      createdBy,
      isverified: true // Teacher added students can be pre-verified
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

// class level election - Create a new class election
exports.createClassElection = async (req, res) => {
  try {
    const Election = require('../../models/Election/Election.js');

    const {
      title,
      className,
      section,
      position,
      description,
      startDate,
      endDate,
      minAttendanceRequired
    } = req.body;

    // Validation
    if (!className || !section || !position) {
      return res.status(400).json({
        message: "className, section, and position are required"
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate are required"
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        message: "endDate must be after startDate"
      });
    }

    // Check if there's already an active election for this class/section/position
    const existingElection = await Election.findOne({
      type: 'class',
      className,
      section,
      position,
      status: { $in: ['Draft', 'Scheduled', 'Active'] }
    });

    if (existingElection) {
      return res.status(409).json({
        message: `An election for ${position} in ${className}-${section} already exists`,
        existingElection: {
          _id: existingElection._id,
          title: existingElection.title,
          status: existingElection.status
        }
      });
    }

    // Create the election
    const election = new Election({
      title: title || `${position} Election - ${className} ${section}`,
      description: description || `Class election for ${position} position`,
      type: 'class',
      position,
      className,
      section,
      startDate: start,
      endDate: end,
      minAttendanceRequired: minAttendanceRequired || 75,
      status: 'Draft',
      createdBy: req.user.id,
      createdByRole: 'Teacher'
    });

    await election.save();

    return res.status(201).json({
      message: "Class election created successfully",
      election
    });

  } catch (err) {
    console.error("createClassElection error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update an existing class election
exports.updateClassElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    const updates = req.body;
    const Election = require('../../models/Election/Election.js');

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    // Only allow editing if the election hasn't started yet
    if (election.status !== 'Draft' && election.status !== 'Scheduled') {
      return res.status(403).json({
        message: `Cannot edit an election that is already ${election.status.toLowerCase()}`
      });
    }

    // List of allowed fields to update
    const allowedUpdates = ['title', 'className', 'section', 'position', 'description', 'startDate', 'endDate', 'minAttendanceRequired'];

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'startDate' || key === 'endDate') {
          election[key] = new Date(updates[key]);
        } else {
          election[key] = updates[key];
        }
      }
    });

    // Re-validate dates if changed
    if (election.startDate >= election.endDate) {
      return res.status(400).json({ message: "EndDate must be after StartDate" });
    }

    await election.save();

    res.json({
      message: "Election updated successfully",
      election
    });

  } catch (err) {
    console.error("updateClassElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


//Add candidate to class election
exports.addCandidateToClassElection = async (req, res) => {
  try {
    const { studentId, position, electionId } = req.body;
    const Election = require('../../models/Election/Election.js');

    if (!studentId || !electionId) {
      return res.status(400).json({ message: "studentId and electionId are required" });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    const studentRecord = await Student.findById(studentId);
    if (!studentRecord) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if student is already a candidate in this election
    const alreadyCandidate = election.candidates.some(
      c => c.student.toString() === studentId
    );
    if (alreadyCandidate) {
      return res.status(400).json({ message: "Student is already a candidate in this election" });
    }

    // Check minimum attendance
    if (studentRecord.attendence < election.minAttendanceRequired) {
      return res.status(400).json({
        message: `Student needs minimum ${election.minAttendanceRequired}% attendance. Current: ${studentRecord.attendence}%`
      });
    }

    // Add candidate to election
    election.candidates.push({
      student: studentId,
      votesCount: 0
    });
    await election.save();

    // Mark student as candidate
    studentRecord.iscandidate = true;
    studentRecord.isApproved = false;
    studentRecord.position = position || election.position;
    await studentRecord.save();

    res.json({
      message: "Candidate added to class election. Awaiting admin approval.",
      election,
      candidate: studentRecord
    });

  } catch (err) {
    console.error("addCandidateToClassElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//Start class election
exports.startClassElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    const Election = require('../../models/Election/Election.js');

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (election.status === 'Active') {
      return res.status(400).json({ message: "Election is already active" });
    }

    if (election.candidates.length < 2) {
      return res.status(400).json({ message: "Election needs at least 2 candidates to start" });
    }

    election.status = 'Active';
    election.startDate = new Date();
    await election.save();

    res.json({ message: "Class election started", election });

  } catch (err) {
    console.error("startClassElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//End class election
exports.endClassElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    const Election = require('../../models/Election/Election.js');

    const election = await Election.findById(electionId)
      .populate('candidates.student');

    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (election.status !== 'Active') {
      return res.status(400).json({ message: "Election is not active" });
    }

    let winnerStudent = null;

    if (election.candidates.length > 0) {
      const winnerCandidate = election.candidates.reduce((a, b) =>
        a.votesCount > b.votesCount ? a : b
      );

      winnerStudent = winnerCandidate.student;

      // ✅ SAVE RESULT INTO STUDENT MODEL
      await Student.findByIdAndUpdate(
        winnerStudent._id,
        { hasWon: true },
        { new: true }
      );

      election.winner = winnerStudent._id;
    }

    election.status = 'Completed';
    election.endDate = new Date();
    await election.save();

    res.json({
      message: "Class election ended",
      winner: {
        id: winnerStudent?._id,
        name: winnerStudent?.name,
      },
    });

  } catch (err) {
    console.error("endClassElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//List class elections
exports.listClassElections = async (req, res) => {
  try {
    const Election = require('../../models/Election/Election.js');

    const elections = await Election.find({ type: 'class' })
      .populate('candidates.student', 'name admissionNumber photoUrl className section')
      .populate('winner', 'name')
      .select('title position className section status startDate endDate candidates totalVotes winner')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ elections });

  } catch (err) {
    console.error("listClassElections error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete class election
exports.deleteClassElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    const Election = require('../../models/Election/Election.js');

    const election = await Election.findByIdAndDelete(electionId);

    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    res.json({ success: true, message: "Election deleted successfully" });

  } catch (err) {
    console.error("deleteClassElection error:", err);
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

    // Check attendance (e.g., minimum 75%)
    if (student.attendence < 75) {
      return res.status(400).json({
        message: "Student attendance is too low for nomination. Minimum 75% required.",
        currentAttendance: student.attendence
      });
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


// Delete/Remove candidate status from a student (Teacher side)
exports.deleteCandidate = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!student.iscandidate) {
      return res.status(400).json({ message: "This student is not a candidate" });
    }

    // Reset all candidate-related fields
    student.iscandidate = false;
    student.isApproved = false;
    student.position = null;
    student.manifesto = null;
    student.candidateBio = null;
    student.manifestoPoints = [];
    student.photoUrl = null;
    student.electionStatus = null;
    student.votesCount = 0;

    await student.save();

    return res.json({
      message: "Candidate status removed successfully",
      student: {
        _id: student._id,
        name: student.name,
      }
    });

  } catch (err) {
    console.error("deleteCandidate error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};


// POST: Add candidate details (candidateBio, manifestoPoints, photo)
exports.AddCandidateDetailsPost = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { candidateBio, manifestoPoints } = req.body;

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
        message: "Only approved candidates can add candidate details",
      });
    }

    // 🔒 Prevent editing after election starts
    if (student.electionStartAt && new Date(student.electionStartAt) <= new Date()) {
      return res.status(403).json({
        message: "Candidate details cannot be edited once election has started",
      });
    }

    /* ---------------- ADD/UPDATE FIELDS ---------------- */

    // Candidate Bio
    if (candidateBio && typeof candidateBio === "string") {
      student.candidateBio = candidateBio.trim();
    }

    // Manifesto Points
    if (manifestoPoints) {
      const points = Array.isArray(manifestoPoints)
        ? manifestoPoints
        : [manifestoPoints];

      student.manifestoPoints = points
        .map(p => (typeof p === "string" ? p.trim() : String(p).trim()))
        .filter(p => p.length > 0);
    }

    // Photo (Cloudinary)
    if (req.file) {
      student.photoUrl = req.file.path; // Cloudinary URL
    }

    await student.save();

    return res.status(201).json({
      message: "Candidate details added successfully",
      student: {
        _id: student._id,
        name: student.name,
        candidateBio: student.candidateBio,
        manifestoPoints: student.manifestoPoints,
        photoUrl: student.photoUrl,
      },
    });

  } catch (err) {
    console.error("AddCandidateDetailsPost error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// PUT: Update candidate details
exports.updateCandidateDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { candidateBio, manifestoPoints } = req.body;

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
    if (student.electionStartAt && new Date(student.electionStartAt) <= new Date()) {
      return res.status(403).json({
        message: "Candidate details cannot be edited once election has started",
      });
    }

    /* ---------------- UPDATE FIELDS ---------------- */

    // Candidate Bio
    if (candidateBio !== undefined && typeof candidateBio === "string") {
      student.candidateBio = candidateBio.trim();
    }

    // Manifesto Points
    if (manifestoPoints !== undefined) {
      const points = Array.isArray(manifestoPoints)
        ? manifestoPoints
        : [manifestoPoints];

      student.manifestoPoints = points
        .map(p => (typeof p === "string" ? p.trim() : String(p).trim()))
        .filter(p => p.length > 0);
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

exports.GetCandidateDetailsForTeacher = async (req, res) => {
  try {
    const { studentId } = req.params;

    console.log("ethiiiiiiiiiiiiiiiiiiiiiiii");


    if (!studentId) {
      return res.status(400).json({
        message: "studentId is required",
      });
    }

    const student = await Student.findById(studentId).select(
      "name position attendence candidateBio manifesto photoUrl iscandidate isApproved manifestoPoints className section "
    );
    console.log("bio", student?.candidateBio);



    if (!student) {
      return res.status(404).json({
        message: "Candidate not found",
      });
    }

    if (!student.iscandidate || !student.isApproved) {
      return res.status(403).json({
        message: "Candidate is not approved",
      });
    }

    return res.status(200).json({
      _id: student._id,
      name: student.name,
      position: student.position,
      attendence: student.attendence ?? 0,
      candidateBio: student.candidateBio || "",
      manifesto: Array.isArray(student.manifestoPoints) ? student.manifestoPoints : [],
      photoUrl: student.photoUrl || null,
    });


  }



  catch (error) {
    console.error("GetCandidateDetailsForTeacher error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


