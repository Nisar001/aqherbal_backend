import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ListAdminCouponsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by code (partial, case-insensitive)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  search?: string;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'] })
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  discountType?: 'percentage' | 'fixed';

  @ApiPropertyOptional({ description: 'Only include coupons that have remaining usage' })
  @IsOptional()
  @IsBoolean()
  hasUsage?: boolean;
}

export class CreateAdminCouponDto {
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

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'], default: 'percentage' })
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  discountType?: 'percentage' | 'fixed' = 'percentage';

  @ApiPropertyOptional({ description: 'Minimum order value to use this coupon', example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderValue?: number = 0;

  @ApiPropertyOptional({ description: 'Maximum discount cap', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @ApiProperty({ description: 'When the coupon expires (ISO date)' })
  @IsString()
  @MinLength(10)
  @MaxLength(30)
  expiresAt: string;

  @ApiPropertyOptional({ description: 'How many times the coupon can be used', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Restrict to specific users (comma separated user ids)', example: 'uuid1,uuid2' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  userIds?: string;

  @ApiPropertyOptional({ description: 'Maximum times one user can use this coupon', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPerUser?: number = 1;

  @ApiPropertyOptional({ description: 'Optional description of the coupon', example: '20% off on orders above ₹500' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateAdminCouponDto {
  @ApiPropertyOptional({ example: 'SUMMER20' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  value?: number;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'] })
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  discountType?: 'percentage' | 'fixed';

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'New expiry date (ISO date)' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(30)
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'How many times the coupon can be used', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Restrict to specific users (comma separated user ids)', example: 'uuid1,uuid2' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  userIds?: string;

  @ApiPropertyOptional({ description: 'Maximum times one user can use this coupon', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPerUser?: number;

  @ApiPropertyOptional({ description: 'Replace existing users restriction entirely' })
  @IsOptional()
  @IsBoolean()
  replaceUsers?: boolean;

  @ApiPropertyOptional({ description: 'Deactivate the coupon instead of deleting it' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Optional description of the coupon', example: '20% off on orders above ₹500' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
