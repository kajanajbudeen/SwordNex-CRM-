import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * Initialize or retrieve the pooled SMTP transporter.
   */
  private static getTransporter(): Transporter | null {
    if (!config.smtp.host) {
      return null;
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth:
          config.smtp.user && config.smtp.pass
            ? {
                user: config.smtp.user,
                pass: config.smtp.pass,
              }
            : undefined,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        socketTimeout: 10000,
      });
    }

    return this.transporter;
  }

  /**
   * Verify SMTP connection status without exposing credentials.
   */
  static async verifyConnection(): Promise<{ connected: boolean; message: string }> {
    const transporter = this.getTransporter();
    if (!transporter) {
      return {
        connected: false,
        message: 'SMTP is not configured (SMTP_HOST is empty). Operating in local simulation mode.',
      };
    }

    try {
      await transporter.verify();
      return {
        connected: true,
        message: `Successfully connected to SMTP server at ${config.smtp.host}:${config.smtp.port}`,
      };
    } catch (err: any) {
      return {
        connected: false,
        message: `SMTP connection check failed: ${err.message || 'Unknown network error'}`,
      };
    }
  }

  /**
   * Dispatch password reset email with secure 1-hour token link.
   */
  static async sendPasswordResetEmail(params: {
    to: string;
    resetToken: string;
    firstName?: string;
  }): Promise<{ success: boolean; simulated: boolean; messageId?: string }> {
    const { to, resetToken, firstName = 'Team Member' } = params;
    const resetUrl = `${config.clientUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const transporter = this.getTransporter();

    // If SMTP is unconfigured, record safely in diagnostic queue without crashing
    if (!transporter) {
      if (config.nodeEnv !== 'production') {
        console.warn(`[EmailService] SMTP not configured. Simulated reset URL for ${to}: ${resetUrl}`);
      }
      return { success: true, simulated: true };
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your SwordNex AI CRM Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .logo { font-size: 20px; font-weight: 700; color: #2563eb; margin-bottom: 24px; }
    .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0; }
    .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; font-size: 13px; color: #92400e; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">SwordNex AI CRM</div>
    <h2>Password Reset Request</h2>
    <p>Hello ${firstName},</p>
    <p>We received a request to reset your password for your SwordNex AI CRM account. Click the button below to set a new password:</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    <div class="alert">
      <strong>Important:</strong> This link is cryptographically protected and will expire in <strong>1 hour</strong>. It can only be used once.
    </div>
    <p style="font-size: 13px; color: #475569;">If the button above does not work, copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
    </p>
    <div class="footer">
      <p>If you did not request this password reset, please ignore this email or notify your organization administrator immediately. Your password will remain unchanged.</p>
      <p>&copy; ${new Date().getFullYear()} SwordNex Technologies Private Limited. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

    const text = `
SwordNex AI CRM — Password Reset

Hello ${firstName},

We received a request to reset your password for your SwordNex AI CRM account.

Click the following link to set your new password:
${resetUrl}

This link is valid for 1 hour and can only be used once.

If you did not request this change, please ignore this message.

— SwordNex Technologies Security Team
`;

    try {
      const info = await transporter.sendMail({
        from: config.smtp.from,
        to,
        subject: 'Reset Your SwordNex AI CRM Password',
        text,
        html,
      });

      return { success: true, simulated: false, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send password reset email to ${to}: ${err.message || 'SMTP Error'}`);
      throw new Error('Failed to dispatch password recovery email via SMTP gateway');
    }
  }
}
