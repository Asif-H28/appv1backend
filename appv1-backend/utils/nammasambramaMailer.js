/**
 * Email adapter for NammaSambrama OTP delivery.
 *
 * One entry point — sendOtpEmail(email, otp) — with provider implementations
 * behind the EMAIL_PROVIDER env switch. Both providers are already used
 * elsewhere in this backend, so no new dependency is introduced.
 *
 * EMAIL_PROVIDER=brevo  → Brevo HTTP API (default; needs BREVO_API_KEY)
 * EMAIL_PROVIDER=gmail  → Gmail SMTP via nodemailer (GMAIL_USER + GMAIL_APP_PASS)
 * not configured        → dev mode: logs the OTP to the console
 */

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

const SUBJECT = 'Your NammaSambrama verification code';

function otpHtml(otp) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:10px;">
      <h2 style="color:#7c6fd4;margin:0 0 8px;">Verify your email</h2>
      <p style="color:#374151;">Use the code below to finish creating your NammaSambrama admin account.</p>
      <div style="font-size:40px;font-weight:bold;letter-spacing:14px;color:#1a1a1a;padding:22px 0;text-align:center;background:#f9fafb;border-radius:6px;margin:20px 0;">
        ${otp}
      </div>
      <p style="color:#6b7280;font-size:13px;">
        This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
      </p>
      <p style="color:#6b7280;font-size:13px;">
        If you did not request this, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;">ನಮ್ಮ ಸಂಭ್ರಮ — NammaSambrama</p>
    </div>
  `;
}

// Same verified-sender fallback used by utils/mailer.js, so this works with
// whatever is already configured for the school app's Brevo account.
function senderEmail() {
  return (
    process.env.NAMMASAMBRAMA_SENDER_EMAIL ||
    process.env.GMAIL_USER ||
    'asif28072001@gmail.com'
  );
}

/** Brevo transactional email API. */
async function sendViaBrevo(email, otp) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = senderEmail();

  if (!apiKey) return { sent: false, reason: 'BREVO_API_KEY not configured' };

  const response = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      sender: { name: 'NammaSambrama', email: from },
      to: [{ email }],
      subject: SUBJECT,
      htmlContent: otpHtml(otp)
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Brevo API error: ${response.status} - ${detail}`);
  }

  return { sent: true, provider: 'brevo' };
}

/** Gmail SMTP via nodemailer. */
async function sendViaGmail(email, otp) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASS;

  if (!user || !pass) {
    return { sent: false, reason: 'GMAIL_USER / GMAIL_APP_PASS not configured' };
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  await transporter.sendMail({
    from: `"NammaSambrama" <${user}>`,
    to: email,
    subject: SUBJECT,
    html: otpHtml(otp)
  });

  return { sent: true, provider: 'gmail' };
}

const PROVIDERS = {
  brevo: sendViaBrevo,
  gmail: sendViaGmail
};

/**
 * Send an OTP to an email address.
 * Never throws on a delivery failure — returns a result so the caller can
 * decide how to respond. Failures are logged, not leaked to clients.
 *
 * @param {string} email Recipient email address
 * @param {string} otp   4-digit OTP
 * @returns {Promise<{sent: boolean, provider?: string, devMode?: boolean, reason?: string}>}
 */
async function sendOtpEmail(email, otp) {
  const providerName = (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase();
  const send = PROVIDERS[providerName];

  if (!send) {
    console.warn(`⚠️  Unknown EMAIL_PROVIDER "${providerName}" — falling back to dev mode`);
    console.log(`📧 [DEV] OTP for ${email}: ${otp}`);
    return { sent: false, devMode: true, reason: `unknown provider "${providerName}"` };
  }

  try {
    const result = await send(email, otp);

    // Provider selected but not configured yet — fall back to logging so the
    // signup flow stays testable end to end.
    if (!result.sent) {
      console.warn(`⚠️  Email not sent via ${providerName}: ${result.reason}`);
      console.log(`📧 [DEV] OTP for ${email}: ${otp}`);
      return { ...result, devMode: true };
    }

    console.log(`✅ OTP emailed to ${email} via ${providerName}`);
    return result;
  } catch (error) {
    console.error(`❌ Email delivery failed via ${providerName}:`, error.message);
    console.log(`📧 [DEV] OTP for ${email}: ${otp}`);
    return { sent: false, devMode: true, reason: error.message };
  }
}

module.exports = { sendOtpEmail };
