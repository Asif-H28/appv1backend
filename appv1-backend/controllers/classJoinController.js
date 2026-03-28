const ClassJoinRequest = require('../models/ClassJoinRequest');
const Student = require('../models/Student');
const Classroom = require('../models/Classroom');
const { notifyStudent } = require('../utils/sendNotification');  // ← ADDED

// GET ALL PENDING REQUESTS FOR TEACHER
exports.getPendingRequests = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const requests = await ClassJoinRequest.find({
      teacherId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL REQUESTS BY CLASSID
exports.getRequestsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const requests = await ClassJoinRequest.find({ classId }).sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// APPROVE REQUEST
exports.approveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await ClassJoinRequest.findOne({ requestId });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request already ${request.status}` });
    }

    request.status = 'approved';
    request.reviewedAt = new Date();
    await request.save();

    await Student.findOneAndUpdate(
      { studentId: request.studentId },
      {
        joinStatus: 'approved',
        classId: request.classId,
        orgId: request.orgId,
        tempOrgId: null
      }
    );

    const classroom = await Classroom.findOne({ classId: request.classId });
    if (classroom && !classroom.studentIds.includes(request.studentId)) {
      classroom.studentIds.push(request.studentId);
      await classroom.save();
    }

    // ✅ MOVED INSIDE FUNCTION
    try {
      await notifyStudent({
        studentId: request.studentId,
        orgId: request.orgId,
        classId: request.classId,
        title: `🎉 Join Request Approved!`,
        body: `You have been added to ${request.className}`,
        type: 'join_request',
        sentBy: 'system',
        sentByName: 'System',
        data: { route: '/home' }
      });
    } catch (notifyError) {
      console.log('Notification failed (non-critical):', notifyError.message);
    }

    res.json({
      success: true,
      message: `${request.studentName} approved and added to ${request.className}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// REJECT REQUEST
exports.rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;

    const request = await ClassJoinRequest.findOne({ requestId });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request already ${request.status}` });
    }

    request.status = 'rejected';
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason || 'No reason provided';
    await request.save();

    await Student.findOneAndUpdate(
      { studentId: request.studentId },
      { joinStatus: 'rejected', classId: null, orgId: null }
    );

    // ✅ MOVED INSIDE FUNCTION
    try {
      await notifyStudent({
        studentId: request.studentId,
        orgId: request.orgId,
        classId: request.classId,
        title: `❌ Join Request Rejected`,
        body: `Your request to join ${request.className} was rejected`,
        type: 'join_request',
        sentBy: 'system',
        sentByName: 'System',
        data: { route: '/home' }
      });
    } catch (notifyError) {
      console.log('Notification failed (non-critical):', notifyError.message);
    }

    res.json({
      success: true,
      message: `${request.studentName}'s request rejected`,
      reason: request.rejectionReason
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET REQUEST STATUS
exports.getRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await ClassJoinRequest.findOne({ requestId });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    res.json({
      success: true,
      status: request.status,
      className: request.className,
      reviewedAt: request.reviewedAt,
      rejectionReason: request.rejectionReason
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// REMOVE STUDENT FROM CLASSROOM
exports.removeStudent = async (req, res) => {
  try {
    const { classId, studentId } = req.params;

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    if (!classroom.studentIds.includes(studentId)) {
      return res.status(400).json({ error: 'Student not found in this classroom' });
    }

    classroom.studentIds = classroom.studentIds.filter(id => id !== studentId);
    await classroom.save();

    await ClassJoinRequest.findOneAndUpdate(
      { studentId, classId, status: 'approved' },
      { status: 'rejected', rejectionReason: 'Removed by teacher', reviewedAt: new Date() }
    );

    await Student.findOneAndUpdate(
      { studentId },
      { joinStatus: 'none', classId: null, orgId: null }
    );

    res.json({
      success: true,
      message: `Student ${studentId} removed from classroom ${classId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};