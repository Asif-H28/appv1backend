const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Classroom = require('../models/Classroom');
const ClassJoinRequest = require('../models/ClassJoinRequest');
const Org = require('../models/Organization');

const generateStudentId = () => `STU_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const generateRequestId = () => `REQ_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// ─────────────────────────────────────────────
// LIST ALL ORGS (called before register so 
// student can pick org during signup)
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
// REGISTER STUDENT
// (orgId selected during signup → saved as tempOrgId)
// ─────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, orgId } = req.body;

    if (!name || !email || !phone || !password || !orgId) {
      return res.status(400).json({ error: 'name, email, phone, password, orgId required' });
    }

    // Validate org exists
    const org = await Org.findOne({ orgId });
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

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
      tempOrgId: orgId,    // ← stored as temp until approved
      orgId: null,         // ← stays null until approved
      classId: null,
      joinStatus: 'none'
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully.',
      student: {
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        tempOrgId: student.tempOrgId,
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
// LOGIN
// ─────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { studentId: student.studentId, email: student.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Fetch full tempOrg document
    let tempOrg = null;
    if (student.tempOrgId) {
      const orgDoc = await Org.findOne({ orgId: student.tempOrgId });
      if (orgDoc) {
        tempOrg = {
          orgId: orgDoc.orgId,
          orgName: orgDoc.name          // ← change this to match your model field
        };
      }
    }

    res.json({
      success: true,
      token,
      student: {
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        tempOrgId: student.tempOrgId,
        tempOrg,
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
// LIST CLASSES BY TEMP ORG
// (student clicks on their org → sees classes)
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
// SEND JOIN REQUEST
// ─────────────────────────────────────────────
exports.sendJoinRequest = async (req, res) => {
  try {
    const { studentId, classId } = req.body;

    if (!studentId || !classId) {
      return res.status(400).json({ error: 'studentId and classId required' });
    }

    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (student.joinStatus === 'pending') {
      return res.status(400).json({ error: 'You already have a pending join request' });
    }
    if (student.joinStatus === 'approved') {
      return res.status(400).json({ error: 'You are already part of a class' });
    }

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    // Ensure class belongs to student's tempOrg
    if (classroom.orgId !== student.tempOrgId) {
      return res.status(403).json({ error: 'This class does not belong to your selected organization' });
    }

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

    // Only update joinStatus + classId, NOT orgId yet
    student.joinStatus = 'pending';
    student.classId = classId;
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
// GET STUDENT PROFILE
// ─────────────────────────────────────────────
exports.getStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ studentId }, '-password');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
