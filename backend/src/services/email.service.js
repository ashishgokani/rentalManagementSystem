const nodemailer = require('nodemailer');

const getTransporter = () => {
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASSWORD || '';
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    if (!smtpUser || !smtpPass) {
        console.warn('[WARNING] SMTP credentials not set. Email service will run in mock mode.');
        return null;
    }

    return nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
            user: smtpUser.trim(),
            pass: smtpPass.trim()
        }
    });
};

const sendOtpEmail = async (toEmail, otp) => {
    const transporter = getTransporter();
    const otpExpireMinutes = process.env.OTP_EXPIRE_MINUTES || '10';

    const subject = 'Password Reset OTP - Rental Management System';
    const text = `Hi,\n\nYour OTP for password reset is: ${otp}\n\nThis OTP is valid for ${otpExpireMinutes} minutes.\n\nIf you did not request this, please ignore this email.`;
    const html = `
    <html>
      <body>
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>Hi,</p>
            <p>You requested to reset your password. Use the following OTP to proceed:</p>
            <h1 style="color: #4F46E5; letter-spacing: 5px;">${otp}</h1>
            <p>This OTP is valid for <strong>${otpExpireMinutes} minutes</strong>.</p>
            <p style="color: #666; font-size: 14px;">If you did not request this, please ignore this email.</p>
        </div>
      </body>
    </html>
    `;

    if (!transporter) {
        console.log(`[MOCK EMAIL] To: ${toEmail} | Subject: ${subject} | OTP: ${otp}`);
        return true;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: toEmail,
            subject,
            text,
            html
        });
        return true;
    } catch (error) {
        console.error(`[ERROR] Failed to send OTP email to ${toEmail}:`, error.message);
        return false;
    }
};

const sendEmail = async (toEmail, subject, htmlContent) => {
    const transporter = getTransporter();

    if (!transporter) {
        console.log(`[MOCK EMAIL] To: ${toEmail} | Subject: ${subject}`);
        return true;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: toEmail,
            subject,
            html: htmlContent
        });
        return true;
    } catch (error) {
        console.error(`[ERROR] Failed to send email to ${toEmail}:`, error.message);
        return false;
    }
};

module.exports = {
    sendOtpEmail,
    sendEmail
};
