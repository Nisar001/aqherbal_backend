import { Controller, Post, Body, HttpCode, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CouponService } from './coupon.service';
import { ValidateCouponDto } from './dto/coupon.dto';

@ApiTags('Coupons')
@Controller('coupons')
export class PublicCouponController {
  constructor(private readonly couponService: CouponService) {}

  /**
   * Public cart validation. Returns ONLY the discount rate/amount for the
   * submitted code — never the coupon list (prevents enumeration).
   */
  @Public()
  @Post('validate')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ResponseMessage('Coupon validated')
  @ApiOperation({ summary: 'Validate a coupon code for a cart subtotal' })
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponService.validateForCart(dto);
  }
}
