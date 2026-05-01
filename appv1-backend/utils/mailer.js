const dns        = require('dns');
const nodemailer = require('nodemailer');

// Force IPv4 DNS resolution — Render free tier has no IPv6 outbound internet access.
// smtp.gmail.com resolves to IPv6 by default on Node 18+, which causes ENETUNREACH.
dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   587,
  secure: false,   // STARTTLS on port 587
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

// Verify connection on server start
transporter.verify((err) => {
  if (err) console.error('❌ Mailer error:', err.message);
  else     console.log('✅ Mailer is ready to send emails');
});

async function sendOTPEmail(toEmail, otp) {
  await transporter.sendMail({
    from:    `"AppV1 Support" <${process.env.GMAIL_USER}>`,
    to:      toEmail,
    subject: 'Your Password Reset OTP',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#00796B;margin-bottom:8px;">Password Reset OTP</h2>
        <p style="color:#374151;">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:44px;font-weight:bold;letter-spacing:12px;color:#1a1a1a;padding:24px 0;text-align:center;background:#f9fafb;border-radius:6px;margin:20px 0;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:13px;">
          If you did not request this, you can safely ignore this email. This OTP will expire automatically.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
        <p style="color:#9ca3af;font-size:12px;">AppV1 — School Management System</p>
      </div>
    `,
  });
}

module.exports = { sendOTPEmail };
