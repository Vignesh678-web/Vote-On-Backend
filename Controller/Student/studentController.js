const nodemailer = require("nodemailer");
const Student = require('../../models/student/student.js');
const jwt = require("jsonwebtoken");
const emailverifier = require("../../config/mailer.js");
const bcrypt = require("bcryptjs");


exports.studentregister = async (req, res) => {
  const { admissionNumber, name, email, className, section, password } = req.body;

  try {
    const existingStudent = await Student.findOne({ admissionNumber });
    if (existingStudent) {
      return res.status(400).json({ message: "Student with this admission number already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newStudent = new Student({
      admissionNumber,
      name,
      email,
      className,
      password: hashedPassword,
      section,
      role: "student",
      otp: otp,
      otpExpiry: Date.now() + 5 * 60 * 1000,
    });

    await newStudent.save();

    // send email
    try {
      await emailverifier(email, otp);
    } catch (mailError) {
      // Rollback: Delete the student record if email fails so they can try again
      await Student.findByIdAndDelete(newStudent._id);
      console.error("[REGISTRATION] Email failed, record deleted:", mailError);
      return res.status(500).json({
        message: "Failed to send verification email. Please check your email address or try again later.",
        success: false
      });
    }

    return res.status(201).json({
      message: "Student registered. OTP sent to email.",
      success: true
    });

  } catch (error) {
    console.error("Student registration error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// verify OTP
exports.verifyOtp = async (req, res) => {
  const { admissionNumber, otp } = req.body;
  try {
    const studentRecord = await Student.findOne({ admissionNumber });
    console.log(studentRecord);

    if (!studentRecord) {
      return res.status(404).json({ message: "Student not found" });
    }
    if (studentRecord.otp != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (studentRecord.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    // OTP is valid
    studentRecord.otp = null;
    studentRecord.otpExpiry = null;
    studentRecord.isVerified = true;
    await studentRecord.save();
    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
//login with password
exports.loginwithPassword = async (req, res) => {
  const { admissionNumber, password } = req.body;
  try {
    const studentRecord = await Student.findOne({ admissionNumber });
    if (!studentRecord) {
      return res.status(404).json({ message: "Student not found" });
    }
    const isMatch = await bcrypt.compare(password, studentRecord.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // Generate JWT
    const token = jwt.sign(
      { id: studentRecord._id, role: studentRecord.role || "student" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    return res.status(200).json({
      message: "Login successful",
      token,
      student: {
        _id: studentRecord._id,
        name: studentRecord.name,
        admissionNumber: studentRecord.admissionNumber,
        className: studentRecord.className,
        section: studentRecord.section,
        email: studentRecord.email,
        photoUrl: studentRecord.photoUrl,
        role: studentRecord.role || "student"
      }
    });
  }
  catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

//vote for candidate 


exports.voteCandidate = async (req, res) => {
  try {
    const voterId = req.user.id;             // <-- authenticated user
    const candidateId = req.params.candidateId;

    if (!candidateId) {
      return res.status(400).json({ message: "candidateId required" });
    }

    const voter = await Student.findById(voterId);
    if (!voter) return res.status(404).json({ message: "Voter not found" });

    if (voter.votedFor) {
      return res.status(400).json({ message: "You have already voted" });
    }

    const candidate = await Student.findById(candidateId);
    if (!candidate || !candidate.iscandidate || !candidate.isApproved) {
      return res.status(400).json({ message: "Invalid candidate" });
    }

    // STRICT DEPARTMENT MATCH CHECK
    const voterClass = (voter.className || "").trim().toLowerCase();
    const voterSection = (voter.section || "").trim().toLowerCase();
    const candClass = (candidate.className || "").trim().toLowerCase();
    const candSection = (candidate.section || "").trim().toLowerCase();

    if (voterClass !== candClass || voterSection !== candSection) {
      console.log(`[VOTE-SECURITY] Denied: Voter ${voter.name} (${voterClass}/${voterSection}) tried to vote for Candidate ${candidate.name} (${candClass}/${candSection})`);
      return res.status(403).json({
        message: "Unauthorized Vote: You are not eligible to vote in this department's election."
      });
    }

    candidate.votesCount += 1;
    voter.votedFor = candidateId;

    await candidate.save();
    await voter.save();

    return res.json({ message: "Vote cast successfully" });

  } catch (err) {
    console.error("voteCandidate error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// get profile details
exports.getProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findById(studentId).select("-password -otp -otpExpiry");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ success: true, student });
  } catch (error) {
    console.error("getProfile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


