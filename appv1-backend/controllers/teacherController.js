const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Organization = require('../models/Organization');

// GENERATE UNIQUE TEACHER ID
const generateTeacherId = () => `TCH_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// REGISTER TEACHER
exports.registerTeacher = async (req, res) => {
  try {
    const { name, email, password, orgId } = req.body;

    if (!name || !email || !password || !orgId) {
      return res.status(400).json({ error: 'name, email, password, orgId required' });
    }

    // Verify organization exists
    const organization = await Organization.findOne({ orgId });
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check duplicate email
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate unique teacherId
    let teacherId = generateTeacherId();
    while (await Teacher.findOne({ teacherId })) {
      teacherId = generateTeacherId();
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create teacher
    const teacher = await Teacher.create({
      teacherId,
      orgId,
      name,
      email,
      password: hashedPassword
    });

    // JWT token
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
        createdAt: teacher.createdAt
      }
    });
  } catch (error) {
    console.error('Teacher register error:', error);
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
        email: teacher.email
      }
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE TEACHER PROFILE
exports.updateTeacherProfile = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { dob, address, phoneNumber } = req.body;

    const filteredData = {};
    if (dob !== undefined) filteredData.dob = dob;
    if (address !== undefined) filteredData.address = address;
    if (phoneNumber !== undefined) filteredData.phoneNumber = phoneNumber;

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const teacher = await Teacher.findOneAndUpdate(
      { teacherId },
      { $set: filteredData },
      { new: true }
    ).select('-password');

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
        phoneNumber: teacher.phoneNumber
      }
    });
  } catch (error) {
    console.error('Update teacher error:', error);
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
        phoneNumber: teacher.phoneNumber,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt
      }
    });
  } catch (error) {
    console.error('Get teacher error:', error);
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
        phoneNumber: t.phoneNumber
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
