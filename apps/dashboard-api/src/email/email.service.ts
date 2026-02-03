import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    
    // We'll initialize even without key for development, but log a warning
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY is not set. Emails will only be logged to console.');
    }

    // Default from email, can be overridden by env
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'ChatNation <onboarding@resend.dev>';
  }

  async sendInvitationEmail(to: string, inviteUrl: string, inviterName?: string, workspaceName?: string) {
    const subject = `You've been invited to join ${workspaceName || 'a workspace'} on ChatNation`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Join ${workspaceName || 'Your Team'}</h2>
        <p>Hello,</p>
        <p>${inviterName || 'A team member'} has invited you to join their workspace on ChatNation.</p>
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
}
