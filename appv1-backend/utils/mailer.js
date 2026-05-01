const { Resend } = require('resend');

// Use the API key provided from env or fallback to the one provided
const resend = new Resend(process.env.RESEND_API_KEY || 're_Vf6aKzKx_MXE85SthtDipachzFPC2vAaw');

async function sendOTPEmail(toEmail, otp) {
  try {
    const data = await resend.emails.send({
      from: 'AppV1 Support <onboarding@resend.dev>', // Must use onboarding email unless domain is verified
      to: toEmail,
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
    console.log(`[Resend] Successfully sent email to ${toEmail}. ID: ${data.id}`);
  } catch (error) {
    console.error('[Resend] ❌ Error sending email:', error.message);
    throw error;
  }
}

module.exports = { sendOTPEmail };
