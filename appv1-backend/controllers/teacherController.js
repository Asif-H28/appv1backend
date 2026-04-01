const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Organization = require('../models/Organization');
const JoinRequest = require('../models/JoinRequest');

const generateTeacherId = () => `TCH_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const generateRequestId = () => `REQ_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// REGISTER TEACHER
exports.registerTeacher = async (req, res) => {
  try {
    const { name, email, password, orgId } = req.body;

    if (!name || !email || !password || !orgId) {
      return res.status(400).json({ error: 'name, email, password, orgId required' });
    }

    const organization = await Organization.findOne({ orgId });
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    let teacherId = generateTeacherId();
    while (await Teacher.findOne({ teacherId })) {
      teacherId = generateTeacherId();
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const teacher = await Teacher.create({
      teacherId,
      orgId,
      name,
      email,
      password: hashedPassword,
      verified: false     // Always false on register
    });

    const token = jwt.sign(
      { teacherId, orgId, email, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      teacher: {
        teacherId,
        orgId,
        name,
        email,
        verified: false,
        createdAt: teacher.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// TEACHER LOGIN
exports.loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const teacher = await Teacher.findOne({ email });
    if (!teacher || !(await bcrypt.compare(password, teacher.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { teacherId: teacher.teacherId, orgId: teacher.orgId, email, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      teacher: {
        teacherId: teacher.teacherId,
        orgId: teacher.orgId,
        name: teacher.name,
        email: teacher.email,
        verified: teacher.verified   // Show verified status on login
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE TEACHER PROFILE
exports.updateTeacherProfile = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { name, dob, address, phoneNumber, gender } = req.body;  // ← ADD name, gender

    const filteredData = {};
    if (name !== undefined)        filteredData.name = name;         // ← ADD
    if (gender !== undefined)      filteredData.gender = gender;     // ← ADD
    if (dob !== undefined)         filteredData.dob = dob;
    if (address !== undefined)     filteredData.address = address;
    if (phoneNumber !== undefined) filteredData.phoneNumber = phoneNumber;

    const teacher = await Teacher.findOneAndUpdate(
      { teacherId },
      { $set: filteredData },
      { new: true }
    ).select('-password');

    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    res.json({
      success: true,
      teacher: {
        teacherId: teacher.teacherId,
        orgId: teacher.orgId,
        name: teacher.name,
        email: teacher.email,
        gender: teacher.gender,           // ← ADD
        dob: teacher.dob,
        address: teacher.address,
        phoneNumber: teacher.phoneNumber,
        verified: teacher.verified
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET TEACHER PROFILE
exports.getTeacherProfile = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findOne({ teacherId }).select('-password');

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({
      success: true,
      teacher: {
        teacherId: teacher.teacherId,
        orgId: teacher.orgId,
        name: teacher.name,
        email: teacher.email,
        dob: teacher.dob,
        address: teacher.address,
          gender: teacher.gender,   
        phoneNumber: teacher.phoneNumber,
        verified: teacher.verified,
        createdAt: teacher.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL TEACHERS IN ORG
exports.getOrgTeachers = async (req, res) => {
  try {
    const { orgId } = req.params;
    const teachers = await Teacher.find({ orgId }).select('-password');

    res.json({
      success: true,
      count: teachers.length,
      teachers: teachers.map(t => ({
        teacherId: t.teacherId,
        name: t.name,
        email: t.email,
        dob: t.dob,
        address: t.address,
        phoneNumber: t.phoneNumber,
        verified: t.verified
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// TEACHER SENDS JOIN REQUEST
exports.sendJoinRequest = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findOne({ teacherId });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    if (teacher.verified) {
      return res.status(400).json({ error: 'Teacher already verified' });
    }

    // Check if pending request exists
    const existingRequest = await JoinRequest.findOne({ 
      teacherId, 
      status: 'pending' 
    });
    if (existingRequest) {
      return res.status(400).json({ error: 'Join request already pending' });
    }

    // Generate unique requestId
    let requestId = generateRequestId();
    while (await JoinRequest.findOne({ requestId })) {
      requestId = generateRequestId();
    }

    const request = await JoinRequest.create({
      requestId,
      teacherId,
      orgId: teacher.orgId,
      teacherName: teacher.name,
      teacherEmail: teacher.email,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Join request sent successfully',
      request: {
        requestId: request.requestId,
        teacherId,
        orgId: teacher.orgId,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ADMIN GETS ALL PENDING JOIN REQUESTS FOR ORG
exports.getJoinRequests = async (req, res) => {
  try {
    const { orgId } = req.params;

    const requests = await JoinRequest.find({ 
      orgId, 
      status: 'pending' 
    });

    res.json({
      success: true,
      count: requests.length,
      requests: requests.map(r => ({
        requestId: r.requestId,
        teacherId: r.teacherId,
        teacherName: r.teacherName,
        teacherEmail: r.teacherEmail,
        status: r.status,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ADMIN APPROVES JOIN REQUEST → verified: true
exports.approveJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await JoinRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request already ${request.status}` });
    }

    // Update teacher verified → true
    await Teacher.findOneAndUpdate(
      { teacherId: request.teacherId },
      { $set: { verified: true } }
    );

    // Update request status → approved
    await JoinRequest.findOneAndUpdate(
      { requestId },
      { $set: { status: 'approved' } }
    );

    res.json({
      success: true,
      message: `Teacher ${request.teacherName} approved successfully`,
      teacherId: request.teacherId,
      status: 'approved'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ADMIN REJECTS JOIN REQUEST → DELETE teacher
exports.rejectJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await JoinRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request already ${request.status}` });
    }

    // Delete teacher from database
    await Teacher.findOneAndDelete({ teacherId: request.teacherId });

    // Update request status → rejected
    await JoinRequest.findOneAndUpdate(
      { requestId },
      { $set: { status: 'rejected' } }
    );

    res.json({
      success: true,
      message: `Teacher ${request.teacherName} rejected and removed`,
      teacherId: request.teacherId,
      status: 'rejected'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
