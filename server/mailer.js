const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD  // Gmail App Password, not your login password
    }
});

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
                <p style="margin: 8px 0 0; color: #c7d2fe; font-size: 16px;">HireMind AI — Application Update</p>
            </div>
            <div style="padding: 36px 32px;">
                <p style="font-size: 18px; color: #e2e8f0;">Hi <strong style="color: #a5b4fc;">${candidateName}</strong>,</p>
                <p style="color: #94a3b8; line-height: 1.7; font-size: 15px;">
                    Great news! <strong style="color: #ffffff;">${companyName}</strong> has reviewed your application for the 
                    <strong style="color: #ffffff;">${jobTitle}</strong> position and decided to move you forward.
                </p>
                <div style="background: #1e293b; border: 1px solid #22c55e33; border-left: 4px solid #22c55e; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
                    <p style="margin: 0; color: #4ade80; font-weight: bold; font-size: 16px;">✅ Application Status: Accepted</p>
                    <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">The recruiter will reach out to you soon with next steps.</p>
                </div>
                <p style="color: #94a3b8; line-height: 1.7; font-size: 15px;">
                    Make sure your contact details are up to date on your HireMind profile. Best of luck!
                </p>
                <p style="color: #64748b; font-size: 13px; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 20px;">
                    This is an automated message from HireMind AI. Please do not reply to this email.
                </p>
            </div>
        </div>
        `
        : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: #1e293b; padding: 40px 32px; text-align: center; border-bottom: 1px solid #334155;">
                <h1 style="margin: 0; font-size: 24px; color: #e2e8f0;">Application Update</h1>
                <p style="margin: 8px 0 0; color: #64748b; font-size: 15px;">HireMind AI — Application Update</p>
            </div>
            <div style="padding: 36px 32px;">
                <p style="font-size: 18px; color: #e2e8f0;">Hi <strong style="color: #a5b4fc;">${candidateName}</strong>,</p>
                <p style="color: #94a3b8; line-height: 1.7; font-size: 15px;">
                    Thank you for applying to <strong style="color: #ffffff;">${jobTitle}</strong> at 
                    <strong style="color: #ffffff;">${companyName}</strong>. After careful consideration, 
                    the team has decided not to move forward with your application at this time.
                </p>
                <div style="background: #1e293b; border: 1px solid #f4375033; border-left: 4px solid #f43750; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
                    <p style="margin: 0; color: #fb7185; font-weight: bold; font-size: 16px;">Application Status: Not Selected</p>
                    <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">Don't be discouraged — keep applying to other opportunities.</p>
                </div>
                <p style="color: #94a3b8; line-height: 1.7; font-size: 15px;">
                    We encourage you to keep your HireMind profile updated and continue exploring other job listings that match your skills.
                </p>
                <p style="color: #64748b; font-size: 13px; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 20px;">
                    This is an automated message from HireMind AI. Please do not reply to this email.
                </p>
            </div>
        </div>
        `;

    await transporter.sendMail({
        from: `"HireMind AI" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject,
        html
    });

    console.log(`Email sent to ${toEmail} — status: ${status}`);
};

module.exports = { sendStatusEmail };