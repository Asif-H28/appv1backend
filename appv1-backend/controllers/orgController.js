const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');
const Teacher = require('../models/Teacher');

// CREATE ORGANIZATION
exports.createOrganization = async (req, res) => {
  try {
    const { orgName, adminEmail, adminPassword } = req.body;

    if (!orgName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'All fields required' });
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
      adminPassword: hashedPassword
    });

    const token = jwt.sign(
      { orgId, adminEmail, role: 'admin' }, 
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

    const token = jwt.sign(
      { orgId: organization.orgId, adminEmail, role: 'admin' }, 
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

// UPDATE SCHOOL BASIC DETAILS
exports.updateSchoolDetails = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { schoolName, campusAddress, schoolEmail, primaryContact } = req.body;

    const filteredData = {};
    if (schoolName     !== undefined) filteredData.schoolName     = schoolName;
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