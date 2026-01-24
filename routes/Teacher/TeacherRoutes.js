const express = require('express');
const router = express.Router();
const { body } = require("express-validator")
const teacherController = require('../../Controller/Teacher/TeacherController');
const auth = require("../../middleware/auth");
const upload = require('../../middleware/upload');


router.post('/students', auth, teacherController.registerStudent);
router.get('/students', auth, teacherController.listStudents);
router.post('/attendance', auth, teacherController.Addattendance);
router.post('/update-attendance', auth, teacherController.updateAttendance);
router.get('/students/:id', auth, teacherController.getStudent);
router.put('/students/:id', auth, teacherController.updateStudent);
router.delete('/students/:id', auth, teacherController.deleteStudent);
router.post('/nominate', auth, upload.single("photo"), teacherController.nominateCandidate);
router.get('/approved-candidates', auth, teacherController.listApprovedCandidates);
router.post('/candidates/adddetails/:studentId', auth, upload.single("photo"), teacherController.AddCandidateDetailsPost);
router.put("/candidates/adddetails/:studentId", auth, upload.single("photo"), teacherController.updateCandidateDetails);
router.get('/candidates/:studentId', auth, teacherController.GetCandidateDetailsForTeacher);


router.post(
  '/class-election/create',
  auth,
  teacherController.createClassElection
);

router.put(
  '/class-election/:electionId',
  auth,
  teacherController.updateClassElection
);

router.post(
  '/class-election/add-candidate',
  auth,
  teacherController.addCandidateToClassElection
);

router.patch(
  '/class-election/:electionId/start',
  auth,
  teacherController.startClassElection
);

router.patch(
  '/class-election/:electionId/end',
  auth,
  teacherController.endClassElection
);

router.get(
  '/class-election',
  auth,
  teacherController.listClassElections
);

router.delete(
  '/class-election/:electionId',
  auth,
  teacherController.deleteClassElection
);

module.exports = router;

