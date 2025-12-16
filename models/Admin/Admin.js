const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  // adminId:{
  //   type:String,
  //   required:[true,'adminId is required'],
  //   unique:true,
  //   trim:true,
  //   uppercase:true,
  // },
   
  Name:{type:String,trim:true},
  email:{type:String,trim:true,lowercase:true},
  
  password: {
    type:String,
    required:[true,'password is required'],
  },
  otp:{
    type:String,
    
  },
  otpExpiry:{
    type :Date
  },

  role: {
    type: String,
    enum: ['admin'],
    default:'admin',
  },
},
{timestamps: true}
);

module.exports = mongoose.model('admin',AdminSchema);