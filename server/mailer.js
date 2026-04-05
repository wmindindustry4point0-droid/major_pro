const https = require('https');

// Send email via Brevo HTTP API (not SMTP — works on Render free tier)
const sendBrevoEmail = ({ toEmail, toName, subject, html }) => {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            sender: { name: 'HireMind AI', email: process.env.BREVO_SENDER_EMAIL },
            to: [{ email: toEmail, name: toName || toEmail }],
            subject,
            htmlContent: html
        });

        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`Brevo API error: ${res.statusCode} ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
};

// ─── OTP Email ────────────────────────────────────────────────────────────────
const sendOtpEmail = async ({ toEmail, otp, purpose, name }) => {
    const isRegister = purpose === 'register';
    const subject = isRegister
        ? '🔐 Verify your HireMind account'
        : '🔑 Your HireMind login OTP';

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 40px 32px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; color: #ffffff;">
                ${isRegister ? '🔐 Verify Your Email' : '🔑 Login OTP'}
            </h1>
            <p style="margin: 8px 0 0; color: #c7d2fe; font-size: 16px;">HireMind AI</p>
        </div>
        <div style="padding: 36px 32px;">
            <p style="font-size: 18px; color: #e2e8f0;">Hi <strong style="color: #a5b4fc;">${name}</strong>,</p>
            <p style="color: #94a3b8; line-height: 1.7; font-size: 15px;">
                ${isRegister
                    ? 'Use the OTP below to verify your email and complete your HireMind registration.'
                    : 'Use the OTP below to log in to your HireMind account.'}
            </p>
            <div style="background: #1e293b; border: 2px solid #4f46e5; border-radius: 16px; padding: 28px; margin: 28px 0; text-align: center;">
                <p style="margin: 0 0 8px; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Your One-Time Password</p>
                <p style="margin: 0; font-size: 48px; font-weight: bold; letter-spacing: 12px; color: #a5b4fc; font-family: monospace;">${otp}</p>
                <p style="margin: 12px 0 0; color: #64748b; font-size: 13px;">⏱ Valid for 10 minutes</p>
            </div>
            <p style="color: #64748b; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
    </div>`;

    await sendBrevoEmail({ toEmail, toName: name, subject, html });
    console.log(`OTP email sent to ${toEmail} — purpose: ${purpose}`);
};

// ─── Status Email ─────────────────────────────────────────────────────────────
const sendStatusEmail = async ({ toEmail, candidateName, jobTitle, companyName, status }) => {
    const isAccepted = status === 'shortlisted';

    const subject = isAccepted
        ? `🎉 Congratulations! Your application for ${jobTitle} has been accepted`
        : `Update on your application for ${jobTitle}`;

    const html = isAccepted
        ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 40px 32px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; color: #ffffff;">🎉 You've Been Accepted!</h1>
            </div>
            <div style="padding: 36px 32px;">
                <p style="font-size: 18px; color: #e2e8f0;">Hi <strong style="color: #a5b4fc;">${candidateName}</strong>,</p>
                <p style="color: #94a3b8; line-height: 1.7;">Great news! <strong style="color: #ffffff;">${companyName}</strong> has moved you forward for <strong style="color: #ffffff;">${jobTitle}</strong>.</p>
                <div style="background: #1e293b; border-left: 4px solid #22c55e; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
                    <p style="margin: 0; color: #4ade80; font-weight: bold;">✅ Application Status: Accepted</p>
                </div>
            </div>
        </div>`
        : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: #1e293b; padding: 40px 32px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; color: #e2e8f0;">Application Update</h1>
            </div>
            <div style="padding: 36px 32px;">
                <p style="font-size: 18px; color: #e2e8f0;">Hi <strong style="color: #a5b4fc;">${candidateName}</strong>,</p>
                <p style="color: #94a3b8;">Thank you for applying to <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. The team has decided not to move forward at this time.</p>
            </div>
        </div>`;

    await sendBrevoEmail({ toEmail, toName: candidateName, subject, html });
    console.log(`Status email sent to ${toEmail} — status: ${status}`);
};

module.exports = { sendOtpEmail, sendStatusEmail };