import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';

export class CartItemDto {
  @ApiProperty({ description: 'Variant id to add to the cart', example: 'v-1' })
  @IsString()
  variantId: string;

  @ApiPropertyOptional({ description: 'Quantity to add', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}

export class UpdateCartItemDto {
  @ApiPropertyOptional({ description: 'New quantity', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class ApplyCouponDto {
  @ApiProperty({ description: 'Coupon code' })
  @IsString()
  @IsString()
  code: string;
}

export class RemoveCouponDto {
  @ApiProperty({ description: 'Reason for removing the coupon' })
  @IsString()
  reason?: string;
}

export class ListCartItemsQueryDto {
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
