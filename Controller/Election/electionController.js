const Election = require('../../models/Election/Election.js');
const Student = require('../../models/student/student.js');

// Create a new election (Admin only)
exports.createElection = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      position,
      className,
      section,
      startDate,
      endDate,
      minAttendanceRequired
    } = req.body;

    // Validation
    if (!title || !type || !position || !startDate || !endDate) {
      return res.status(400).json({
        message: "title, type, position, startDate, and endDate are required"
      });
    }

    // For class elections, className and section are required
    if (type === 'class' && (!className || !section)) {
      return res.status(400).json({
        message: "className and section are required for class elections"
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

    const election = new Election({
      title,
      description,
      type,
      position,
      className: type === 'class' ? className : null,
      section: type === 'class' ? section : null,
      startDate: start,
      endDate: end,
      minAttendanceRequired: minAttendanceRequired || 75,
      status: 'Draft',
      createdBy: req.user?.id,
      createdByRole: req.user?.role === 'admin' ? 'admin' : 'Teacher'
    });

    await election.save();

    return res.status(201).json({
      message: "Election created successfully",
      election
    });

  } catch (err) {
    console.error("createElection error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all elections
exports.getAllElections = async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;

    const elections = await Election.find(filter)
      .populate('candidates.student', 'name admissionNumber photoUrl className section')
      .populate('winner', 'name admissionNumber photoUrl')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ elections });

  } catch (err) {
    console.error("getAllElections error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get single election by ID
exports.getElectionById = async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findById(id)
      .populate('candidates.student', 'name admissionNumber photoUrl className section candidateBio manifestoPoints position')
      .populate('winner', 'name admissionNumber photoUrl')
      .lean();

    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    res.json({ election });

  } catch (err) {
    console.error("getElectionById error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Add candidate to election
exports.addCandidateToElection = async (req, res) => {
  try {
    const { electionId, studentId } = req.body;

    if (!electionId || !studentId) {
      return res.status(400).json({ message: "electionId and studentId are required" });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (election.status !== 'Draft' && election.status !== 'Scheduled') {
      return res.status(400).json({
        message: "Cannot add candidates to an active or completed election"
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if student is already a candidate
    const alreadyCandidate = election.candidates.some(
      c => c.student.toString() === studentId
    );
    if (alreadyCandidate) {
      return res.status(400).json({ message: "Student is already a candidate in this election" });
    }

    // Check attendance requirement
    if (student.attendence < election.minAttendanceRequired) {
      return res.status(400).json({
        message: `Student needs minimum ${election.minAttendanceRequired}% attendance. Current: ${student.attendence}%`
      });
    }

    // For class elections, verify student belongs to the class
    if (election.type === 'class') {
      if (student.className !== election.className || student.section !== election.section) {
        return res.status(400).json({
          message: "Student does not belong to this class/section"
        });
      }
    }

    // Add candidate
    election.candidates.push({
      student: studentId,
      votesCount: 0
    });
    await election.save();

    // Update student record
    student.iscandidate = true;
    student.isApproved = false;
    student.position = election.position;
    await student.save();

    res.json({
      message: "Candidate added to election. Awaiting approval.",
      election
    });

  } catch (err) {
    console.error("addCandidateToElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Schedule election (set to Scheduled status)
exports.scheduleElection = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    const election = await Election.findById(id);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (election.status !== 'Draft') {
      return res.status(400).json({ message: "Only draft elections can be scheduled" });
    }

    if (election.candidates.length < 2) {
      return res.status(400).json({ message: "Election needs at least 2 candidates" });
    }

    // Update dates if provided
    if (startDate) election.startDate = new Date(startDate);
    if (endDate) election.endDate = new Date(endDate);

    election.status = 'Scheduled';
    await election.save();

    res.json({ message: "Election scheduled successfully", election });

  } catch (err) {
    console.error("scheduleElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Start election (Admin only)
exports.startElection = async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findById(id);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (election.status === 'Active') {
      return res.status(400).json({ message: "Election is already active" });
    }

    if (election.status === 'Completed') {
      return res.status(400).json({ message: "Election has already been completed" });
    }

    if (election.candidates.length < 2) {
      return res.status(400).json({ message: "Election needs at least 2 candidates to start" });
    }

    // Check all candidates are approved
    const candidateIds = election.candidates.map(c => c.student);
    const candidates = await Student.find({
      _id: { $in: candidateIds },
      isApproved: true
    });

    if (candidates.length < 2) {
      return res.status(400).json({
        message: "Election needs at least 2 approved candidates to start"
      });
    }

    election.status = 'Active';
    election.startDate = new Date();
    await election.save();

    res.json({ message: "Election started successfully", election });

  } catch (err) {
    console.error("startElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// End election and declare results (Admin only)
exports.endElection = async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findById(id)
      .populate('candidates.student', 'name');

    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (election.status !== 'Active') {
      return res.status(400).json({ message: "Only active elections can be ended" });
    }

    // Find winner
    let winner = null;
    if (election.candidates.length > 0) {
      const winnerCandidate = election.candidates.reduce((a, b) =>
        a.votesCount > b.votesCount ? a : b
      );
      winner = winnerCandidate.student;
      election.winner = winnerCandidate.student._id || winnerCandidate.student;

      // Mark winner in student record
      const winnerId = winnerCandidate.student._id || winnerCandidate.student;

      // Mark as class winner and, for CLASS elections, promote to college-candidate
      const update = { hasWon: true };
      if (election.type === 'class') {
        update.isCollegeCandidate = true;
      }

      await Student.findByIdAndUpdate(winnerId, update, { new: true });
    }

    election.status = 'Completed';
    election.endDate = new Date();
    await election.save();

    res.json({
      message: "Election ended successfully",
      election,
      winner,
      results: election.candidates.map(c => ({
        candidate: c.student,
        votes: c.votesCount
      }))
    });

  } catch (err) {
    console.error("endElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Cast vote (Student only)
exports.castVote = async (req, res) => {
  try {
    const { electionId, candidateId } = req.body;
    const voterId = req.user.id;

    if (!electionId || !candidateId) {
      return res.status(400).json({ message: "electionId and candidateId are required" });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    // Check election is active
    if (election.status !== 'Active') {
      return res.status(400).json({ message: "Election is not active" });
    }

    // Check election timing
    const now = new Date();
    if (now < election.startDate || now > election.endDate) {
      return res.status(400).json({ message: "Voting is not open at this time" });
    }

    // Get voter
    const voter = await Student.findById(voterId);
    if (!voter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    // Check voter is verified
    if (!voter.isverified) {
      return res.status(400).json({ message: "Please verify your account before voting" });
    }

    // For class elections, check voter belongs to the class
    if (election.type === 'class') {
      if (voter.className !== election.className || voter.section !== election.section) {
        return res.status(403).json({ message: "You cannot vote in this class election" });
      }
    }

    // Check if already voted
    if (election.hasStudentVoted(voterId)) {
      return res.status(400).json({ message: "You have already voted in this election" });
    }

    // Check candidate exists in this election
    const candidateEntry = election.getCandidateByStudentId(candidateId);
    if (!candidateEntry) {
      return res.status(400).json({ message: "Invalid candidate for this election" });
    }

    // Cast vote
    candidateEntry.votesCount += 1;
    election.voters.push({ student: voterId, votedAt: new Date() });
    election.totalVotes += 1;
    await election.save();

    res.json({ message: "Vote cast successfully" });

  } catch (err) {
    console.error("castVote error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get elections for a student (what they can vote in)
exports.getElectionsForStudent = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findById(studentId);

    if (!student) {
      console.log(`[getElectionsForStudent] Student ${studentId} not found`);
      return res.status(404).json({ message: "Student not found" });
    }

    console.log(`[getElectionsForStudent] Fetching for Student: ${student.name}, Class: ${student.className}, Section: ${student.section}`);

    // Get active/scheduled/completed college elections + class elections for student's class (case-insensitive)
    const elections = await Election.find({
      status: { $in: ['Active', 'Scheduled', 'Completed'] },
      $or: [
        { type: 'college' },
        {
          type: 'class',
          className: { $regex: new RegExp(`^${student.className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          section: { $regex: new RegExp(`^${student.section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }
      ]
    })
      .populate('candidates.student', 'name admissionNumber photoUrl candidateBio manifestoPoints position')
      .populate('winner', 'name admissionNumber photoUrl')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[getElectionsForStudent] Found ${elections.length} eligible elections`);

    // Mark which elections student has already voted in
    const electionsWithVoteStatus = elections.map(election => ({
      ...election,
      hasVoted: Array.isArray(election.voters) && election.voters.some(v => v.student.toString() === studentId)
    }));

    res.json({ elections: electionsWithVoteStatus });

  } catch (err) {
    console.error("getElectionsForStudent error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get election results
exports.getElectionResults = async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findById(id)
      .populate('candidates.student', 'name admissionNumber photoUrl')
      .populate('winner', 'name admissionNumber photoUrl')
      .lean();

    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    // Sort candidates by votes
    const results = election.candidates
      .map(c => ({
        candidate: c.student,
        votes: c.votesCount,
        percentage: election.totalVotes > 0
          ? ((c.votesCount / election.totalVotes) * 100).toFixed(2)
          : 0
      }))
      .sort((a, b) => b.votes - a.votes);

    res.json({
      election: {
        _id: election._id,
        title: election.title,
        type: election.type,
        position: election.position,
        status: election.status,
        totalVotes: election.totalVotes,
        winner: election.winner
      },
      results
    });

  } catch (err) {
    console.error("getElectionResults error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Cancel election (Admin only)
exports.cancelElection = async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findById(id);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (election.status === 'Completed') {
      return res.status(400).json({ message: "Cannot cancel a completed election" });
    }

    election.status = 'Cancelled';
    await election.save();

    res.json({ message: "Election cancelled successfully", election });

  } catch (err) {
    console.error("cancelElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
