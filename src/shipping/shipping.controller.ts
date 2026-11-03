import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/guards/jwt-auth.guard';
import { ShippingService } from './shipping.service';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // ------------------------------- public ----------------------------------

  @Get('rate-estimates')
  @ResponseMessage('Rate estimates fetched')
  @ApiOperation({ summary: 'Get shipping rate estimates for an Indian address' })
  async getRateEstimates(
    @Query('pincode') pincode: string,
    @Query('state') state: string,
    @Query('city') city: string,
    @Query('country') country: string,
    @Query('weightGrams') weightGrams: number,
  ) {
    const address = {
      pincode: pincode ?? '',
      state: state ?? '',
      city: city ?? '',
      line1: '',
      line2: undefined,
      country: country ?? 'India',
    } as any;

    const rates = await this.shippingService.getShippingRates(address, weightGrams ?? 250);

    return {
      data: rates,
      message: 'Rate estimates fetched',
    };
  }

  @Get('tracking/:awbNumber')
  @ResponseMessage('Tracking status fetched')
  @ApiOperation({ summary: 'Fetch tracking status by AWb number' })
  async getTrackingStatus(
    @Param('awbNumber') awbNumber: string,
  ) {
    // The AWB can be tied to an order; we look up the shipment
    // by AWB number across orders
    const shipment = await this.shippingService.getTrackingStatus(
      'order-id-placeholder',
      awbNumber,
    );
    return shipment;
  }
}

@ApiTags('Shipping')
@ApiBearerAuth()
@Controller('admin/shipments')
@Roles('admin')
export class AdminShipmentsController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  @ResponseMessage('Shipments fetched')
  @ApiOperation({ summary: 'List all shipments' })
  adminListShipments() {
    return this.shippingService.adminListShipments();
  }

  @Get(':id')
  @ResponseMessage('Shipment fetched')
  @ApiOperation({ summary: 'Get a specific shipment' })
  adminGetShipment(@Param('id', ParseUUIDPipe) id: string) {
    return this.shippingService.adminGetShipment(id);
  }
}
