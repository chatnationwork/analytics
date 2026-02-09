import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY");

    // We'll initialize even without key for development, but log a warning
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn(
        "RESEND_API_KEY is not set. Emails will only be logged to console.",
      );
    }

    // Default from email, can be overridden by env
    this.fromEmail =
      this.configService.get<string>("EMAIL_FROM") ||
      "ChatNation <onboarding@resend.dev>";
  }

  async sendInvitationEmail(
    to: string,
    inviteUrl: string,
    inviterName?: string,
    workspaceName?: string,
    overrides?: { subject?: string; body?: string },
  ) {
    const ws = workspaceName || "a workspace";
    const inv = inviterName || "A team member";
    const subject =
      overrides?.subject?.trim()?.replace(/\{\{workspaceName\}\}/g, ws).replace(/\{\{inviterName\}\}/g, inv) ??
      `You've been invited to join ${ws} on ChatNation`;
    const bodyParagraph =
      overrides?.body?.trim()?.replace(/\{\{workspaceName\}\}/g, ws).replace(/\{\{inviterName\}\}/g, inv) ??
      `${inv} has invited you to join their workspace on ChatNation.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Join ${ws}</h2>
        <p>Hello,</p>
        <p>${bodyParagraph}</p>
        <p>Click the button below to accept the invitation and set up your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 14px; word-break: break-all;">${inviteUrl}</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eaeaea;" />
        <p style="color: #999; font-size: 12px;">This invitation will expire in 7 days.</p>
      </div>
    `;

    if (!this.resend) {
      this.logger.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
      this.logger.log(`[MOCK EMAIL] Link: ${inviteUrl}`);
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        throw new Error(error.message);
      }

      this.logger.log(`Email sent to ${to}, ID: ${data?.id}`);
      return data;
    } catch (error) {
      this.logger.error(`Error sending email: ${error}`);
      // Don't crash the request if email fails, but log it
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const subject = "Reset your password";
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Hello,</p>
        <p>You requested a password reset. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset password</a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 14px; word-break: break-all;">${resetUrl}</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eaeaea;" />
        <p style="color: #999; font-size: 12px;">This link expires in 24 hours. If you didn't request a reset, you can ignore this email.</p>
      </div>
    `;

    if (!this.resend) {
      this.logger.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
      this.logger.log(`[MOCK EMAIL] Link: ${resetUrl}`);
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(
          `Failed to send password reset email to ${to}: ${error.message}`,
        );
        throw new Error(error.message);
      }

      this.logger.log(`Password reset email sent to ${to}, ID: ${data?.id}`);
    } catch (error) {
      this.logger.error(`Error sending password reset email: ${error}`);
      throw error;
    }
  }

  async sendSessionTakeoverEmail(
    to: string,
    verifyUrl: string,
    overrides?: { subject?: string; body?: string },
  ): Promise<void> {
    const subject =
      overrides?.subject?.trim() ?? "Verify your login";
    const bodyParagraph =
      overrides?.body?.trim() ??
      "You're trying to log in from a new device or browser. Click the button below to verify it's you and log in there. Your other session will be signed out.";
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${subject}</h2>
        <p>Hello,</p>
        <p>${bodyParagraph}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify and log in</a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 14px; word-break: break-all;">${verifyUrl}</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eaeaea;" />
        <p style="color: #999; font-size: 12px;">This link expires in 15 minutes. If you didn't try to log in, you can ignore this email.</p>
      </div>
    `;

    if (!this.resend) {
      this.logger.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
      this.logger.log(`[MOCK EMAIL] Link: ${verifyUrl}`);
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(
          `Failed to send session takeover email to ${to}: ${error.message}`,
        );
        throw new Error(error.message);
      }

      this.logger.log(`Session takeover email sent to ${to}, ID: ${data?.id}`);
    } catch (error) {
      this.logger.error(`Error sending session takeover email: ${error}`);
      throw error;
    }
  }
}
