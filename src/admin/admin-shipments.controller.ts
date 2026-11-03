import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { ShippingService } from '../shipping/shipping.service';

/** Admin shipments — requires a super-admin token. */
@ApiTags('Shipping')
@ApiBearerAuth()
@Controller('admin/shipments')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class AdminShipmentsController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ResponseMessage('Shipments fetched')
  @ApiOperation({ summary: 'Admin: list all shipments' })
  adminListShipments() {
    this.audit.log({ adminId: 'admin', action: 'ADMIN_SHIPMENT_LIST', entity: 'shipments' });
    return this.shippingService.adminListShipments();
  }

  @Get(':id')
  @ResponseMessage('Shipment fetched')
  @ApiOperation({ summary: 'Admin: get a specific shipment' })
  adminGetShipment(@Param('id', ParseUUIDPipe) id: string) {
    this.audit.log({ adminId: 'admin', action: 'ADMIN_SHIPMENT_GET', entity: 'shipments', entityId: id });
    return this.shippingService.adminGetShipment(id);
  }
}
