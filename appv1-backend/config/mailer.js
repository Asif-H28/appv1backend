const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,      // your gmail
    pass: process.env.GMAIL_APP_PASS   // 16-digit app password
  }
});

const sendOtpEmail = async (toEmail, name, otp) => {
  const mailOptions = {
    from: `"AppV1 School" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your OTP Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4A90E2;">Hello ${name} 👋</h2>
        <p>Your OTP verification code is:</p>
        <h1 style="letter-spacing: 10px; color: #333; text-align: center;">${otp}</h1>
        <p style="color: #999; font-size: 13px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr/>
        <p style="color: #ccc; font-size: 11px; text-align:center;">AppV1 School Platform</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };
