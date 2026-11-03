import { Controller, Post, Body, Headers, Req, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ShippingService } from './shipping.service';
import type { RawBodyRequest } from './shipping.service';
import { Injectable, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * India Post Webhook Handler
 *
 * India Post sends status updates to the configured webhook URL when
 * a shipment's status changes: picked up, in transit, out for delivery,
 * delivered, RTO, etc.
 *
 * The raw body must be preserved for signature verification (currently
 * configured via India Post's webhook secret).
 */
@ApiTags('Webhooks')
@Controller('webhooks/india-post')
export class IndiaPostWebhookController {
  private readonly logger = new Logger(IndiaPostWebhookController.name);

  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @HttpCode(200)
  @ResponseMessage('Webhook received')
  @ApiOperation({
    summary: 'India Post webhook — shipment status update (picked up / transit / delivered / RTO)',
  })
  async indiaPostWebhook(@Req() req: RawBodyRequest, @Body() body: any) {
    // Body was captured by the RawBodyMiddleware (configured in AppModule).
    // For India Post, the webhook URL receives the status payload with:
    // - PostId / TrackingNumber (AWB)
    // - Datetime
    // - Status (0=cancelled, 1=picked up, 2=in transit, 3=out for delivery,
    //           4=delivered, 5=postponed, 6=returned to sender, 7=dispatched to hub)
    // - Sender / Receiver details

    const rawBody = req.rawBody;

    if (rawBody) {
      this.logger.log(
        `[India Post webhook] raw body: ${rawBody.slice(0, 300)}`,
      );
    }

    // TODO: Verify the India Post webhook signature (configured in the
    // India Post admin console) before trusting the payload.

    let payload = body;
    try {
      payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : body;
    } catch {
      payload = body;
    }

    // Extract AWB / PostId and status
    const awbNumber =
      payload.TrackingNumber ??
      payload.PostId ??
      payload.AwbNumber ??
      payload.awbNumber ??
      null;

    const status = payload.Status ?? payload.status ?? payload.StatusType ?? null;

    if (awbNumber) {
      this.logger.log(
        `[India Post] AWB ${awbNumber} -> status ${status} at ${new Date().toISOString()}`,
      );

      // TODO: Find the shipment by AWB and update its status in the DB:
      //   - Look up shipment by awbNumber
      //   - Map India Post status code to internal status:
      //     - 3 (out for delivery) → 'out_for_delivery'
      //     - 4 (delivered) → 'delivered', set deliveredAt
      //     - 6 (returned) → 'returned_to_sender'
      //     - 0 (cancelled) → 'cancelled'
      //     - default → keep existing status
    } else {
      this.logger.warn(
        '[India Post webhook] No TrackingNumber/AwbNumber found in payload — ignoring',
      );
    }

    return {
      success: true,
      message: 'Webhook received (India Post signature verification deferred until configured)',
    };
  }
}
