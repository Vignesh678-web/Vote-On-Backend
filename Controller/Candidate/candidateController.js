
const {validationResult} = require("express-validator");
const student =require('../../models/student/student.js');


exports.addstudent = async(req,res) => {

  try{
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json({errors:errors.array()});
    }
    const {studentId,position,manifesto,photoUrl} = req.body;

    const student = await student.findById(studentId);
    if(!student) {
      return res.status(404).json({message:"Student not found" });
    }

    if(!student.eligible) {
      return res.status(400).json({message:"This student is not eligible to be a candidate"});
    }

    const candidate = new Candidate({
      student:studentId,
      position,
      manifesto,
      photoUrl,
      createdBy:req.user?.id,
    });
    await candidate.save();

    return res.status(201).json({
      message:"Candidate added Successfully",
      candidate,
    });
   } catch (err) {
    console.error("addCandidate error:",err);
    res.status(500).json({message:"Server Error", error:err.message});
   }
  };

  exports.getstudent = async(req,res) => {
    try{
      const student = await student.find().populate("student","-createdBy").lean();

      res.json({student});
    } catch(err) {
      console.error("getCandidates error:",err);
      res.status(500).json({message:"Server Error", error:err.message});
    }
  };

  exports.getstudent = async(req,res) => {
    try {
      const student = await student.findById(req.params.id).populate("student");
      if(!student) return res.status(404).json({message:"student not found"});

      res.json({student});
    } catch(err) {
      console.error("getStudent error",err);
      res.status(500).json({message:"server error", error:err.message});
    }
  };

  exports.removestudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "student not found" });
    }

    await student.findByIdAndDelete(id);

    return res.json({ message: "student removed successfully" });
  } catch (err) {
    console.error("removeStudent error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.getApproved = async (req, res) => { 
  const students = await student.find({ isApproved: true }) .populate("student").lean();
   res.json({ students }); 
};