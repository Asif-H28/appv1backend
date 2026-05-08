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

async function sendLicenseKeyEmail(toEmail, licenseKey, schoolName, name) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) throw new Error("BREVO_API_KEY is not defined");

    const senderEmail = process.env.GMAIL_USER || 'asif28072001@gmail.com';

    const payload = {
      sender: { name: "SchoolSync Support", email: senderEmail },
      to: [{ email: toEmail }],
      subject: `Your License Key for ${schoolName}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#00796B;margin:0;">SchoolSync</h1>
            <p style="color:#6b7280;margin:4px 0;">School Management Excellence</p>
          </div>
          
          <p style="font-size:16px;color:#374151;">Hello <strong>${name}</strong>,</p>
          
          <p style="font-size:15px;color:#4b5563;line-height:1.6;">
            Great news! Your license request for <strong>${schoolName}</strong> has been approved. You can now use the license key below to register your organization and onboard your staff.
          </p>
          
          <div style="background:#f0fdfa;border:2px dashed #00796B;border-radius:8px;padding:24px;text-align:center;margin:32px 0;">
            <p style="margin:0 0 8px 0;font-size:13px;color:#00796B;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your Unique License Key</p>
            <div style="font-size:32px;font-family:monospace;font-weight:bold;color:#1a1a1a;letter-spacing:2px;padding:12px;background:#ffffff;border-radius:4px;display:inline-block;border:1px solid #e5e7eb;">
              ${licenseKey}
            </div>
            <p style="margin:12px 0 0 0;font-size:12px;color:#6b7280;">(Select and copy the key above)</p>
          </div>
          
          <div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#9a3412;line-height:1.5;">
              <strong>Next Step:</strong> Go to the <strong>SchoolSync app</strong>, create your organisation, and paste this license key along with your other basic details to complete your registration.
            </p>
          </div>
          
          <p style="font-size:14px;color:#6b7280;">
            If you have any questions or need assistance during onboarding, please reply to this email.
          </p>
          
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
          
          <div style="text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; 2026 SchoolSync. All rights reserved.</p>
          </div>
        </div>
      `
    };

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

    console.log(`[Brevo] ✅ License Key sent to ${toEmail}`);
  } catch (error) {
    console.error('[Brevo] ❌ Error sending License Key:', error.message);
  }
}

module.exports = { sendOTPEmail, sendLicenseKeyEmail };
