const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  commentId:   { type: String, required: true },
  userId:      { type: String, required: true },
  userName:    { type: String, required: true },
  userRole:    { type: String, enum: ['teacher', 'student', 'admin'], required: true },
  text:        { type: String, required: true, trim: true },
  commentedAt: { type: Date, default: Date.now }
}, { _id: false });

const likeSchema = new mongoose.Schema({
  userId:   { type: String, required: true },
  userName: { type: String, required: true },
  userRole: { type: String, enum: ['teacher', 'student', 'admin'], required: true },
  likedAt:  { type: Date, default: Date.now }
}, { _id: false });

const achievementSchema = new mongoose.Schema({
  achievementId: { type: String, required: true, unique: true },

  // ── Post Content ──
  caption: { type: String, default: '' },
  images:  [{ type: String, required: true }],

  // ── Teacher (Author) ──
  teacherId:   { type: String, default: null },   // ✅ optional — null when posted by admin
  teacherName: { type: String, default: '' },     // ✅ optional

  // ── Class Info ──
  classId:   { type: String, default: '' },       // ✅ optional — empty when admin posts org-wide
  className: { type: String, default: '' },       // ✅ optional

  // ── Org Info ──
  orgId:   { type: String, required: true },      // ← always required
  orgName: { type: String, default: '' },

  // ── Tagged Students (optional) ──
  taggedStudents: [
    {
      studentId:   { type: String },
      studentName: { type: String }
    }
  ],

  // ── Engagement ──
  likes:    [likeSchema],
  comments: [commentSchema],

  // ── Counts ──
  likeCount:    { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model('Achievement', achievementSchema);