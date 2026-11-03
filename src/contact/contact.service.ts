import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateContactDto, SubscribeDto } from './dto/contact.dto';

/** Strips tags and control characters from free text before storage. */
function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // control chars
    .trim();
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateContactDto, ip: string) {
    // Honeypot: pretend success, store nothing.
    if (dto.website?.trim()) {
      return { data: null, message: 'Thanks — we will get back to you' };
    }

    const message = await this.prisma.contactMessage.create({
      data: {
        name: sanitizeText(dto.name).slice(0, 120),
        email: dto.email.trim().toLowerCase(),
        topic: dto.topic,
        message: sanitizeText(dto.message).slice(0, 3000),
      },
    });

    // Best-effort owner notification — failures are logged, never thrown.
    void this.mail
      .notifyOwner(
        `AQ contact: ${dto.topic}`,
        [
          `From: ${sanitizeText(dto.name)} <${dto.email}>`,
          `Topic: ${dto.topic}`,
          `IP: ${ip}`,
          '',
          sanitizeText(dto.message),
        ].join('\n'),
      )
      .catch((err: Error) =>
        this.logger.error(`Owner notification failed: ${err.message}`),
      );

    return {
      data: { id: message.id },
      message: 'Thanks — we will get back to you within one working day',
    };
  }

  async subscribe(dto: SubscribeDto, ip: string) {
    if (dto.website?.trim()) {
      return { data: null, message: 'You are on the list' };
    }
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });
    if (existing) {
      if (existing.unsubscribedAt) {
        // Re-subscribe on explicit opt-in.
        const updated = await this.prisma.newsletterSubscriber.update({
          where: { email },
          data: { unsubscribedAt: null, consentedAt: new Date() },
        });
        return { data: { id: updated.id }, message: 'You are on the list' };
      }
      throw new ConflictException('This email is already subscribed');
    }

    const subscriber = await this.prisma.newsletterSubscriber.create({
      data: { email, consentedAt: new Date() },
    });

    this.logger.log(`Newsletter signup from ${ip}`);
    void this.mail
      .notifyOwner('AQ newsletter signup', `New subscriber: ${email} (ip ${ip})`)
      .catch((err: Error) =>
        this.logger.error(`Owner notification failed: ${err.message}`),
      );

    return { data: { id: subscriber.id }, message: 'You are on the list' };
  }
}
