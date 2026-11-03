import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  Req,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';

export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/guards/jwt-auth.guard';
import { OrderService } from './order.service';
import {
  CreateOrderDto,
  OrderLookupDto,
  CancelRequestDto,
  ReportIssueDto,
  VerifyPaymentDto,
  UpdateOrderStatusDto,
  ListOrdersQueryDto,
} from './dto/order.dto';
import {
  ListAdminOrdersQueryDto,
  CreateRefundDto,
} from './dto/admin-order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ------------------------------ checkout ---------------------------------

  @Public()
  @Post()
  @HttpCode(201)
  @ResponseMessage('Order created')
  @ApiOperation({
    summary:
      'Create a prepaid order (guest checkout). Prices/totals are recomputed server-side.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  createOrder(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    const key =
      idempotencyKey?.trim() ||
      `gen-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    return this.orderService.createOrder(dto, key, { id: user?.sub ?? 'guest', ip: '' }, user?.sub);
  }

  @Public()
  @Post('lookup')
  @HttpCode(200)
  @ResponseMessage('Order fetched')
  @ApiOperation({ summary: 'Look up an order by order number + phone' })
  lookup(@Body() dto: OrderLookupDto) {
    return this.orderService.lookup(dto);
  }

  @Public()
  @Post(':orderNumber/cancel-request')
  @HttpCode(200)
  @ResponseMessage('Cancellation requested')
  @ApiOperation({ summary: 'Request cancellation (before shipped)' })
  cancelRequest(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: CancelRequestDto,
  ) {
    return this.orderService.cancelRequest(orderNumber, dto, {
      id: 'customer',
      ip: '',
    });
  }

  @Public()
  @Post(':orderNumber/report-issue')
  @HttpCode(200)
  @ResponseMessage('Issue reported')
  @ApiOperation({ summary: 'Report a damaged/incorrect parcel (48h of delivery)' })
  reportIssue(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: ReportIssueDto,
  ) {
    return this.orderService.reportIssue(orderNumber, dto, {
      id: 'customer',
      ip: '',
    });
  }

  @Public()
  @Post(':orderNumber/payments/verify')
  @HttpCode(200)
  @ResponseMessage('Payment verified')
  @ApiOperation({ summary: 'Verify the Razorpay Checkout callback' })
  verifyPayment(
    @Param('orderNumber') _orderNumber: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.orderService.verifyPayment(dto, { id: 'customer', ip: '' });
  }

  // --------------------------- authenticated user --------------------------

  @ApiBearerAuth()
  // ------------------------------ admin ------------------------------------
  // Declared before GET :id so "admin" is not captured by the param route.

  @ApiBearerAuth()
  @Get('admin')
  @Roles('admin')
  @ResponseMessage('Orders fetched')
  @ApiOperation({ summary: 'Admin: list all orders (filters + pagination)' })
  adminList(@Query() query: ListAdminOrdersQueryDto) {
    return this.orderService.adminList(query);
  }

  @ApiBearerAuth()
  @Get('admin/export.csv')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: export orders as CSV' })
  adminExportCsv(@Query() query: ListAdminOrdersQueryDto) {
    return this.orderService.adminExportCsv(query);
  }

  @ApiBearerAuth()
  @Get('admin/payments')
  @Roles('admin')
  @ResponseMessage('Payments fetched')
  @ApiOperation({ summary: 'Admin: list all payments' })
  adminListPayments(
    @Query() query: { page?: number; limit?: number; status?: string },
  ) {
    return this.orderService.adminListPayments(query);
  }

  @ApiBearerAuth()
  @Get('admin/:id')
  @Roles('admin')
  @ResponseMessage('Order fetched')
  @ApiOperation({ summary: 'Admin: get a specific order' })
  adminGet(@Param('id') orderId: string) {
    return this.orderService.adminGet(orderId);
  }

  @ApiBearerAuth()
  @Patch('admin/:id/status')
  @Roles('admin')
  @ResponseMessage('Order status updated')
  @ApiOperation({ summary: 'Admin: update order status (validated transitions)' })
  adminUpdateStatus(
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orderService.adminUpdateStatus(orderId, dto, {
      id: user.sub,
      ip: '',
    });
  }

  @ApiBearerAuth()
  @Post('admin/:id/refund')
  @Roles('admin')
  @ResponseMessage('Refund processed')
  @ApiOperation({ summary: 'Admin: refund a captured Razorpay payment' })
  adminRefund(
    @Param('id') orderId: string,
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orderService.adminRefund(orderId, dto, { id: user.sub, ip: '' });
  }

  // --------------------------- authenticated user --------------------------

  @ApiBearerAuth()
  @Get(':id')
  @ResponseMessage('Order fetched')
  @ApiOperation({ summary: 'Get a specific order (own orders only)' })
  getOrder(@CurrentUser() user: AuthUser, @Param('id') orderId: string) {
    return this.orderService.getOrder(user.sub, orderId);
  }
}

/** Webhook route — raw body kept by Nest's `rawBody: true` for HMAC checks. */
@ApiTags('Webhooks')
@Controller('webhooks')
export class RazorpayWebhookController {
  constructor(private readonly orderService: OrderService) {}

  @Public()
  @Post('razorpay')
  @HttpCode(200)
  @ResponseMessage('Webhook received')
  @ApiOperation({ summary: 'Razorpay webhook — signature-verified source of truth' })
  async razorpayWebhook(
    @Req() req: RawBodyRequest,
    @Headers('x-razorpay-signature') signature: string | undefined,
  ) {
    if (!req.rawBody) {
      return { success: true, message: 'No raw body captured' };
    }
    return this.orderService.handleWebhook(req.rawBody, signature, {
      id: 'razorpay',
      ip: '',
    });
  }
}
