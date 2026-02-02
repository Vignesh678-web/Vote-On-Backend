const express = require("express");
const router = express.Router();

const adminCandidatectrl = require("../../Controller/Admin/AdminCandidateController");
const auth = require("../../middleware/auth");
const requireAdmin = require("../../middleware/requireAdmin");
router.get(
  "/get-candidates",
  auth,
  adminCandidatectrl.getCandidates
);

// GET /api/admin/candidates/college
router.get(
  "/college",
  auth,
  requireAdmin,
  adminCandidatectrl.getCollegeCandidates
);

// POST /api/admin/candidates/create
router.post(
  "/create",
  auth,
  requireAdmin,
  adminCandidatectrl.createCandidateByAdmin
);

// GET /api/admin/candidates/pending
router.get(
  "/pending",
  auth,
  requireAdmin,
  adminCandidatectrl.getPendingCandidates
);


router.patch("/approve/:studentId", adminCandidatectrl.approveCandidate);

// PATCH /api/admin/candidates/:id/reject
router.patch(
  "/reject/:studentId", adminCandidatectrl.rejectCandidate);

// PATCH /api/admin/candidates/:id/revoke - moves approved back to pending
router.patch(
  "/revoke/:studentId", adminCandidatectrl.revokeCandidate);


// POST /api/admin/candidates/promote-class-winners
router.put(
  "/promote-class-winners",
  adminCandidatectrl.promoteClassWinnersToCollege
);



module.exports = router;
