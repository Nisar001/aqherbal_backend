import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max, MaxLength, MinLength, IsIn, IsBoolean, Matches } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ description: 'Coupon code (case-insensitive)', example: 'RITUAL10' })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code: string;

  @ApiPropertyOptional({ description: 'Cart subtotal in paise (integer)', example: 196000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  subtotalPaise?: number;
}

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  code: string;

  @ApiProperty({ description: 'Percentage or fixed amount discount', example: 20 })
  @IsInt()
  @Min(0)
  @Max(10000)
  value: number;

  @ApiPropertyOptional({ description: 'percentage or fixed', enum: ['percentage', 'fixed'] })
  @IsOptional()
  @IsString()
  @IsIn(['percentage', 'fixed'])
  discountType: 'percentage' | 'fixed' = 'percentage';

  @ApiPropertyOptional({ description: 'Minimum order value to use this coupon', example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderValue?: number = 0;

  @ApiPropertyOptional({ description: 'Maximum discount cap', example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @ApiProperty({ description: 'When the coupon expires (ISO date)' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'How many times the coupon can be used', example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Restrict to specific categories (comma separated slug list)', example: 'skincare,hair-care' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  categorySlugs?: string;

  @ApiPropertyOptional({ description: 'Restrict to specific product SKUs', example: 'AQ-10001,AQ-10002' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  productSkus?: string;

  @ApiPropertyOptional({ description: 'Restrict to specific users (comma separated user ids)', example: 'uuid1,uuid2' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  userIds?: string;

  @ApiPropertyOptional({ description: 'Maximum number of times a single cart can use this coupon', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerUser?: number = 1;

  @ApiPropertyOptional({ description: 'Optional description of the coupon', example: '20% off on orders above ₹500' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateCouponDto {
  @ApiPropertyOptional({ example: 'SUMMER20' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  value?: number;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'] })
  @IsOptional()
  @IsString()
  @IsIn(['percentage', 'fixed'])
  discountType?: 'percentage' | 'fixed';

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'New expiry date (ISO date)' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ example: 'skincare,hair-care' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  categorySlugs?: string;

  @ApiPropertyOptional({ example: 'AQ-10001,AQ-10002' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  productSkus?: string;

  @ApiPropertyOptional({ example: 'uuid1,uuid2' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  userIds?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerUser?: number;

  @ApiPropertyOptional({ description: 'Deactivate the coupon instead of deleting it', default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
