const nodemailer = require("nodemailer");
const student =require('../../models/student/student.js')
const jwt = require("jsonwebtoken");
const emailverifier = require("../../config/mailer.js");
const  bcrypt = require("bcryptjs");

// student register
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
    student.otp = otp;
    student.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);


exports.studentregister = async (req, res) => {
  const { admissionNumber, name, email, className, section,password } = req.body;

  try {
    const existingStudent = await student.findOne({ admissionNumber });
    if (existingStudent) {
      return res.status(400).json({ message: "Student with this admission number already exists" });
    }

      const hashedPassword = await bcrypt.hash(password, 10);

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newStudent = new student({
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
    await emailverifier(email, otp);

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
    const studentRecord = await student.findOne({ admissionNumber });
    console.log(studentRecord);
    
    if (!studentRecord) {
      return res.status(404).json({ message: "Student not found" });
    }
    if (studentRecord.otp != otp ){
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (studentRecord.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    // OTP is valid
    studentRecord.otp = null;
    studentRecord.otpExpiry = null;
    studentRecord.isverified = true;
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
    const studentRecord = await student.findOne({ admissionNumber });
    if (!studentRecord) {
      return res.status(404).json({ message: "Student not found" });
    }
    const isMatch = await bcrypt.compare(password, studentRecord.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // Generate JWT
    const token = jwt.sign(
      { id: studentRecord._id, role: studentRecord.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    return res.status(200).json({ message: "Login successful", token });
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

    const voter = await student.findById(voterId);
    if (!voter) return res.status(404).json({ message: "Voter not found" });

    if (voter.votedFor) {
      return res.status(400).json({ message: "You have already voted" });
    }

    const candidate = await student.findById(candidateId);
    if (!candidate || !candidate.iscandidate || !candidate.isApproved) {
      return res.status(400).json({ message: "Invalid candidate" });
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


