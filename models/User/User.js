const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  admissionNumber:{
    type:String,
    unique:true
  },
  facultyId: {
    type:String,
    unique:true
  },
  
  password:{
    type:String
  },

  role:{
    type:String,
    enum:["student","faculty","admin"],
    required:true
  },

  name:{
    type:String
  },
  department:{
    type:String
  },

  otp: {
    type:String
  },
  otpExpiry:{
    type:Date
  }
});

module.exports = mongoose.model("User",userSchema);