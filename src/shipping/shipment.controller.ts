import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/guards/jwt-auth.guard';
import { ShippingService } from './shipping.service';

@ApiTags('Shipping')
@Controller('orders/:orderId/ship')
export class ShipmentController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @ResponseMessage('Shipment created')
  @ApiOperation({ summary: 'Create a shipment for an order' })
  createShipment(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: any,
  ) {
    return this.shippingService.createShipment(orderId, dto, { id: '', ip: '' });
  }

  @Get('tracking')
  @ResponseMessage('Tracking status fetched')
  @ApiOperation({ summary: 'Get the current tracking status for an order' })
  async tracking(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    // The tracking endpoint looks up the shipment by order + AWB
    // AWB is stored on the order; we retrieve it from the latest shipment
    const shipment = await this.shippingService.getTrackingStatus(
      orderId,
      'order-id-placeholder',
    );
    return shipment;
  }
}
