const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const candidateCtrl = require("../../Controller/Candidate/candidateController");
const auth = require("../../middleware/auth");
const requireAdmin = require("../../middleware/requireAdmin");

router.post(
  "/add",
  auth,
  requireAdmin,
  [
     body("studentId").notEmpty().withMessage("studentId is required"),
    body("position").notEmpty().withMessage("position is required"),
  ],
  candidateCtrl.addCandidate
);
router.get("/", auth, requireAdmin, candidateCtrl.getCandidates);
router.get("/:id", auth, requireAdmin, candidateCtrl.getCandidate);
router.delete("/:id", auth, requireAdmin, candidateCtrl.removeCandidate);

module.exports = router;