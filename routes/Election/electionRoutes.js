const express = require('express');
const router = express.Router();
const electionController = require('../../Controller/Election/electionController');
const auth = require("../../middleware/auth");

// ============ ADMIN / GENERAL ROUTES ============

// Create election (Admin only)
router.post('/create', auth, electionController.createElection);

// Get all elections
router.get('/', auth, electionController.getAllElections);

// Get class winners
router.get('/class-winners', auth, electionController.getClassWinners);

// Add winner to college election
router.post('/add-college-candidate', auth, electionController.addWinnerToCollegeElection);

// ============ STUDENT ROUTES (MUST BE BEFORE :id ROUTES) ============

// Get elections student can vote in
router.get('/student/available', auth, electionController.getElectionsForStudent);

// Cast vote
router.post('/vote', auth, electionController.castVote);

// ============ PARAMETERIZED ROUTES (MUST BE AFTER SPECIFIC ROUTES) ============

// Get single election
router.get('/:id', auth, electionController.getElectionById);

// Add candidate to election
router.post('/add-candidate', auth, electionController.addCandidateToElection);

// Schedule election
router.put('/:id/schedule', auth, electionController.scheduleElection);

// Start election
router.put('/:id/start', auth, electionController.startElection);

// End election
router.put('/:id/end', auth, electionController.endElection);

// Cancel election
router.put('/:id/cancel', auth, electionController.cancelElection);

// Get election results
router.get('/:id/results', auth, electionController.getElectionResults);


module.exports = router;
