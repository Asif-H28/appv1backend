const express = require('express');
const router = express.Router();
const {
  createAchievement,
  getAchievementsByOrg,
  getAchievementsByClass,
  getAchievement,
  toggleLike,
  addComment,
  deleteComment,
  updateAchievement,
} = require('../controllers/achievementController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

router.use(auth);
router.use(checkOrgStatus);

router.post('/create',                                createAchievement);
router.get('/org/:orgId',                             getAchievementsByOrg);
router.get('/class/:classId',                         getAchievementsByClass);
router.get('/:achievementId',                         getAchievement);
router.post('/:achievementId/like',                   toggleLike);
router.post('/:achievementId/comment',                addComment);
router.delete('/:achievementId/comment/:commentId',   deleteComment);
router.put('/:achievementId',                         updateAchievement);
router.delete('/:achievementId',                      deleteAchievement);

module.exports = router;