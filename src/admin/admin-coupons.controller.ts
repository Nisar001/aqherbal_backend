import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { CouponService } from '../coupon/coupon.service';
import { CreateAdminCouponDto, UpdateAdminCouponDto } from '../coupon/dto/admin-coupon.dto';
import { ListAdminCouponsQueryDto } from '../coupon/dto/admin-coupon.dto';
import type { AuthUser as AdminAuthUser } from '../common/guards/jwt-auth.guard';

@ApiTags('Coupons')
@ApiBearerAuth()
@Controller('admin/coupons')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class AdminCouponsController {
  constructor(
    private readonly couponService: CouponService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ResponseMessage('Coupons fetched')
  @ApiOperation({ summary: 'Admin: list all coupons' })
  adminList(@Query() query: ListAdminCouponsQueryDto) {
    this.audit.log({
      adminId: 'admin',
      action: 'ADMIN_COUPON_LIST',
      entity: 'coupons',
      metadata: { ...query },
    });
    return this.couponService.adminList(query);
  }

  @Post()
  @ResponseMessage('Coupon created')
  @ApiOperation({ summary: 'Admin: create a coupon' })
  adminCreate(
    @Body() dto: CreateAdminCouponDto,
    @CurrentUser() user: AdminAuthUser,
  ) {
    this.audit.log({
      adminId: user.sub,
      action: 'ADMIN_COUPON_CREATE',
      entity: 'coupons',
      metadata: { code: dto.code, value: dto.value },
    });
    return this.couponService.adminCreate(dto, { id: user.sub, ip: '' });
  }

  @Put(':id')
  @ResponseMessage('Coupon updated')
  @ApiOperation({ summary: 'Admin: update a coupon' })
  adminUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminCouponDto,
    @CurrentUser() user: AdminAuthUser,
  ) {
    this.audit.log({
      adminId: user.sub,
      action: 'ADMIN_COUPON_UPDATE',
      entity: 'coupons',
      entityId: id,
      metadata: { ...dto },
    });
    return this.couponService.adminUpdate(id, dto, { id: user.sub, ip: '' });
  }

  @Delete(':id')
  @ResponseMessage('Coupon deleted')
  @ApiOperation({ summary: 'Admin: delete a coupon' })
  adminDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AdminAuthUser,
  ) {
    this.audit.log({
      adminId: user.sub,
      action: 'ADMIN_COUPON_DELETE',
      entity: 'coupons',
      entityId: id,
    });
    return this.couponService.adminDelete(id, { id: user.sub, ip: '' });
  }
}
