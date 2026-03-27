const express = require('express');
const router = express.Router();
const {
  createTimetable,
  getTimetableByClass,
  getTodayTimetable,
  getTimetableByDay,
  getTeacherSchedule,
  updateSlot,
  addSlot,
  removeSlot,
  deleteTimetable
} = require('../controllers/timetableController');

router.post('/create', createTimetable);
router.get('/class/:classId', getTimetableByClass);
router.get('/class/:classId/today', getTodayTimetable);
router.get('/class/:classId/day/:day', getTimetableByDay);
router.get('/teacher/:teacherId', getTeacherSchedule);
router.put('/:timetableId/slot', updateSlot);
router.post('/:timetableId/slot', addSlot);
router.delete('/:timetableId/slot', removeSlot);
router.delete('/:timetableId', deleteTimetable);

module.exports = router;