import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Transactional email sender. When SMTP_HOST is not configured the message is
 * logged to the console instead of sent — keeps dev/test working without SES
 * credentials (swap the transport for SES SMTP in production).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(configService: ConfigService) {
    this.from = configService.get<string>(
      'EMAIL_FROM',
      'AQ Herbal <noreply@aqherbal.com>',
    );
    const host = configService.get<string>('SMTP_HOST', '');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: configService.get<number>('SMTP_PORT', 587),
        secure: Number(configService.get<number>('SMTP_PORT', 587)) === 465,
        auth: {
          user: configService.get<string>('SMTP_USER', ''),
          pass: configService.get<string>('SMTP_PASS', ''),
        },
      });
      this.logger.log(`SMTP transport configured (${host})`);
    } else {
      this.transporter = null;
      this.logger.warn('SMTP_HOST not set — emails will be logged to console');
    }
  }

  /**
   * Best-effort notification to the store owner (OWNER_EMAIL env).
   * Never throws — callers log-and-continue so a mail failure can never
   * fail an order/contact request.
   */
  async notifyOwner(subject: string, text: string): Promise<void> {
    const owner = (process.env['OWNER_EMAIL'] ?? '').trim();
    if (!owner) {
      this.logger.warn(
        `OWNER_EMAIL not set — skipping owner notification "${subject}"`,
      );
      return;
    }
    try {
      await this.send(owner, subject, text);
    } catch (err) {
      this.logger.error(
        `Owner notification "${subject}" failed: ${(err as Error).message}`,
      );
    }
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL] to=${to} subject="${subject}"\n${text}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text });
      this.logger.log(`Email sent to ${to} ("${subject}")`);
    } catch (err) {
      this.logger.error(`Failed to email ${to}: ${(err as Error).message}`);
      throw err;
    }
  }
}
