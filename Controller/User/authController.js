const nodemailer = require("nodemailer");
const User = require("../../models/User/User");
const jwt = require("jsonwebtoken");

const Student = require("../../models/Teacher/Student");

exports.sendOtp = async (req, res) => {
  const { admissionNumber } = req.body;

  if (!admissionNumber) {
    return res.status(400).json({
      success: false,
      message: "Admission number is required"
    });
  }

  try {
    const student = await Student.findOne({ admissionNumber });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    student.otp = otp;

    student.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await student.save();

    // Mailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const user=new User({
      admissionNumber:admissionNumber,
      role:"student",
      otp:otp,
      otpExpiry:student.otpExpiry

    })
     
    await user.save()



    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: student.email,
      subject: "Student Login OTP",
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`
    });

    const savingAdmissionnumber = student.admissionNumber;
    // const savingEmail = student.email;






    return res.status(200).json({
      success: true,
      message: "OTP sent to registered email",
      data: {
        email: student.email,
        admissionNumber: admissionNumber,
      }
    });

  } catch (err) {
    console.error("Send OTP error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


exports.verifyOtp = async (req, res) => {
  const { admissionNumber, otp } = req.body;

  if (!admissionNumber || !otp) {
    return res.status(400).json({
      success: false,
      message: "Admission number and OTP are required"
    });
  }

  try {
    const student = await Student.findOne({ admissionNumber });



    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (!student.otp || !student.otpExpiry) {
      return res.status(400).json({ message: "OTP not requested" });
    }

    if (student.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (String(student.otp) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    student.otp = null;
    student.otpExpiry = null;
    await student.save();

    const token = jwt.sign(
      {
        id: student._id,
        role: "student",
        admissionNumber: student.admissionNumber
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      student: {
        id: student._id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        className: student.className,
        section: student.section,
        role: "student"
      }
    });



  } catch (err) {
    console.error("OTP verify error:", err);
    return res.status(500).json({ message: "Server error" });
  }


};
exports.veriffyOtp = async (req, res) => {
  const { email, otp } = req.body;
  console.log(req.body, "kkkkkkkkkeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeekkkkkkkkkk");


  if (!email || !otp) {
    return res.status(400).json({ message: "AdmissionNumber and OTP are required " });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "admin not found" });

    if (user.otp !== parseInt(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.json({ message: "OTP verified successfully", success: true });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP", error: error.message });
  }
};

