const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Classroom = require('../models/Classroom');
const ClassJoinRequest = require('../models/ClassJoinRequest');
const Org = require('../models/Org');
const { sendOtpEmail } = require('../config/mailer');

const generateStudentId = () => `STU_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const generateRequestId = () => `REQ_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─────────────────────────────────────────────
// STEP 1: REGISTER STUDENT
// ─────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'name, email, phone, password required' });
    }

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    let studentId = generateStudentId();
    while (await Student.findOne({ studentId })) {
      studentId = generateStudentId();
    }

    const student = await Student.create({
      studentId,
      name,
      email,
      phone,
      password: hashedPassword,
      otp,
      otpExpiresAt
    });

    // Send OTP via email
    await sendOtpEmail(email, name, otp);

    res.status(201).json({
      success: true,
      message: 'Student registered. OTP sent to email.',
      studentId: student.studentId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// STEP 2: VERIFY OTP
// ─────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { studentId, otp } = req.body;

    if (!studentId || !otp) {
      return res.status(400).json({ error: 'studentId and otp required' });
    }

    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (student.verified) return res.status(400).json({ error: 'Already verified' });
    if (student.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > student.otpExpiresAt) return res.status(400).json({ error: 'OTP expired' });

    student.verified = true;
    student.otp = null;
    student.otpExpiresAt = null;
    await student.save();

    res.json({ success: true, message: 'Student verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// STEP 3: LOGIN
// ─────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!student.verified) return res.status(403).json({ error: 'Please verify your account first' });

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { studentId: student.studentId, email: student.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      student: {
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        orgId: student.orgId,
        classId: student.classId,
        joinStatus: student.joinStatus
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// STEP 4: GET LIST OF ORGS (student picks org)
// ─────────────────────────────────────────────
exports.listOrgs = async (req, res) => {
  try {
    const orgs = await Org.find({}, 'orgId orgName').sort({ orgName: 1 });
    res.json({ success: true, count: orgs.length, orgs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// STEP 5: GET CLASSES BY ORG (student picks class)
// ─────────────────────────────────────────────
exports.listClassesByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;

    const org = await Org.findOne({ orgId });
    if (!org) return res.status(404).json({ error: 'Org not found' });

    const classes = await Classroom.find(
      { orgId },
      'classId className teacherId'
    ).sort({ className: 1 });

    res.json({
      success: true,
      orgName: org.orgName,
      count: classes.length,
      classes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// STEP 6: SEND JOIN REQUEST TO CLASS
// ─────────────────────────────────────────────
exports.sendJoinRequest = async (req, res) => {
  try {
    const { studentId, classId } = req.body;

    if (!studentId || !classId) {
      return res.status(400).json({ error: 'studentId and classId required' });
    }

    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!student.verified) return res.status(403).json({ error: 'Please verify your account first' });

    if (student.joinStatus === 'pending') {
      return res.status(400).json({ error: 'You already have a pending join request' });
    }
    if (student.joinStatus === 'approved') {
      return res.status(400).json({ error: 'You are already part of a class' });
    }

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    // Check duplicate request
    const existingRequest = await ClassJoinRequest.findOne({
      studentId,
      classId,
      status: 'pending'
    });
    if (existingRequest) {
      return res.status(400).json({ error: 'Join request already sent for this class' });
    }

    let requestId = generateRequestId();
    while (await ClassJoinRequest.findOne({ requestId })) {
      requestId = generateRequestId();
    }

    const joinRequest = await ClassJoinRequest.create({
      requestId,
      studentId,
      studentName: student.name,
      studentEmail: student.email,
      classId,
      className: classroom.className,
      orgId: classroom.orgId,
      teacherId: classroom.teacherId,
      status: 'pending'
    });

    // Update student status
    student.joinStatus = 'pending';
    student.classId = classId;
    student.orgId = classroom.orgId;
    await student.save();

    res.status(201).json({
      success: true,
      message: 'Join request sent. Waiting for teacher approval.',
      requestId: joinRequest.requestId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// STEP 7: GET STUDENT PROFILE
// ─────────────────────────────────────────────
exports.getStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ studentId }, '-password -otp -otpExpiresAt');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// RESEND OTP
// ─────────────────────────────────────────────
exports.resendOtp = async (req, res) => {
  try {
    const { studentId } = req.body;

    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (student.verified) return res.status(400).json({ error: 'Already verified' });

    const otp = generateOTP();
    student.otp = otp;
    student.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await student.save();

    // Send OTP via email
    await sendOtpEmail(student.email, student.name, otp);

    res.json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
