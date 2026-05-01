// utils/mailer.js

async function sendOTPEmail(toEmail, otp) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    
    if (!apiKey) {
      throw new Error("BREVO_API_KEY is not defined in environment variables");
    }

    // You can use your original GMAIL_USER as the sender, provided you verified it in Brevo
    const senderEmail = process.env.GMAIL_USER || 'asif28072001@gmail.com';

    const payload = {
      sender: {
        name: "AppV1 Support",
        email: senderEmail
      },
      to: [
        {
          email: toEmail
        }
      ],
      subject: "Your Password Reset OTP",
      htmlContent: `
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
      `
    };

    // Node 18+ has built-in fetch
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Brevo API Error: ${response.status} - ${errorData}`);
    }

    console.log(`[Brevo] ✅ Successfully sent email to ${toEmail}`);
  } catch (error) {
    console.error('[Brevo] ❌ Error sending email:', error.message);
    throw error;
  }
}

module.exports = { sendOTPEmail };
