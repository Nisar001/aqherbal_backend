import { Module } from '@nestjs/common';
import { AdminCouponsController } from '../admin/admin-coupons.controller';
import { PublicCouponController } from './public-coupon.controller';
import { CouponService } from './coupon.service';
import { AdminModule } from '../admin/admin.module'; // for AuditService

@Module({
  imports: [AdminModule],
  controllers: [AdminCouponsController, PublicCouponController],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}
