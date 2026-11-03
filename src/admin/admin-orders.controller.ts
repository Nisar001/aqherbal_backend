import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthUser as AdminAuthUser } from '../common/guards/jwt-auth.guard';

import { OrderService } from '../orders/order.service';
import { CreateRefundDto } from '../orders/dto/admin-order.dto';
import { UpdateOrderStatusDto } from '../orders/dto/order.dto';

/** Admin orders — all actions require an active super-admin token. */
@ApiTags('Orders')
@ApiBearerAuth()
@Controller('admin/orders')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class AdminOrdersController {
  constructor(
    private readonly orderService: OrderService,
  ) {}

  @Get()
  @ResponseMessage('Orders fetched')
  @ApiOperation({ summary: 'Admin: list all orders (filters + pagination)' })
  adminList(@Query() query: AdminOrdersQueryDto) {
    return this.orderService.adminList(query);
  }

  @Get('export.csv')
  @ResponseMessage('CSV export generated')
  @ApiOperation({ summary: 'Admin: export orders as CSV' })
  adminExportCsv(@Query() query: AdminOrdersQueryDto) {
    return this.orderService.adminExportCsv(query);
  }

  @Get('payments')
  @ResponseMessage('Payments fetched')
  @ApiOperation({ summary: 'Admin: list all payments' })
  adminListPayments(
    @Query() query: { page?: number; limit?: number; status?: string },
  ) {
    return this.orderService.adminListPayments(query);
  }

  @Get(':id')
  @ResponseMessage('Order fetched')
  @ApiOperation({ summary: 'Admin: get a specific order' })
  adminGet(@Param('id', ParseUUIDPipe) orderId: string) {
    return this.orderService.adminGet(orderId);
  }

  @Patch(':id/status')
  @ResponseMessage('Order status updated')
  @ApiOperation({ summary: 'Admin: update order status (validated transitions)' })
  adminUpdateStatus(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AdminAuthUser,
  ) {
    return this.orderService.adminUpdateStatus(orderId, dto, {
      id: user.sub,
      ip: '',
    });
  }

  @Post(':id/refund')
  @ResponseMessage('Refund processed')
  @ApiOperation({ summary: 'Admin: refund a captured Razorpay payment' })
  adminRefund(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: AdminAuthUser,
  ) {
    return this.orderService.adminRefund(orderId, dto, {
      id: user.sub,
      ip: '',
    });
  }
}

interface AdminOrdersQueryDto {
  limit?: number;
  offset?: number;
  page?: number;
  status?: string;
  userId?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}
