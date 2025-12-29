const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const candidateCtrl = require("../../Controller/Candidate/candidateController");
const Studentcontroller = require("../../Controller/Student/studentController");
const auth = require("../../middleware/auth");
const requireAdmin = require("../../middleware/requireAdmin");

router.post(
  "/create",
  auth,
  Studentcontroller.studentregister
);
router.get("/", auth, requireAdmin, candidateCtrl.getstudent

  
);
router.get("/:id", auth, requireAdmin, candidateCtrl.getstudent);
router.delete("/:id", auth, requireAdmin, candidateCtrl.removestudent);
module.exports = router;