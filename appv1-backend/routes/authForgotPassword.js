const express        = require('express');
const router         = express.Router();
const rateLimit      = require('express-rate-limit');
const bcrypt         = require('bcryptjs');

// ─── Models — searching across all user types ─────────────────────────────────
const Organization  = require('../models/Organization'); // Admin: adminEmail / adminPassword
const Teacher       = require('../models/Teacher');       // Teacher: email / password
const PasswordReset = require('../models/PasswordReset');

const { generateOTP, hashValue, generateResetToken } = require('../utils/otpUtils');
const { sendOTPEmail } = require('../utils/mailer');

// ─── Helper: find any account by email across all collections ─────────────────
// Returns { found: true, role: 'admin'|'teacher', model, emailField, passwordField }
async function findAccountByEmail(email) {
  // 1. Check Organization (admin)
  const org = await Organization.findOne({ adminEmail: email });
  if (org) return { found: true, role: 'admin', doc: org, passwordField: 'adminPassword' };

  // 2. Check Teacher
  const teacher = await Teacher.findOne({ email });
  if (teacher) return { found: true, role: 'teacher', doc: teacher, passwordField: 'password' };

  return { found: false };
}

// ─── Helper: update password in the correct collection ───────────────────────
async function updatePassword(email, hashedPwd) {
  // Try admin first, then teacher
  const orgResult = await Organization.findOneAndUpdate(
    { adminEmail: email },
    { adminPassword: hashedPwd }
  );
  if (orgResult) return;

  await Teacher.findOneAndUpdate(
    { email },
    { password: hashedPwd }
  );
}

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many requests. Try again after 15 minutes.' },
});

const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP attempts. Request a new OTP.' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Route 1: POST /api/auth/forgot-password
// Body: { "email": "user@example.com" }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    console.log('\n\n======================================================');
    console.log('🚨 FORGOT PASSWORD ENDPOINT HIT 🚨');
    console.log('Body received:', req.body);
    console.log('======================================================\n');
    
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const genericResponse = { message: 'If this email is registered, an OTP has been sent.' };

    // Search across Organization + Teacher
    const account = await findAccountByEmail(normalizedEmail);
    console.log(`[OTP] forgot-password for ${normalizedEmail} → found: ${account.found}, role: ${account.role || 'none'}`);

    if (!account.found) {
      return res.status(200).json(genericResponse); // Never reveal if email exists
    }

    // Generate OTP
    const otp    = generateOTP();
    const hashed = hashValue(otp);
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Upsert PasswordReset doc
    await PasswordReset.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          email:     normalizedEmail,
          otpHash:   hashed,
          otpExpiry: expiry,
          createdAt: new Date(),
        },
        $unset: { resetToken: '', resetTokenExpiry: '' },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send OTP email
    await sendOTPEmail(normalizedEmail, otp);
    console.log(`[OTP] ✅ Email sent to ${normalizedEmail} (role: ${account.role})`);
    console.log(`[OTP-DEBUG] 🔑 The generated OTP is: ${otp}`);

    return res.status(200).json(genericResponse);

  } catch (err) {
    console.error('[forgot-password] ❌ error:', err.message);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Route 2: POST /api/auth/verify-otp
// Body: { "email": "user@example.com", "otp": "4821" }
// Returns: { resetToken: "..." }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-otp', verifyLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resetDoc = await PasswordReset.findOne({ email: normalizedEmail });

    if (!resetDoc || !resetDoc.otpHash || !resetDoc.otpExpiry) {
      return res.status(400).json({ message: 'No OTP request found. Please start over.' });
    }

    if (resetDoc.otpExpiry < new Date()) {
      await PasswordReset.deleteOne({ email: normalizedEmail });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const hashedInput = hashValue(otp.toString().trim());
    if (hashedInput !== resetDoc.otpHash) {
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    }

    // OTP verified — issue reset token
    const resetToken       = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

    resetDoc.otpHash          = undefined;
    resetDoc.otpExpiry        = undefined;
    resetDoc.resetToken       = resetToken;
    resetDoc.resetTokenExpiry = resetTokenExpiry;
    await resetDoc.save();

    console.log(`[OTP] ✅ Verified for ${normalizedEmail}`);
    return res.status(200).json({ message: 'OTP verified successfully.', resetToken });

  } catch (err) {
    console.error('[verify-otp] ❌ error:', err.message);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Route 3: POST /api/auth/reset-password
// Body: { "email": "...", "resetToken": "...", "newPassword": "..." }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ message: 'email, resetToken and newPassword are all required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resetDoc = await PasswordReset.findOne({ email: normalizedEmail });

    if (
      !resetDoc ||
      !resetDoc.resetToken ||
      resetDoc.resetToken !== resetToken ||
      resetDoc.resetTokenExpiry < new Date()
    ) {
      return res.status(400).json({ message: 'Invalid or expired reset session. Please start over.' });
    }

    // Hash new password
    const salt      = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash(newPassword, salt);

    // Update password in correct collection (admin or teacher)
    await updatePassword(normalizedEmail, hashedPwd);

    // Delete PasswordReset doc
    await PasswordReset.deleteOne({ email: normalizedEmail });

    console.log(`[OTP] ✅ Password reset complete for ${normalizedEmail}`);
    return res.status(200).json({ message: 'Password reset successful. You can now log in.' });

  } catch (err) {
    console.error('[reset-password] ❌ error:', err.message);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;
