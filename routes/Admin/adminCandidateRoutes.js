const express = require("express");
const router = express.Router();

const adminCandidatectrl = require("../../Controller/Admin/AdminCandidateController");
const auth = require("../../middleware/auth");
const requireAdmin = require("../../middleware/requireAdmin");

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

// PATCH /api/admin/candidates/:id/approve
router.patch(
  "/:id/approve",
  auth,
  requireAdmin,
  adminCandidatectrl.approveCandidate
);

// PATCH /api/admin/candidates/:id/reject
router.patch(
  "/:id/reject",
  auth,
  requireAdmin,
  adminCandidatectrl.rejectCandidate
);

module.exports = router;
