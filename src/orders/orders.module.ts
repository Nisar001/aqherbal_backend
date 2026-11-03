import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AdminOrdersController } from '../admin/admin-orders.controller';
import { PaymentsModule } from '../payments/payments.module';
import { OrderController, RazorpayWebhookController } from './order.controller';
import { OrderService } from './order.service';

/**
 * Orders module — prepaid guest checkout (Razorpay), order lookup,
 * cancellation/issue rules, admin order management and the Razorpay webhook
 * (raw body verified via Nest's `rawBody: true` option).
 */
@Module({
  imports: [AdminModule, PaymentsModule], // AuditService + RazorpayService
  controllers: [OrderController, RazorpayWebhookController, AdminOrdersController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrdersModule {}
