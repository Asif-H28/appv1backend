const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');

exports.createOrganization = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    const { orgName, adminEmail, adminPassword } = req.body;

    if (!orgName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'orgName, adminEmail, adminPassword required' });
    }

    // Generate unique orgId: ORG_XXXXXX
    const generateOrgId = () => `ORG_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    let orgId;
    let existingOrgId;
    
    // Ensure unique orgId
    do {
      orgId = generateOrgId();
      existingOrgId = await Organization.findOne({ orgId });
    } while (existingOrgId);

    // Check name/email uniqueness
    const existingOrg = await Organization.findOne({ 
      $or: [{ name: orgName }, { adminEmail }] 
    });
    if (existingOrg) {
      return res.status(400).json({ 
        error: existingOrg.name === orgName 
          ? 'Organization name already exists' 
          : 'Admin email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create organization
    const organization = new Organization({
      orgId,
      name: orgName,
      adminEmail,
      adminPassword: hashedPassword
    });
    await organization.save();

    // JWT token
    const token = jwt.sign(
      { 
        orgId,
        mongoId: organization._id.toString(),
        adminEmail,
        role: 'admin'
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      organization: {
        orgId,
        id: organization._id,
        name: organization.name,
        adminEmail: organization.adminEmail,
        createdAt: organization.createdAt
      }
    });
  } catch (error) {
    console.error('Create org error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    const { adminEmail, adminPassword } = req.body;
    const organization = await Organization.findOne({ adminEmail });
    
    if (!organization || !(await bcrypt.compare(adminPassword, organization.adminPassword))) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { 
        orgId: organization.orgId,
        mongoId: organization._id.toString(),
        adminEmail: organization.adminEmail,
        role: 'admin'
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      organization: {
        orgId: organization.orgId,
        id: organization._id,
        name: organization.name,
        adminEmail: organization.adminEmail
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: error.message });
  }
};
