const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const SupportStaff = require('../models/SupportStaff');
const StaffInvitation = require('../models/StaffInvitation');
const Organization = require('../models/Organization');
const ActiveSession = require('../models/ActiveSession');
const { sendStaffInvitationEmail } = require('../utils/mailer');
const jwt = require('jsonwebtoken');

const generateStaffId = () => `STF_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// 1. Invite Support Staff (Admin Only)
exports.inviteStaff = async (req, res) => {
  try {
    const { email } = req.body;
    const orgId = req.user?.orgId; // From auth middleware

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user is already a support staff anywhere
    const existingStaff = await SupportStaff.findOne({ email: normalizedEmail });
    if (existingStaff) {
      return res.status(400).json({ error: 'This email is already registered as a Support Staff' });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create or update invitation
    await StaffInvitation.findOneAndUpdate(
      { email: normalizedEmail, orgId },
      { token, expiresAt },
      { upsert: true, new: true }
    );

    // Get org name for the email
    const org = await Organization.findOne({ orgId });
    const orgName = org ? org.name : 'your organization';

    // Base URL provided by user
    const baseUrl = 'https://schoolsync-mu.vercel.app';
    const inviteLink = `${baseUrl}/support-staff/signup?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    // Send the email
    await sendStaffInvitationEmail(normalizedEmail, orgName, inviteLink);

    res.status(200).json({ success: true, message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Invite staff error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 2. Register Support Staff (Public)
exports.registerStaff = async (req, res) => {
  try {
    const { token, email, name, password } = req.body;

    if (!token || !email || !name || !password) {
      return res.status(400).json({ error: 'Token, email, name, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find valid invitation
    const invitation = await StaffInvitation.findOne({ token, email: normalizedEmail });
    if (!invitation) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    // Check if expired (though MongoDB TTL index handles this, good to be safe)
    if (invitation.expiresAt < new Date()) {
      await StaffInvitation.deleteOne({ _id: invitation._id });
      return res.status(400).json({ error: 'Invitation token has expired' });
    }

    // Ensure email is not already registered
    const existingStaff = await SupportStaff.findOne({ email: normalizedEmail });
    if (existingStaff) {
      return res.status(400).json({ error: 'User is already registered' });
    }

    // Generate staffId
    let staffId = generateStaffId();
    while (await SupportStaff.findOne({ staffId })) {
      staffId = generateStaffId();
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create staff member
    const newStaff = await SupportStaff.create({
      staffId,
      orgId: invitation.orgId,
      name,
      email: normalizedEmail,
      password: hashedPassword
    });

    // Delete the invitation
    await StaffInvitation.deleteOne({ _id: invitation._id });

    res.status(201).json({
      success: true,
      message: 'Support staff account created successfully. You can now log in.',
      staff: {
        staffId: newStaff.staffId,
        orgId: newStaff.orgId,
        name: newStaff.name,
        email: newStaff.email
      }
    });
  } catch (error) {
    console.error('Register staff error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 3. List Support Staff (Admin Only)
exports.listStaff = async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    const staff = await SupportStaff.find({ orgId }).select('-password');
    res.status(200).json({ success: true, count: staff.length, staff });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
