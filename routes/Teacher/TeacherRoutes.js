const express = require('express');
const router = express.Router();
const { body } = require("express-validator")
const teacherController = require('../../Controller/Teacher/TeacherController');
const auth = require("../../middleware/auth");
const upload = require('../../middleware/upload');


router.post('/students', teacherController.registerStudent);
router.get('/students', teacherController.listStudents);
router.post('/attendance', teacherController.Addattendance);
router.post('/update-attendance', teacherController.updateAttendance);
router.get('/students/:id', teacherController.getStudent);
router.put('/students/:id', teacherController.updateStudent);
router.delete('/students/:id',teacherController.deleteStudent);
router.post( '/nominate', upload.single("photo"),teacherController.nominateCandidate);
router.get('/approved-candidates', teacherController.listApprovedCandidates);
router.put( "/candidates/adddetails/:studentId",upload.single("photo"),teacherController.AddCandidateDetails);


router.post(
  '/class-election/create',
  auth,
  teacherController.createClassElection
);

router.post(
  '/class-election/add-candidate',
  auth,
  teacherController.addCandidateToClassElection
);

router.patch(
  '/class-election/:id/start',
  auth,
  teacherController.startClassElection
);

router.patch(
  '/class-election/:id/end',
  auth,
  teacherController.endClassElection
);

router.get(
  '/class-election',
  auth,
  teacherController.listClassElections
);



module.exports = router;

