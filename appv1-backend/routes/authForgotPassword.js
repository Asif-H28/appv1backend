const express       = require('express');
const router        = express.Router();
const rateLimit     = require('express-rate-limit');
const bcrypt        = require('bcryptjs');

const User          = require('../models/User');           // existing — NOT modified
const PasswordReset = require('../models/PasswordReset'); // new schema
const { generateOTP, hashValue, generateResetToken } = require('../utils/otpUtils');
const { sendOTPEmail } = require('../utils/mailer');

// ─── Rate Limiters ───────────────────────────────────────────────────────────

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15-minute window
  max: 5,
  message: { message: 'Too many requests. Try again after 15 minutes.' },
});

const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10-minute window
  max: 5,
  message: { message: 'Too many OTP attempts. Request a new OTP.' },
});

// ─── Route 1: POST /auth/forgot-password ────────────────────────────────────
// Finds user by email, generates OTP, saves hash to PasswordReset doc, sends email.

router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();

    // Look up user in existing User collection
    const user = await User.findOne({ email: normalizedEmail });

    // Always return same response — never reveal if email is registered
    if (!user) {
      return res.status(200).json({ message: 'If this email is registered, an OTP has been sent.' });
    }

    // Generate OTP
    const otp    = generateOTP();                           // "4821"
    const hashed = hashValue(otp);                         // SHA-256 hash
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now

    // Upsert PasswordReset doc — replaces any previous request for this email
    await PasswordReset.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          email:     normalizedEmail,
          otpHash:   hashed,
          otpExpiry: expiry,
          createdAt: new Date(),  // reset the 30-min TTL clock
        },
        $unset: {
          resetToken:       '',
          resetTokenExpiry: '',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send OTP email
    await sendOTPEmail(normalizedEmail, otp);

    console.log(`[OTP] Sent to ${normalizedEmail}`);
    return res.status(200).json({ message: 'If this email is registered, an OTP has been sent.' });

  } catch (err) {
    console.error('[forgot-password] error:', err.message);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ─── Route 2: POST /auth/verify-otp ─────────────────────────────────────────
// Verifies the OTP. On success, issues a short-lived resetToken.

router.post('/verify-otp', verifyLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find PasswordReset doc linked by email
    const resetDoc = await PasswordReset.findOne({ email: normalizedEmail });

    if (!resetDoc || !resetDoc.otpHash || !resetDoc.otpExpiry) {
      return res.status(400).json({ message: 'No OTP request found. Please start over.' });
    }

    // Check expiry
    if (resetDoc.otpExpiry < new Date()) {
      await PasswordReset.deleteOne({ email: normalizedEmail }); // clean up expired doc
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Compare hashed OTP
    const hashedInput = hashValue(otp.toString().trim());
    if (hashedInput !== resetDoc.otpHash) {
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    }

    // OTP verified — generate short-lived reset session token
    const resetToken       = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 more minutes

    // Update PasswordReset doc: clear OTP fields, store reset token
    resetDoc.otpHash           = undefined;
    resetDoc.otpExpiry         = undefined;
    resetDoc.resetToken        = resetToken;
    resetDoc.resetTokenExpiry  = resetTokenExpiry;
    await resetDoc.save();

    console.log(`[OTP] Verified for ${normalizedEmail}`);
    return res.status(200).json({
      message:    'OTP verified successfully.',
      resetToken, // Frontend stores this in memory for the next step
    });

  } catch (err) {
    console.error('[verify-otp] error:', err.message);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ─── Route 3: POST /auth/reset-password ─────────────────────────────────────
// Validates resetToken, hashes new password, updates User doc, deletes PasswordReset doc.

router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ message: 'email, resetToken and newPassword are all required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find PasswordReset doc
    const resetDoc = await PasswordReset.findOne({ email: normalizedEmail });

    if (
      !resetDoc ||
      !resetDoc.resetToken ||
      resetDoc.resetToken !== resetToken ||    // token must match exactly
      resetDoc.resetTokenExpiry < new Date()   // must not be expired
    ) {
      return res.status(400).json({ message: 'Invalid or expired reset session. Please start over.' });
    }

    // Hash new password
    const salt      = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash(newPassword, salt);

    // Update password in existing User collection — looked up by email
    await User.findOneAndUpdate(
      { email: normalizedEmail },
      { password: hashedPwd }
    );

    // Delete the PasswordReset doc — it has served its purpose
    await PasswordReset.deleteOne({ email: normalizedEmail });

    console.log(`[OTP] Password reset complete for ${normalizedEmail}`);
    return res.status(200).json({ message: 'Password reset successful. You can now log in.' });

  } catch (err) {
    console.error('[reset-password] error:', err.message);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;
