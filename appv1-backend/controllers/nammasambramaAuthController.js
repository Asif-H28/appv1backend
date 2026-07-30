const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const NammaSambramaAdmin = require('../models/NammaSambramaAdmin');
const NammaSambramaOtp = require('../models/NammaSambramaOtp');
const { generateOTP, hashValue } = require('../utils/otpUtils');
const { sendOtpEmail } = require('../utils/nammasambramaMailer');

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(input) {
  return String(input || '').trim().toLowerCase();
}

function signToken(admin) {
  return jwt.sign(
    {
      adminId: admin._id,
      username: admin.username,
      email: admin.email,
      scope: 'nammasambrama'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicAdmin(admin) {
  return {
    id: admin._id,
    username: admin.username,
    email: admin.email,
    isVerified: admin.isVerified
  };
}

/**
 * POST /api/nammasambrama/auth/send-otp
 * Body: { username, password, email }
 *
 * Validates the email, holds the pending signup, and emails a 4-digit OTP.
 * The admin account is NOT created here — only after the OTP is verified.
 */
exports.sendOtp = async (req, res) => {
  try {
    const { username, password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!username || !String(username).trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    const cleanUsername = String(username).trim().toLowerCase();

    // Reject duplicates up front so the user is not made to verify an OTP
    // only to fail at account creation.
    const existing = await NammaSambramaAdmin.findOne({
      $or: [{ username: cleanUsername }, { email }]
    });
    if (existing) {
      return res.status(409).json({
        error: existing.username === cleanUsername
          ? 'Username already taken'
          : 'An account already exists for this email address'
      });
    }

    // Throttle resends for the same address
    const pending = await NammaSambramaOtp.findOne({ email, purpose: 'signup' });
    if (pending && Date.now() - new Date(pending.createdAt).getTime() < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - new Date(pending.createdAt).getTime())) / 1000
      );
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting another OTP` });
    }

    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(12));

    // One pending OTP per address
    await NammaSambramaOtp.deleteMany({ email, purpose: 'signup' });
    await NammaSambramaOtp.create({
      email,
      otpHash: hashValue(otp),
      purpose: 'signup',
      pendingUsername: cleanUsername,
      pendingPassword: hashedPassword,
      expiresAt: new Date(Date.now() + OTP_TTL_MS)
    });

    const delivery = await sendOtpEmail(email, otp);

    res.status(200).json({
      message: 'OTP sent successfully',
      email,
      expiresInSeconds: OTP_TTL_MS / 1000,
      // True when no email provider is configured yet — the OTP is in the
      // server console. Never exposes the OTP itself.
      devMode: Boolean(delivery.devMode)
    });
  } catch (error) {
    console.error('sendOtp error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

/**
 * POST /api/nammasambrama/auth/resend-otp
 * Body: { email }
 *
 * Reuses the stored pending signup and issues a fresh OTP.
 */
exports.resendOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    const pending = await NammaSambramaOtp.findOne({ email, purpose: 'signup' });
    if (!pending) {
      return res.status(404).json({ error: 'No pending verification found. Please sign up again.' });
    }

    if (Date.now() - new Date(pending.createdAt).getTime() < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - new Date(pending.createdAt).getTime())) / 1000
      );
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting another OTP` });
    }

    const otp = generateOTP();
    pending.otpHash = hashValue(otp);
    pending.attempts = 0;
    pending.expiresAt = new Date(Date.now() + OTP_TTL_MS);
    pending.createdAt = new Date();
    await pending.save();

    const delivery = await sendOtpEmail(email, otp);

    res.status(200).json({
      message: 'OTP resent successfully',
      email,
      expiresInSeconds: OTP_TTL_MS / 1000,
      devMode: Boolean(delivery.devMode)
    });
  } catch (error) {
    console.error('resendOtp error:', error);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
};

/**
 * POST /api/nammasambrama/auth/verify-otp
 * Body: { email, otp }
 *
 * On success creates the admin account and returns a JWT.
 */
exports.verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }
    if (!/^\d{4}$/.test(otp)) {
      return res.status(400).json({ error: 'Enter the 4-digit OTP' });
    }

    const pending = await NammaSambramaOtp.findOne({ email, purpose: 'signup' });
    if (!pending) {
      return res.status(400).json({ error: 'OTP expired or not found. Please sign up again.' });
    }

    if (new Date(pending.expiresAt).getTime() < Date.now()) {
      await NammaSambramaOtp.deleteOne({ _id: pending._id });
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (pending.attempts >= MAX_OTP_ATTEMPTS) {
      await NammaSambramaOtp.deleteOne({ _id: pending._id });
      return res.status(429).json({ error: 'Too many incorrect attempts. Please sign up again.' });
    }

    if (pending.otpHash !== hashValue(otp)) {
      pending.attempts += 1;
      await pending.save();
      const left = MAX_OTP_ATTEMPTS - pending.attempts;
      return res.status(400).json({
        error: `Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} remaining.`
      });
    }

    // Re-check for races between send-otp and verify-otp
    const duplicate = await NammaSambramaAdmin.findOne({
      $or: [{ username: pending.pendingUsername }, { email }]
    });
    if (duplicate) {
      await NammaSambramaOtp.deleteOne({ _id: pending._id });
      return res.status(409).json({ error: 'An account already exists. Please log in.' });
    }

    const admin = await NammaSambramaAdmin.create({
      username: pending.pendingUsername,
      password: pending.pendingPassword, // already bcrypt hashed at send-otp
      email,
      isVerified: true
    });

    await NammaSambramaOtp.deleteOne({ _id: pending._id });

    res.status(201).json({
      message: 'Email verified. Account created.',
      token: signToken(admin),
      admin: publicAdmin(admin)
    });
  } catch (error) {
    console.error('verifyOtp error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

/**
 * POST /api/nammasambrama/auth/login
 * Body: { username, password }
 *
 * `username` accepts either the username or the registered email address.
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const identifier = String(username).trim().toLowerCase();
    const admin = await NammaSambramaAdmin.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });

    // Same message either way — do not reveal whether the account exists
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.status(200).json({
      message: 'Login successful',
      token: signToken(admin),
      admin: publicAdmin(admin)
    });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * GET /api/nammasambrama/auth/me  (protected)
 * Lets the UI validate a stored token on boot.
 */
exports.me = async (req, res) => {
  try {
    const admin = await NammaSambramaAdmin.findById(req.admin.adminId);
    if (!admin) {
      return res.status(401).json({ error: 'Account no longer exists', showLoginpage: true });
    }
    res.status(200).json({ admin: publicAdmin(admin) });
  } catch (error) {
    console.error('me error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
};
