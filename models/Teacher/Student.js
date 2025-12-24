const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
   firstName: { type:String, required: true, trim:true},
   lastName: { type:String, required:true, trim: true},
   admissionNumber: { type:String, required:true, unique:true, trim: true },
   attendancePercentage: { type: Number, required: true, min: 0, max: 100},
   email:{type:String,required:true,trim:true},
   otp: { type: Number },
   otpExpiry: { type: Date },
  
   className: { type: String},
   section: {type: String},
   eligible: {type: Boolean},
   createdBy: {type:mongoose.Schema.Types.ObjectId, ref: 'Teacher'},
   createdAt: { type: Date, default: Date.now} 
});

studentSchema.pre("save", function (next) {
  this.eligible =
    typeof this.attendancePercentage === "number"
      ? this.attendancePercentage >= 75
      : false;
  next();
});

module.exports = mongoose.model('Student', studentSchema);