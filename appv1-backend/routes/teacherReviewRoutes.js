const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const teacherReviewController = require('../controllers/teacherReviewController');

// All routes are protected by auth
router.post('/', auth, teacherReviewController.createReview);
router.get('/teacher/:teacherId', auth, teacherReviewController.getTeacherReviews);
router.get('/student/:studentId', auth, teacherReviewController.getStudentReviews);
router.put('/:id', auth, teacherReviewController.updateReview);
router.delete('/:id', auth, teacherReviewController.deleteReview);

module.exports = router;
