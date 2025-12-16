const Student = require("../../models/Teacher/Student");
const Candidate = require("../../models/candidate/Candidate");
const {validationResult} = require("express-validator");

exports.addCandidate = async(req,res) => {

  try{
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json({errors:errors.array()});
    }
    const {studentId,position,manifesto,photoUrl} = req.body;

    const student = await Student.findById(studentId);
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

  exports.getCandidates = async(req,res) => {
    try{
      const candidates = await Candidate.find().populate("student","-createdBy").lean();

      res.json({candidates});
    } catch(err) {
      console.error("getCandidates error:",err);
      res.status(500).json({message:"Server Error", error:err.message});
    }
  };

  exports.getCandidate = async(req,res) => {
    try {
      const candidate = await Candidate.findById(req.params.id).populate("student");
      if(!candidate) return res.status(404).json({message:"Candidate not found"});

      res.json({candidate});
    } catch(err) {
      console.error("getCandidate error",err);
      res.status(500).json({message:"server error", error:err.message});
    }
  };

  exports.removeCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    await Candidate.findByIdAndDelete(id);

    return res.json({ message: "Candidate removed successfully" });
  } catch (err) {
    console.error("removeCandidate error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.getApproved = async (req, res) => { 
  const candidates = await Candidate.find({ isApproved: true }) .populate("student").lean();
   res.json({ candidates }); 
};