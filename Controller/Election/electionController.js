const Election = require('../../models/Election/Election.js');
const Student = require('../../models/student/student.js');

// Create a new election (Admin only)
exports.createElection = async (req, res) => {
  const userRole = (req.user?.role || "").toLowerCase();
  const isAuthorized = userRole === 'returning_officer' || userRole === 'admin';

  if (!isAuthorized) {
    return res.status(403).json({ 
      message: "Conducting elections is restricted to the Returning Officer and Administrators.",
      debugRole: req.user?.role
    });
  }

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

    // Check if student is already a candidate in THIS election
    const alreadyInThisElection = election.candidates.some(
      c => c.student.toString() === studentId
    );
    if (alreadyInThisElection) {
      return res.status(400).json({ message: "Student is already a candidate in this election" });
    }

    // Check if student is already a candidate for the SAME position in any other ACTIVE/SCHEDULED election
    const otherElectionWithSamePosition = await Election.findOne({
      _id: { $ne: electionId },
      position: election.position,
      status: { $in: ['Draft', 'Scheduled', 'Active', 'Tie'] },
      'candidates.student': studentId
    });

    if (otherElectionWithSamePosition) {
      return res.status(400).json({ 
        message: `Student is already contesting for the position of "${election.position}" in the election: "${otherElectionWithSamePosition.title}".` 
      });
    }

    // Check attendance requirement
    if (student.attendence < election.minAttendanceRequired) {
      return res.status(400).json({
        message: `Student needs minimum ${election.minAttendanceRequired}% attendance. Current: ${student.attendence}%`
      });
    }

    // For class elections, verify student belongs to the class (flexible matching)
    if (election.type === 'class') {
      const sClass = (student.className || "").toLowerCase();
      const eClass = (election.className || "").toLowerCase();
      const sSection = (student.section || "").toLowerCase();
      const eSection = (election.section || "").toLowerCase();

      const classMatch = sClass.includes(eClass) || eClass.includes(sClass);
      const sectionMatch = (!sSection && !eSection) || 
                           (sSection && eSection && (sSection.includes(eSection) || eSection.includes(sSection)));

      if (!classMatch || !sectionMatch) {
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
    // Auto-approve college candidates as they are admin-selected
    student.isApproved = election.type === 'college' ? true : false;
    student.position = election.position;
    student.electionStatus = election.type === 'college' ? "Active" : "Pending";
    await student.save();

    res.json({
      message: election.type === 'college' 
        ? "Candidate added and approved for college election." 
        : "Candidate added to election. Awaiting approval.",
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
  const userRole = (req.user?.role || "").toLowerCase();
  const isAuthorized = userRole === 'returning_officer' || userRole === 'admin';

  if (!isAuthorized) {
    return res.status(403).json({ 
      message: "Only the Returning Officer or Administrator can start elections.",
      debugRole: req.user?.role
    });
  }
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
    // For college elections, we consider "hasWon" as approved
    const candidateIds = election.candidates.map(c => c.student);
    const candidates = await Student.find({
      _id: { $in: candidateIds },
      $or: [
        { isApproved: true },
        { hasWon: true },
        { isCollegeCandidate: true }
      ]
    });

    if (candidates.length < 2) {
      return res.status(400).json({
        message: election.type === 'college' 
          ? "Election needs at least 2 promoted winners to start"
          : "Election needs at least 2 approved candidates to start"
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

// End election and declare results (Admin/RO only)
exports.endElection = async (req, res) => {
  const userRole = (req.user?.role || "").toLowerCase();
  const isAuthorized = userRole === 'returning_officer' || userRole === 'admin';

  if (!isAuthorized) {
    return res.status(403).json({ 
      message: "Only the Returning Officer or Administrator can declare election results.",
      debugRole: req.user?.role
    });
  }
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

    // Sort candidates by votes to find ties
    const sorted = [...election.candidates].sort((a, b) => b.votesCount - a.votesCount);
    
    // Check for tie
    if (sorted.length >= 2 && sorted[0].votesCount === sorted[1].votesCount) {
      election.status = 'Tie';
      await election.save();
      
      return res.json({
        message: "Election ended in a tie. Please perform a toss to break the tie.",
        isTie: true,
        tiedCandidates: sorted.filter(c => c.votesCount === sorted[0].votesCount).map(c => ({
          studentId: c.student._id || c.student,
          name: c.student.name || "Unknown",
          votes: c.votesCount
        }))
      });
    }

    // Find winner
    let winner = null;
    if (election.candidates.length > 0) {
      const winnerCandidate = sorted[0];
      winner = winnerCandidate.student;
      election.winner = winnerCandidate.student._id || winnerCandidate.student;

      // Mark winner in student record
      const winnerId = winnerCandidate.student._id || winnerCandidate.student;

      // Mark as class winner and, for CLASS elections, promote to college-candidate
      const update = { 
        hasWon: true,
        votesCount: winnerCandidate.votesCount, // Copy vote count from election
        position: election.position // Copy position from election
      };
      
      if (election.type === 'class') {
        update.isCollegeCandidate = true;
      }

      const updatedStudent = await Student.findByIdAndUpdate(winnerId, update, { new: true });
      
      console.log(`[endElection] Winner marked: ${updatedStudent?.name}, Votes: ${winnerCandidate.votesCount}, Position: ${election.position}`);
    }

    election.status = 'Completed';
    election.endDate = new Date();
    await election.save();

    //  AUDIT LOG
    try {
      const { logAction } = require('../Audit/AuditController');
      await logAction(
        'ELECTION_ENDED',
        'ELECTION',
        `Election "${election.title}" ended. Status set to Completed.`,
        req.user.adminId || req.user.facultyId || req.user.id,
        req.user.role
      );
    } catch (logErr) {
      console.error("Audit logging failed:", logErr);
    }

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
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Resolve election tie with a toss (RO only)
exports.resolveTie = async (req, res) => {
  const userRole = (req.user?.role || "").toLowerCase();
  if (userRole !== 'returning_officer' && userRole !== 'admin') {
    return res.status(403).json({ message: "Unauthorized: only RO can resolve ties" });
  }

  try {
    const { id } = req.params;
    const { winnerId } = req.body; // RO can pick or system toss then RO confirms

    const election = await Election.findById(id).populate('candidates.student');
    if (!election) return res.status(404).json({ message: "Election not found" });

    if (election.status !== 'Tie') {
      return res.status(400).json({ message: "This election does not have a tie status" });
    }

    const winnerCandidate = election.candidates.find(c => 
      (c.student._id || c.student).toString() === winnerId
    );

    if (!winnerCandidate) {
      return res.status(400).json({ message: "Invalid candidate selected as winner" });
    }

    election.winner = winnerId;
    election.status = 'Completed';
    election.endDate = new Date();
    await election.save();

    // Mark student as winner
    const update = { 
      hasWon: true,
      votesCount: winnerCandidate.votesCount,
      position: election.position
    };
    if (election.type === 'class') update.isCollegeCandidate = true;
    await Student.findByIdAndUpdate(winnerId, update);

    // AUDIT LOG
    try {
      const { logAction } = require('../Audit/AuditController');
      await logAction(
        'TIE_RESOLVED',
        'ELECTION',
        `Election tie resolved manually/via toss for "${election.title}". Winner: ${winnerCandidate.student.name}`,
        req.user.id,
        req.user.role
      );
    } catch (e) {}

    res.json({ message: "Tie resolved successfully", winner: winnerCandidate.student.name });

  } catch (err) {
    console.error("resolveTie error:", err);
    res.status(500).json({ message: "Server error" });
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

    // For class elections, check voter belongs to the class (flexible matching)
    if (election.type === 'class') {
      const vClass = (voter.className || "").toLowerCase();
      const eClass = (election.className || "").toLowerCase();
      const vSection = (voter.section || "").toLowerCase();
      const eSection = (election.section || "").toLowerCase();

      // Check if election class is contained in student class or vice versa
      const classMatch = vClass.includes(eClass) || eClass.includes(vClass);
      
      // Section match: both empty OR one contains the other
      const sectionMatch = (!vSection && !eSection) || 
                           (vSection && eSection && (vSection.includes(eSection) || eSection.includes(vSection)));

      if (!classMatch || !sectionMatch) {
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
    
    console.log(`[castVote] Vote recorded:`);
    console.log(`  Election: "${election.title}" (${election._id})`);
    console.log(`  Voter: ${voter.name} (${voter.admissionNumber})`);
    console.log(`  Candidate: ${candidateId}`);
    console.log(`  New vote count for candidate: ${candidateEntry.votesCount}`);
    console.log(`  Total votes in election: ${election.totalVotes}`);
    
    await election.save();
    
    console.log(`[castVote] ✅ Vote saved successfully`);

    // 📝 AUDIT LOG
    try {
      const { logAction } = require('../Audit/AuditController');
      await logAction(
        'VOTE_CAST',
        'ELECTION',
        `Vote cast in election: ${election.title}`,
        req.user.id,
        'student'
      );
    } catch (logErr) {
      console.error("Audit logging failed:", logErr);
    }

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

    console.log(`[getElectionsForStudent] Request from user ID: ${studentId}, Role: ${req.user?.role}`);
    console.log(`[getElectionsForStudent] Student Details - Name: ${student.name}, Class: ${student.className}, Section: ${student.section}`);

    // Fetch all potentially relevant elections
    // We fetch Active, Scheduled, and Completed elections
    const allElections = await Election.find({
      status: { $in: ['Active', 'Scheduled', 'Completed'] }
    })
      .populate('candidates.student', 'name admissionNumber photoUrl candidateBio manifestoPoints position')
      .populate('winner', 'name admissionNumber photoUrl')
      .sort({ createdAt: -1 });

    console.log(`[getElectionsForStudent] Total elections in DB: ${allElections.length}`);
    // Filter using the model's canStudentVote logic (flexible matching)
    const eligibleElections = allElections.filter(election => {
      return election.canStudentVote(student);
    });

    console.log(`[getElectionsForStudent] Eligible elections after filtering: ${eligibleElections.length} out of ${allElections.length}`);
    console.log(`[getElectionsForStudent] Eligible election IDs:`, eligibleElections.map(e => ({ id: e._id, title: e.title, type: e.type, status: e.status })));
    // Mark which elections student has already voted in
    const electionsWithVoteStatus = eligibleElections.map(election => {
      // Use toObject() if it's a mongoose document, or use it as is if lean() was used (but here we didn't use lean to keep methods)
      const electionObj = election.toObject ? election.toObject() : election;
      
      return {
        ...electionObj,
        hasVoted: Array.isArray(election.voters) && election.voters.some(v => v.student.toString() === studentId)
      };
    });

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

// Get all class election winners
exports.getClassWinners = async (req, res) => {
  try {
    const winners = await Student.find({ hasWon: true })
      .select('name admissionNumber photoUrl className section position')
      .lean();

    res.json({ winners });
  } catch (err) {
    console.error("getClassWinners error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Add a class winner to a college election
exports.addWinnerToCollegeElection = async (req, res) => {
  try {
    const { electionId, studentId, position } = req.body;

    if (!electionId || !studentId) {
      return res.status(400).json({ message: "electionId and studentId are required" });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (election.type !== 'college') {
      return res.status(400).json({ message: "This operation is only for college-level elections" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!student.hasWon) {
      return res.status(400).json({ message: "Only class election winners can be added to college elections" });
    }

    // Check if already a candidate in THIS election
    const alreadyInThisElection = election.candidates.some(c => c.student.toString() === studentId);
    if (alreadyInThisElection) {
      return res.status(400).json({ message: "Student is already a candidate in this election" });
    }

    // Check if already a candidate for the SAME position in any other ACTIVE/SCHEDULED election
    const otherElectionWithSamePosition = await Election.findOne({
      _id: { $ne: electionId },
      position: election.position,
      status: { $in: ['Draft', 'Scheduled', 'Active', 'Tie'] },
      'candidates.student': studentId
    });

    if (otherElectionWithSamePosition) {
      return res.status(400).json({ 
        message: `Student is already contesting for the position of "${election.position}" in another college-level election: "${otherElectionWithSamePosition.title}".` 
      });
    }

    election.candidates.push({
      student: studentId,
      votesCount: 0
    });

    // Mark student as a college candidate for persistent tracking
    student.isCollegeCandidate = true;
    await student.save();

    await election.save();

    res.json({ message: "Winner added to college election successfully", election });
  } catch (err) {
    console.error("addWinnerToCollegeElection error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
