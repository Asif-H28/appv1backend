const crypto = require('crypto'); // Built into Node.js — no install needed

// Random 4-digit OTP as string: "1000" to "9999"
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// SHA-256 hash — used for both OTP and reset token storage
function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// 32-byte random hex token for reset session
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateOTP, hashValue, generateResetToken };
