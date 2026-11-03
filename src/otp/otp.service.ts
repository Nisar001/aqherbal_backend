import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { randomInt } from 'node:crypto';

const OTP_TTL_SECONDS = 300; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Mobile OTP issue/verify flow. Sends via MSG91 when MSG91_AUTH_KEY is set,
 * otherwise logs the code to the console (dev mode).
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly cache: CacheService,
    private readonly configService: ConfigService,
  ) {}

  /** Generates, stores and (attempts to) deliver an OTP for a phone number. */
  async send(phone: string): Promise<void> {
    const cooldownKey = `otp:cooldown:${phone}`;
    const remaining = await this.cache.decr(
      cooldownKey,
      RESEND_COOLDOWN_SECONDS,
    );
    if (remaining < RESEND_COOLDOWN_SECONDS - 1 && remaining >= 0) {
      throw new Error('Please wait before requesting another OTP');
    }

    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    await this.cache.set(`otp:${phone}`, code, OTP_TTL_SECONDS);
    await this.cache.set(`otp:attempts:${phone}`, '0', OTP_TTL_SECONDS);

    const authKey = this.configService.get<string>('MSG91_AUTH_KEY', '');
    if (authKey) {
      await this.sendViaMsg91(phone, code);
    } else {
      this.logger.log(`[DEV OTP] ${phone} → ${code}`);
    }
  }

  /** Returns true when the code matches and marks it consumed. */
  async verify(phone: string, code: string): Promise<boolean> {
    const key = `otp:${phone}`;
    const stored = await this.cache.get(key);
    if (!stored) return false;

    const attemptsKey = `otp:attempts:${phone}`;
    const attempts = parseInt((await this.cache.get(attemptsKey)) ?? '0', 10);
    if (attempts >= 5) {
      await this.cache.del(key);
      await this.cache.del(attemptsKey);
      throw new Error('Too many failed attempts — please request a new OTP');
    }

    if (stored !== code) {
      await this.cache.set(attemptsKey, String(attempts + 1), OTP_TTL_SECONDS);
      return false;
    }

    await this.cache.del(key);
    await this.cache.del(attemptsKey);
    return true;
  }

  private async sendViaMsg91(phone: string, code: string): Promise<void> {
    const authKey = this.configService.getOrThrow<string>('MSG91_AUTH_KEY');
    const sender = this.configService.get<string>('MSG91_SENDER_ID', '');
    const templateId = this.configService.get<string>('MSG91_TEMPLATE_ID', '');
    const params = new URLSearchParams({
      authkey: authKey,
      mobile: phone.startsWith('+') ? phone : `91${phone}`,
      otp: code,
      ...(sender ? { sender } : {}),
      ...(templateId ? { template_id: templateId } : {}),
    });

    try {
      const res = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      if (!res.ok) {
        this.logger.error(`MSG91 returned ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      this.logger.error(`MSG91 send failed: ${(err as Error).message}`);
    }
  }
}
