const nodemailer = require("nodemailer");
const User = require("../../models/User/User");


exports.sendOtp = async(req,res) => {
  const {admissionNumber, email} = req.body

  try{
    const user = await User.findOne({admissionNumber});
    if(!user) return res.status(404).json({message:"Student not found" });

    const otp = Math.floor(100000+Math.random()*900000);
    const otpExpiry = new Date(Date.now()+5*60*1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASSWORD, 
      },
    });

    const mailOptions = {
      from:process.env.EMAIL_USER,
      to:email,
      subject:"Your OTP for Voting ",
      text:`Your OTP is ${otp}. it will expire in 5 minutes.`,
    };
    await transporter.sendMail(mailOptions);
    res.json({message:"OTP sent to your email"});
  } catch(error){
    console.error(error);
    res.status(500).json({message:"Error Sending OTP",error});
  }
};

exports.veriffyOtp = async(req,res) => {
  const {email, otp} = req.body;
  console.log(req.body,"kkkkkkkkkeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeekkkkkkkkkk");
  

  if(!email || !otp) {
    return res.status(400).json({message:"AdmissionNumber and OTP are required "});
  }
  try {
    const user = await User.findOne({email});
    if(!user) return res.status(404).json({message:"admin not found"});

    if(user.otp !== parseInt(otp)) {
      return res.status(400).json({message:"Invalid OTP"});
    }

    if(user.otpExpiry<new Date()) {
      return res.status(400).json({message:"OTP expired"});
    }

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.json({message:"OTP verified successfully",success :true});
  } catch(error){
    res.status(500).json({message:"Error verifying OTP", error:error.message });
  }
};

exports.loginwithPassword = async(req,res) => {
  const {admissionNumber,password} = req.body;

  if(!admissionNumber || !password) {
    return res.status(400).json({message:"admissionNumber and password are required"});
  } 

  try{
    const user = await User.findOne({admissionNumber});
    if(!user) return res.status(404).json({message:"User not found"});

    const match = await bcrypt.compare(password, user.password);
    if(!match) return res.status(400).json({message:"Incorrect Password"});

    return res.json({message:"Login Successfull"});
  } catch(error) {
    res.status(500).json({message:"Error Logging in", error:error.message});
  }
};