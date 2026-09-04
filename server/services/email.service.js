const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.initTransporter();
  }

  async initTransporter() {
    if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
        port: process.env.MAILTRAP_PORT || 2525,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS
        }
      });
      console.log('Email service initialized with Mailtrap');
    } else {
      // Fallback to ethereal for testing
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Email service initialized with Ethereal (Testing mode)');
    }
  }

  async sendPasswordResetEmail(toEmail, resetToken) {
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    const mailOptions = {
      from: '"ProEvaluator Admin" <no-reply@proevaluator.edu>',
      to: toEmail,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your ProEvaluator account.</p>
        <p>Please click the link below to reset your password. This link is valid for 1 hour.</p>
        <a href="${resetLink}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `
    };

    try {
      if (!this.transporter) await this.initTransporter(); // Ensure transporter is ready

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${toEmail}`);
      
      if (info.messageId && nodemailer.getTestMessageUrl(info)) {
        console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      console.error(`Failed to send password reset email to ${toEmail}:`, error);
      throw new Error('Failed to send email');
    }
  }
}

module.exports = new EmailService();
