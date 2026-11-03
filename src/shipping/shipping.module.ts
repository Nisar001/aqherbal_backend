import { Module } from '@nestjs/common';
import {
  AdminShipmentsController,
  ShippingController,
} from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ShipmentController } from './shipment.controller';
import { IndiaPostWebhookController } from './india-post.webhook';
import { AdminModule } from '../admin/admin.module'; // for AuditService

@Module({
  imports: [AdminModule],
  controllers: [
    ShippingController,
    AdminShipmentsController,
    ShipmentController,
    IndiaPostWebhookController,
  ],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
