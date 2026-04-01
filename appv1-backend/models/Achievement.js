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
  teacherId:   { type: String, required: true },
  teacherName: { type: String, required: true },

  // ── Class Info ──
  classId:   { type: String, required: true },
  className: { type: String, required: true },

  // ── Org Info ──
  orgId:   { type: String, required: true },
  orgName: { type: String, default: '' },    // ✅ optional now

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

  // ── Counts (denormalized for fast reads) ──
  likeCount:    { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model('Achievement', achievementSchema);