const TeacherLeave = require('../models/TeacherLeave');
const StudentLeave = require('../models/StudentLeave');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Classroom = require('../models/Classroom');
const { notifyStudent, notifyClass } = require('../utils/sendNotification');

const generateLeaveId = () => `LEV_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// ─────────────────────────────────────────────
// TEACHER — APPLY LEAVE
// ─────────────────────────────────────────────
exports.teacherApplyLeave = async (req, res) => {
  try {
    const { teacherId, orgId, reason, dates } = req.body;

    if (!teacherId || !orgId || !reason || !dates || dates.length === 0) {
      return res.status(400).json({ error: 'teacherId, orgId, reason, dates[] required' });
    }

    const teacher = await Teacher.findOne({ teacherId });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    let leaveId = generateLeaveId();
    while (await TeacherLeave.findOne({ leaveId })) {
      leaveId = generateLeaveId();
    }

    const leave = await TeacherLeave.create({
      leaveId,
      teacherId,
      teacherName: teacher.name,
      orgId,
      reason,
      dates,
      totalDays: dates.length,
      status: 'pending'
    });

    res.status(201).json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// TEACHER — GET MY LEAVES
// ─────────────────────────────────────────────
exports.getTeacherLeaves = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const leaves = await TeacherLeave.find({ teacherId }).sort({ createdAt: -1 });
    res.json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// ADMIN — GET ALL TEACHER LEAVES BY ORG
// ─────────────────────────────────────────────
exports.getTeacherLeavesByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;
    const leaves = await TeacherLeave.find({ orgId }).sort({ createdAt: -1 });
    res.json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// ADMIN — REVIEW TEACHER LEAVE (approve/reject)
// ─────────────────────────────────────────────
exports.reviewTeacherLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, reviewedBy, reviewNote } = req.body;

    if (!status || !reviewedBy) {
      return res.status(400).json({ error: 'status and reviewedBy required' });
    }
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be "approved" or "rejected"' });
    }

    const leave = await TeacherLeave.findOne({ leaveId });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ error: `Leave already ${leave.status}` });
    }

    leave.status = status;
    leave.reviewedBy = reviewedBy;
    leave.reviewNote = reviewNote || null;
    leave.reviewedAt = new Date();
    await leave.save();

    // Notify teacher
    try {
      const teacher = await Teacher.findOne({ teacherId: leave.teacherId });
      if (teacher?.fcmToken) {
        const { notifyStudent: notifyUser } = require('../utils/sendNotification');
        // Use direct FCM — reuse notifyStudent pattern for teacher
      }
    } catch (e) {
      console.log('Notify failed (non-critical):', e.message);
    }

    res.json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// TEACHER — DELETE OWN PENDING LEAVE
// ─────────────────────────────────────────────
exports.deleteTeacherLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const leave = await TeacherLeave.findOne({ leaveId });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending leaves can be deleted' });
    }
    await TeacherLeave.findOneAndDelete({ leaveId });
    res.json({ success: true, message: 'Leave request deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// STUDENT — APPLY LEAVE
// ─────────────────────────────────────────────
exports.studentApplyLeave = async (req, res) => {
  try {
    const { studentId, reason, dates } = req.body;

    if (!studentId || !reason || !dates || dates.length === 0) {
      return res.status(400).json({ error: 'studentId, reason, dates[] required' });
    }

    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (student.joinStatus !== 'approved') {
      return res.status(403).json({ error: 'Student not approved in any class' });
    }

    const classroom = await Classroom.findOne({ classId: student.classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    let leaveId = generateLeaveId();
    while (await StudentLeave.findOne({ leaveId })) {
      leaveId = generateLeaveId();
    }

    const leave = await StudentLeave.create({
      leaveId,
      studentId,
      studentName: student.name,
      classId: student.classId,
      orgId: student.orgId,
      reason,
      dates,
      totalDays: dates.length,
      status: 'pending'
    });

    res.status(201).json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// STUDENT — GET MY LEAVES
// ─────────────────────────────────────────────
exports.getStudentLeaves = async (req, res) => {
  try {
    const { studentId } = req.params;
    const leaves = await StudentLeave.find({ studentId }).sort({ createdAt: -1 });
    res.json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// TEACHER — GET ALL STUDENT LEAVES BY CLASS
// ─────────────────────────────────────────────
exports.getStudentLeavesByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const leaves = await StudentLeave.find({ classId }).sort({ createdAt: -1 });
    res.json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// TEACHER — GET PENDING STUDENT LEAVES BY CLASS
// ─────────────────────────────────────────────
exports.getPendingStudentLeavesByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const leaves = await StudentLeave.find({ classId, status: 'pending' }).sort({ createdAt: -1 });
    res.json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// TEACHER — REVIEW STUDENT LEAVE (approve/reject)
// ─────────────────────────────────────────────
exports.reviewStudentLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, reviewedBy, reviewNote } = req.body;

    if (!status || !reviewedBy) {
      return res.status(400).json({ error: 'status and reviewedBy required' });
    }
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be "approved" or "rejected"' });
    }

    const leave = await StudentLeave.findOne({ leaveId });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ error: `Leave already ${leave.status}` });
    }

    // Verify reviewer is the class teacher
    const classroom = await Classroom.findOne({ classId: leave.classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
    if (classroom.teacherId !== reviewedBy) {
      return res.status(403).json({ error: 'Only the class teacher can review this leave' });
    }

    leave.status = status;
    leave.reviewedBy = reviewedBy;
    leave.reviewNote = reviewNote || null;
    leave.reviewedAt = new Date();
    await leave.save();

    // ✅ Notify student
    try {
      await notifyStudent({
        studentId: leave.studentId,
        orgId: leave.orgId,
        classId: leave.classId,
        title: status === 'approved'
          ? `✅ Leave Approved`
          : `❌ Leave Rejected`,
        body: status === 'approved'
          ? `Your leave for ${leave.totalDays} day(s) has been approved`
          : `Your leave request was rejected. ${reviewNote || ''}`,
        type: 'general',
        sentBy: reviewedBy,
        sentByName: reviewedBy,
        data: { route: '/leaves', leaveId: leave.leaveId }
      });
    } catch (notifyError) {
      console.log('Notification failed (non-critical):', notifyError.message);
    }

    res.json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// STUDENT — DELETE OWN PENDING LEAVE
// ─────────────────────────────────────────────
exports.deleteStudentLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const leave = await StudentLeave.findOne({ leaveId });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending leaves can be deleted' });
    }
    await StudentLeave.findOneAndDelete({ leaveId });
    res.json({ success: true, message: 'Leave request deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};