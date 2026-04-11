const Achievement = require('../models/Achievement');
const { notifyClass } = require('../utils/sendNotification');

const generateAchievementId = () =>
  `ACH_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

const generateCommentId = () =>
  `CMT_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// ─────────────────────────────────────────────
// CREATE ACHIEVEMENT POST
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// CREATE ACHIEVEMENT POST
// ─────────────────────────────────────────────
exports.createAchievement = async (req, res) => {
  try {
    const {
      teacherId, teacherName,
      classId, className,
      orgId, orgName,
      caption, images,
      taggedStudents,
      isAdmin           // ✅ NEW optional field
    } = req.body;

    // ✅ If isAdmin — only orgId required. Otherwise all fields required.
    if (isAdmin) {
      if (!orgId) {
        return res.status(400).json({ error: 'orgId required' });
      }
    } else {
      if (!teacherId || !teacherName || !classId || !className || !orgId) {
        return res.status(400).json({
          error: 'teacherId, teacherName, classId, className, orgId required'
        });
      }
    }

    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'At least one image required' });
    }

    let achievementId = generateAchievementId();
    while (await Achievement.findOne({ achievementId })) {
      achievementId = generateAchievementId();
    }

    const achievement = await Achievement.create({
      achievementId,
      caption:        caption || '',
      images,
      teacherId:      teacherId || null,
      teacherName:    teacherName || '',
      classId:        classId || '',
      className:      className || '',
      orgId,
      orgName:        orgName || '',
      taggedStudents: taggedStudents || [],
      likes:          [],
      comments:       [],
      likeCount:      0,
      commentCount:   0
    });

    // ✅ Only notify if classId is present (teacher post), skip if admin-only post
    if (classId) {
      try {
        await notifyClass({
          classId,
          orgId,
          title:      `🏆 New Achievement Posted`,
          body:       `${teacherName} shared a new achievement${caption ? `: ${caption.substring(0, 50)}` : ''}`,
          type:       'general',
          sentBy:     teacherId || orgId,
          sentByName: teacherName || 'Admin',
          data:       { route: '/achievements', achievementId: achievement.achievementId }
        });
      } catch (e) {
        console.log('Notify failed (non-critical):', e.message);
      }
    }

    res.status(201).json({ success: true, achievement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// ─────────────────────────────────────────────
// GET ALL ACHIEVEMENTS BY ORG (for all 3 roles)
// ─────────────────────────────────────────────
exports.getAchievementsByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;
    const achievements = await Achievement
      .find({ orgId })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: achievements.length, achievements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL ACHIEVEMENTS BY CLASS
// ─────────────────────────────────────────────
exports.getAchievementsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const achievements = await Achievement
      .find({ classId })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: achievements.length, achievements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET SINGLE ACHIEVEMENT
// ─────────────────────────────────────────────
exports.getAchievement = async (req, res) => {
  try {
    const { achievementId } = req.params;
    const achievement = await Achievement.findOne({ achievementId });
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });

    res.json({ success: true, achievement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// LIKE / UNLIKE (toggle)
// ─────────────────────────────────────────────
exports.toggleLike = async (req, res) => {
  try {
    const { achievementId } = req.params;
    const { userId, userName, userRole } = req.body;

    if (!userId || !userName || !userRole) {
      return res.status(400).json({ error: 'userId, userName, userRole required' });
    }

    const achievement = await Achievement.findOne({ achievementId });
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });

    const alreadyLiked = achievement.likes.findIndex(l => l.userId === userId);

    if (alreadyLiked !== -1) {
      // ── UNLIKE ──
      achievement.likes.splice(alreadyLiked, 1);
      achievement.likeCount = Math.max(0, achievement.likeCount - 1);
    } else {
      // ── LIKE ──
      achievement.likes.push({ userId, userName, userRole, likedAt: new Date() });
      achievement.likeCount = achievement.likeCount + 1;
    }

    await achievement.save();

    res.json({
      success: true,
      liked: alreadyLiked === -1,   // true = liked, false = unliked
      likeCount: achievement.likeCount,
      likes: achievement.likes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// ADD COMMENT
// ─────────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { achievementId } = req.params;
    const { userId, userName, userRole, text } = req.body;

    if (!userId || !userName || !userRole || !text) {
      return res.status(400).json({ error: 'userId, userName, userRole, text required' });
    }

    const achievement = await Achievement.findOne({ achievementId });
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });

    let commentId = generateCommentId();
    // ensure unique within array
    while (achievement.comments.find(c => c.commentId === commentId)) {
      commentId = generateCommentId();
    }

    const comment = {
      commentId,
      userId,
      userName,
      userRole,
      text: text.trim(),
      commentedAt: new Date()
    };

    achievement.comments.push(comment);
    achievement.commentCount = achievement.commentCount + 1;
    await achievement.save();

    res.status(201).json({
      success: true,
      comment,
      commentCount: achievement.commentCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE COMMENT (by commenter or post owner)
// ─────────────────────────────────────────────
exports.deleteComment = async (req, res) => {
  try {
    const { achievementId, commentId } = req.params;

    const achievement = await Achievement.findOne({ achievementId });
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });

    const commentIndex = achievement.comments.findIndex(c => c.commentId === commentId);
    if (commentIndex === -1) return res.status(404).json({ error: 'Comment not found' });

    achievement.comments.splice(commentIndex, 1);
    achievement.commentCount = Math.max(0, achievement.commentCount - 1);
    await achievement.save();

    res.json({
      success: true,
      message: 'Comment deleted',
      commentCount: achievement.commentCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE ACHIEVEMENT (caption / taggedStudents)
// ─────────────────────────────────────────────
exports.updateAchievement = async (req, res) => {
  try {
    const { achievementId } = req.params;
    const { caption, taggedStudents } = req.body;

    const achievement = await Achievement.findOne({ achievementId });
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });

    if (caption !== undefined)         achievement.caption = caption;
    if (taggedStudents !== undefined)  achievement.taggedStudents = taggedStudents;

    await achievement.save();
    res.json({ success: true, achievement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE ACHIEVEMENT
// ─────────────────────────────────────────────
exports.deleteAchievement = async (req, res) => {
  try {
    const { achievementId } = req.params;
    const achievement = await Achievement.findOneAndDelete({ achievementId });
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });

    res.json({ success: true, message: 'Achievement deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};