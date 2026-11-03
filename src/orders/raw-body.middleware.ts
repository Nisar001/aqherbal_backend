import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * RawBodyMiddleware captures the raw request body for routes that need
 * it (e.g. Razorpay webhook) to verify the HMAC signature.
 *
 * This must be applied to routes BEFORE the global body-parser runs,
 * so the raw bytes are preserved. For routes that need raw body:
 *
 *   app.use('/webhooks/razorpay', rawBodyMiddleware, razorpayWebhookHandler);
 *
 * The raw body is stored on req.rawBody (a Buffer) and then the buffer
 * is consumed so the global pipe can still parse JSON when needed.
 */
@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RawBodyMiddleware.name);

  private buffers: Buffer[] = [];
  private bodyLength = 0;

  use(req: Request, res: Response, next: NextFunction) {
    // If req.rawBody is already set, skip (already captured)
    if ((req as any).rawBody) {
      next();
      return;
    }

    const chunks: Buffer[] = [];
    let totalLength = 0;

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      totalLength += chunk.length;
      // Cap body size to avoid memory issues (Razorpay webhooks are small)
      if (totalLength > 5 * 1024 * 1024) {
        // Body too large — stop reading
        req.on('data', () => {});
        this.logger.warn(
          `Raw body too large (${totalLength} bytes) — truncating for webhook route`,
        );
      }
    });

    req.on('end', () => {
      if (chunks.length > 0) {
        const buffer = Buffer.concat(chunks);
        (req as any).rawBody = buffer;
      } else {
        (req as any).rawBody = Buffer.alloc(0);
      }
      this.bodyLength = totalLength;
      this.logger.debug(
        `Raw body captured: ${totalLength} bytes for ${req.method} ${req.originalUrl}`,
      );
      next();
    });
  }
}
