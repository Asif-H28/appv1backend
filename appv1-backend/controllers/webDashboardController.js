const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');
const SupportStaff = require('../models/SupportStaff');
const ActiveSession = require('../models/ActiveSession');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Try to find an Organization Admin
    const orgAdmin = await Organization.findOne({ adminEmail: normalizedEmail });
    
    if (orgAdmin) {
      // It's an org admin
      const isMatch = await bcrypt.compare(password, orgAdmin.adminPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (orgAdmin.isActive === false) {
        return res.status(403).json({ success: false, message: 'Organization has been deactivated. Please contact support.' });
      }

      const sessionToken = crypto.randomBytes(16).toString('hex');
      await ActiveSession.findOneAndUpdate(
        { userId: orgAdmin.orgId },
        { sessionToken },
        { upsert: true }
      );

      const token = jwt.sign(
        { orgId: orgAdmin.orgId, adminEmail: normalizedEmail, role: 'admin', sessionToken },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        token,
        user: {
          orgId: orgAdmin.orgId,
          name: orgAdmin.name,
          email: orgAdmin.adminEmail,
          role: 'admin'
        }
      });
    }

    // 2. If not admin, try to find a Support Staff
    const supportStaff = await SupportStaff.findOne({ email: normalizedEmail });
    
    if (supportStaff) {
      // It's a support staff
      const isMatch = await bcrypt.compare(password, supportStaff.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (supportStaff.isActive === false) {
        return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
      }

      // Check if the organization itself is active
      const org = await Organization.findOne({ orgId: supportStaff.orgId });
      if (!org || org.isActive === false) {
        return res.status(403).json({ success: false, message: 'Your organization has been deactivated.' });
      }

      const sessionToken = crypto.randomBytes(16).toString('hex');
      await ActiveSession.findOneAndUpdate(
        { userId: supportStaff.staffId },
        { sessionToken },
        { upsert: true }
      );

      const token = jwt.sign(
        { 
          orgId: supportStaff.orgId, 
          userId: supportStaff.staffId, 
          email: normalizedEmail, 
          role: 'support_staff', 
          sessionToken 
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        token,
        user: {
          orgId: supportStaff.orgId,
          staffId: supportStaff.staffId,
          name: supportStaff.name,
          email: supportStaff.email,
          role: 'support_staff'
        }
      });
    }

    // If neither was found
    return res.status(401).json({ success: false, message: 'Invalid credentials' });

  } catch (error) {
    console.error('Web Dashboard Login Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
