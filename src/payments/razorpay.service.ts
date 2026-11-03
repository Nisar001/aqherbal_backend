import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay prepaid payments.
 *
 * - Orders are created against the Razorpay Orders API in paise.
 * - Checkout callbacks are verified with HMAC-SHA256
 *   (`order_id|payment_id` signed with RAZORPAY_KEY_SECRET).
 * - Webhooks are verified with RAZORPAY_WEBHOOK_SECRET over the raw body.
 * - Refunds go through the Refunds API.
 *
 * Dev-only mock mode (RAZORPAY_MOCK=true and NODE_ENV !== production) lets the
 * storefront exercise the full prepaid flow without live keys. Env validation
 * refuses to boot if RAZORPAY_MOCK is enabled in production.
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly mock: boolean;

  constructor(config: ConfigService) {
    this.keyId = config.get<string>('RAZORPAY_KEY_ID', '') ?? '';
    this.keySecret = config.get<string>('RAZORPAY_KEY_SECRET', '') ?? '';
    this.webhookSecret =
      config.get<string>('RAZORPAY_WEBHOOK_SECRET', '') ?? '';
    const wantMock = config.get<string>('RAZORPAY_MOCK', 'false') === 'true';
    const isProd = config.get<string>('NODE_ENV') === 'production';
    this.mock = wantMock && !isProd;

    if (this.mock) {
      this.logger.warn(
        'RAZORPAY_MOCK=true — using simulated payment gateway (dev only)',
      );
    } else if (!this.isConfigured()) {
      this.logger.warn(
        'Razorpay keys missing — order creation will return 503 until RAZORPAY_KEY_ID/SECRET are set',
      );
    }
  }

  isConfigured(): boolean {
    return this.mock || (Boolean(this.keyId) && Boolean(this.keySecret));
  }

  isMock(): boolean {
    return this.mock;
  }

  /**
   * Creates a Razorpay order for the given amount (paise).
   * Returns the Razorpay order id to hand to Razorpay Checkout.
   */
  async createOrder(
    amountPaise: number,
    receipt: string,
    notes: Record<string, string> = {},
  ): Promise<{ razorpayOrderId: string }> {
    if (amountPaise <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    if (this.mock) {
      return { razorpayOrderId: `order_mock_${receipt}` };
    }
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Online payment is not configured yet. Please try again later.',
      );
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Razorpay order creation failed (${response.status}): ${body}`,
      );
      throw new ServiceUnavailableException(
        'Could not start the payment session. Please try again.',
      );
    }

    const data = (await response.json()) as { id: string };
    return { razorpayOrderId: data.id };
  }

  /**
   * Verifies the Checkout callback signature
   * HMAC_SHA256(`${razorpay_order_id}|${razorpay_payment_id}`, KEY_SECRET).
   * Uses a constant-time comparison.
   */
  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    signature: string,
  ): boolean {
    if (this.mock) {
      // Dev mock: Checkout simulator sends the literal signature "mock".
      return signature === 'mock';
    }
    if (!this.keySecret) return false;
    const expected = createHmac('sha256', this.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    return this.safeEqual(expected, signature);
  }

  /** Verifies `X-Razorpay-Signature` over the raw webhook body. */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (this.mock) return signature === 'mock';
    if (!this.webhookSecret) return false;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return this.safeEqual(expected, signature);
  }

  /** Issues a refund for a captured payment (amount in paise). */
  async refund(
    razorpayPaymentId: string,
    amountPaise: number,
    reason = 'Order cancelled',
  ): Promise<{ ok: boolean; razorpayRefundId?: string; error?: string }> {
    if (this.mock) {
      return { ok: true, razorpayRefundId: `rfnd_mock_${Date.now()}` };
    }
    if (!this.isConfigured()) {
      return { ok: false, error: 'Razorpay is not configured' };
    }
    try {
      const response = await fetch(
        `https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`,
        {
          method: 'POST',
          headers: {
            Authorization:
              'Basic ' +
              Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount: amountPaise, speed: 'optimum', notes: { reason } }),
        },
      );
      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Razorpay refund failed (${response.status}): ${body}`);
        return { ok: false, error: `Razorpay refund failed: ${response.status}` };
      }
      const data = (await response.json()) as { id: string };
      return { ok: true, razorpayRefundId: data.id };
    } catch (err) {
      this.logger.error(`Razorpay refund error: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
    }
  }

  /** Constant-time string comparison (never leaks prefix matches). */
  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
