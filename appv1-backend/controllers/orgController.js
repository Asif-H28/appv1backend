const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Organization = require('../models/Organization');
const Teacher = require('../models/Teacher');
const Classroom = require('../models/Classroom');
const Student = require('../models/Student');
const ClassJoinRequest = require('../models/ClassJoinRequest');
const LicenseRequest = require('../models/LicenseRequest');
const ActiveSession = require('../models/ActiveSession');
const Achievement = require('../models/Achievement');

// CREATE ORGANIZATION
exports.createOrganization = async (req, res) => {
  try {
    const { orgName, adminEmail, adminPassword, licenseKey } = req.body;

    if (!orgName || !adminEmail || !adminPassword || !licenseKey) {
      return res.status(400).json({ error: 'All fields (orgName, adminEmail, adminPassword, licenseKey) are required' });
    }

    // 1. Validate License Key
    const license = await LicenseRequest.findOne({ licenseKey });
    if (!license) {
      return res.status(401).json({ 
        error: 'Please get a Licence key to create organization error and unathorised to perform this action' 
      });
    }

    // 2. Prevent multiple organizations using one license key
    if (license.associatedOrgId) {
      return res.status(400).json({ 
        error: 'This license key has already been used to create an organization. Each key is valid for one-time use only.' 
      });
    }

    const generateId = () => `ORG_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    let orgId = generateId();
    while (await Organization.findOne({ orgId })) {
      orgId = generateId();
    }

    const existing = await Organization.findOne({ 
      $or: [{ name: orgName }, { adminEmail }] 
    });
    if (existing) {
      return res.status(400).json({ 
        error: existing.name === orgName ? 'Org name exists' : 'Email registered' 
      });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const organization = await Organization.create({
      orgId,
      name: orgName,
      adminEmail,
      adminPassword: hashedPassword,
      licenseKey,
      isActive: true // Set to true upon successful registration
    });

    // 2. Update License Request with associated info
    await LicenseRequest.findByIdAndUpdate(license._id, {
      associatedOrgId: orgId,
      adminEmail: adminEmail
    });

    const sessionToken = crypto.randomBytes(16).toString('hex');
    await ActiveSession.findOneAndUpdate(
      { userId: orgId },
      { sessionToken },
      { upsert: true }
    );

    const token = jwt.sign(
      { orgId, adminEmail, role: 'admin', sessionToken }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      organization: {
        orgId,
        id: organization._id,
        name: orgName,
        adminEmail,
        createdAt: organization.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ADMIN LOGIN
exports.adminLogin = async (req, res) => {
  try {
    const { adminEmail, adminPassword } = req.body;
    const organization = await Organization.findOne({ adminEmail });
    
    if (!organization || !(await bcrypt.compare(adminPassword, organization.adminPassword))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sessionToken = crypto.randomBytes(16).toString('hex');
    await ActiveSession.findOneAndUpdate(
      { userId: organization.orgId },
      { sessionToken },
      { upsert: true }
    );

    const token = jwt.sign(
      { orgId: organization.orgId, adminEmail, role: 'admin', sessionToken }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      organization: {
        orgId: organization.orgId,
        name: organization.name,
        adminEmail: organization.adminEmail
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE ORGANIZATION PROFILE
exports.updateOrganizationProfile = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { phone, address, city, state, country, teachers, nonTeaching } = req.body;

    const filteredData = {};
    if (phone !== undefined) filteredData.phone = phone;
    if (address !== undefined) filteredData.address = address;
    if (city !== undefined) filteredData.city = city;
    if (state !== undefined) filteredData.state = state;
    if (country !== undefined) filteredData.country = country;
    if (teachers !== undefined) filteredData.teachers = teachers;
    if (nonTeaching !== undefined) filteredData.nonTeaching = nonTeaching;

    const organization = await Organization.findOneAndUpdate(
      { orgId },
      { $set: filteredData },
      { new: true }
    );

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      organization: {
        orgId: organization.orgId,
        name: organization.name,
        phone: organization.phone,
        address: organization.address,
        city: organization.city,
        state: organization.state,
        country: organization.country,
        teachers: organization.teachers,
        nonTeaching: organization.nonTeaching
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ORGANIZATION PROFILE
exports.getOrganizationProfile = async (req, res) => {
  try {
    const { orgId } = req.params;

    const organization = await Organization.findOne({ orgId }).select('-adminPassword');

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      organization: {
        orgId: organization.orgId,
        name: organization.name,
        adminEmail: organization.adminEmail,
        phone: organization.phone,
        address: organization.address,
        city: organization.city,
        state: organization.state,
        country: organization.country,
        teachers: organization.teachers,
        nonTeaching: organization.nonTeaching,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SEARCH ORGANIZATIONS
exports.searchOrganization = async (req, res) => {
  try {
    const { query } = req.query; // ?query=searchterm

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchRegex = new RegExp(query.trim(), 'i'); // Case insensitive

    const organizations = await Organization.find({
      $or: [
        { name: searchRegex },
        { city: searchRegex },
        { state: searchRegex },
        { phone: searchRegex }
      ]
    }).select('-adminPassword'); // Never return password

    if (organizations.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No organizations found',
        results: []
      });
    }

    res.json({
      success: true,
      count: organizations.length,
      results: organizations.map(org => ({
        orgId: org.orgId,
        name: org.name,
        adminEmail: org.adminEmail,
        phone: org.phone,
        address: org.address,
        city: org.city,
        state: org.state,
        country: org.country,
        teachers: org.teachers,
        nonTeaching: org.nonTeaching
      }))
    });
  } catch (error) {
    console.error('Search org error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET ALL ORGANIZATIONS
exports.getAllOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find({}).select('-adminPassword');
    res.json({
      success: true,
      count: organizations.length,
      organizations: organizations.map(org => ({
        orgId: org.orgId,
        name: org.name,
        adminEmail: org.adminEmail,
        phone: org.phone,
        address: org.address,
        city: org.city,
        state: org.state,
        country: org.country,
        teachers: org.teachers,
        nonTeaching: org.nonTeaching,
        createdAt: org.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeacherCountByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!orgId) {
      return res.status(400).json({ error: 'orgId required' });
    }

    const totalTeachers = await Teacher.countDocuments({ orgId });

    res.json({
      success: true,
      orgId,
      totalTeachers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAdminFcmToken = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ error: "fcmToken required" });
    }

    const org = await Organization.findOneAndUpdate(
      { orgId },
      { $set: { fcmToken } },
      { new: true }
    );

    if (!org) return res.status(404).json({ error: "Organization not found" });

    res.json({ success: true, message: "Admin FCM token updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// GET SCHOOL BASIC DETAILS
exports.getSchoolDetails = async (req, res) => {
  try {
    const { orgId } = req.params;

    const organization = await Organization.findOne({ orgId })
      .select('-adminPassword');

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    res.json({
      success: true,
      data: {
        orgId:          organization.orgId,
        schoolName:     organization.schoolName     || '',
        campusAddress:  organization.campusAddress  || '',
        schoolEmail:    organization.schoolEmail    || '',
        primaryContact: organization.primaryContact || '',
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SUPER ADMIN: GET ORGANIZATION BY ORG ID
exports.getOrganizationByOrgId = async (req, res) => {
  try {
    const { orgId } = req.params;
    const organization = await Organization.findOne({ orgId }).select('-adminPassword');

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SUPER ADMIN: UPDATE ORGANIZATION STATUS (isActive)
exports.updateOrganizationStatus = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ success: false, message: 'isActive field is required' });
    }

    const organization = await Organization.findOneAndUpdate(
      { orgId },
      { $set: { isActive } },
      { new: true }
    ).select('-adminPassword');

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    res.json({
      success: true,
      message: `Organization ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: organization
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SUPER ADMIN: GET ORG STATS
exports.getOrgStatsForSuperAdmin = async (req, res) => {
  try {
    const { orgId } = req.params;

    // Verify if org exists
    const organization = await Organization.findOne({ orgId });
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const [totalTeachers, totalStudents, totalClassrooms, totalAchievements] = await Promise.all([
      Teacher.countDocuments({ orgId }),
      Student.countDocuments({ orgId }),
      Classroom.countDocuments({ orgId }),
      Achievement.countDocuments({ orgId })
    ]);

    res.json({
      success: true,
      data: {
        orgId,
        totalTeachers,
        totalStudents,
        totalClassrooms,
        totalAchievements
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ROLLUP ACADEMIC YEAR
exports.rollupAcademicYear = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { newAcademicYear, newAcademicYearStartDate, classMappings } = req.body;
    // classMappings example:
    // [
    //   {
    //     oldClassId: "CLS_XXXXXX",
    //     promotedToNewClassName: "Class 11A",
    //     teacherId: "T_XXXXXX",
    //     studentsToPromote: ["STU_XXXXX", "STU_YYYYY"],
    //     studentsToRetain: ["STU_ZZZZZ"]
    //   }
    // ]

    if (!newAcademicYear || !classMappings || !Array.isArray(classMappings)) {
      return res.status(400).json({ error: 'newAcademicYear and classMappings are required' });
    }

    // Update Organization Academic Year
    await Organization.findOneAndUpdate(
      { orgId },
      { 
        $set: { 
          currentAcademicYear: newAcademicYear,
          academicYearStartDate: newAcademicYearStartDate ? new Date(newAcademicYearStartDate) : new Date()
        } 
      }
    );

    const generateClassId = () => `CLS_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Process each class mapping
    for (const mapping of classMappings) {
      const { oldClassId, promotedToNewClassName, teacherId, studentsToPromote, studentsToRetain } = mapping;

      // 1. Archive the old class
      const oldClass = await Classroom.findOne({ classId: oldClassId, orgId, isActive: true });
      if (oldClass && oldClass.isActive) {
        oldClass.isActive = false;
        oldClass.className = `${oldClass.className} (Archived)`; // Optional rename
        await oldClass.save();
      }

      // 2. Create the new class
      let newClassId = generateClassId();
      while (await Classroom.findOne({ classId: newClassId, isActive: true })) {
        newClassId = generateClassId();
      }

      const newClass = await Classroom.create({
        classId: newClassId,
        teacherId: teacherId || (oldClass ? oldClass.teacherId : null),
        orgId,
        className: promotedToNewClassName,
        studentIds: [], // Will be filled below
        subjects: [], // New classes start with empty subjects
        isActive: true,
        academicYear: newAcademicYear
      });

      const allStudentsForNewClass = [];

      // 3. Update promoted students
      if (studentsToPromote && studentsToPromote.length > 0) {
        await Student.updateMany(
          { studentId: { $in: studentsToPromote } },
          { $set: { classId: newClassId } }
        );
        allStudentsForNewClass.push(...studentsToPromote);
      }

      // 4. Update retained students
      if (studentsToRetain && studentsToRetain.length > 0) {
        await Student.updateMany(
          { studentId: { $in: studentsToRetain } },
          { $set: { classId: newClassId } }
        );
        allStudentsForNewClass.push(...studentsToRetain);
      }

      // Update the new classroom's student list
      newClass.studentIds = allStudentsForNewClass;
      await newClass.save();

      // 5. Update ALL join requests (pending, approved, rejected) for the old class to point to the new class
      await ClassJoinRequest.updateMany(
        { classId: oldClassId },
        { 
          $set: { 
            classId: newClassId,
            className: promotedToNewClassName,
            teacherId: newClass.teacherId
          } 
        }
      );
    }

    res.json({
      success: true,
      message: `Successfully rolled up to academic year ${newAcademicYear}`
    });

  } catch (error) {
    console.error('Rollup error:', error);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE SCHOOL BASIC DETAILS
exports.updateSchoolDetails = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { schoolName, campusAddress, schoolEmail, primaryContact } = req.body;

    const filteredData = {};
    if (schoolName     !== undefined) {
      filteredData.schoolName = schoolName;
      filteredData.name       = schoolName; // ← keep org name in sync
    }
    if (campusAddress  !== undefined) filteredData.campusAddress  = campusAddress;
    if (schoolEmail    !== undefined) filteredData.schoolEmail    = schoolEmail;
    if (primaryContact !== undefined) filteredData.primaryContact = primaryContact;

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update.',
      });
    }

    const organization = await Organization.findOneAndUpdate(
      { orgId },
      { $set: filteredData },
      { new: true }
    );

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    res.json({
      success: true,
      message: 'School details updated.',
      data: {
        orgId:          organization.orgId,
        name:           organization.name,           // ← also return updated name
        schoolName:     organization.schoolName     || '',
        campusAddress:  organization.campusAddress  || '',
        schoolEmail:    organization.schoolEmail    || '',
        primaryContact: organization.primaryContact || '',
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};