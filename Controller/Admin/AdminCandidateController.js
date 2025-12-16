const Candidate = require("../../models/candidate/Candidate")

exports.approveCandidate = async(req,res) => {
  try {
    const { id } = req.params;

    const candidate = await Candidate.findById(id);
    if(!candidate)
      return res.status(404).json({message:"candidate not found"});

    candidate.isApproved = true;
    candidate.iscandidate = true;
    await candidate.save();

    res.json({message:"Candidate approved",candidate});
  } catch(err) {
    console.error("approveCandidate error:",err);
    res.status(500).json({message:"Server error",error:err.message});

  }
};

exports.rejectCandidate = async (req,res) => {
  try{
    const {id} = req.params;

    const candidate = await Candidate.findById(id);
    if(!candidate)
      return res.status(404).json({message:"candidate not found"});

    candidate.isApproved = false;
    candidate.iscandidate = false;
    await candidate.save();

    res.json({message:"Candidate rejected", candidate});
  } catch(err) {
    console.error("rejectCandidate error:", err);
    res.status(500).json({message:"Server Error",error:err.message});
  }
};

exports.getPendingCandidates = async (req, res) => {
  try {
    const pending = await Candidate.find({ isApproved: false })
      .populate("student")
      .lean();

    res.json({ candidates: pending });
  } catch (err) {
    console.error("getPendingCandidates error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.createCandidateByAdmin = async(req,res) => {

  try{
    const {student,position,manifesto,photoUrl} = req.body;

    if(!student||!position) {
      return res.status(400).json({
        message:"student and position are required",
      });
    }

    const existing = await Candidate.findOne({student});
    if(existing) {
      return res.status(409).json({
        message:"candidate already exists for this student",
      });
    }
    const candidate = new Candidate ({
      student,
      position,
      manifesto,
      photoUrl,
      iscandidate:true,
      isApproved:true,
      createdByAdmin:true,
      createdBy:null,
    });
    await candidate.save();

    return res.status(201).json({
      message:"Candidate Created By admin",
      candidate,
    });
  } catch (err)
  {
    console.error("createCandidateByAdmin error",err);
    return res 
    .status(500)
    .json({message:"Server error",error: err.message});
  }
};




