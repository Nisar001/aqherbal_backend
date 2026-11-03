import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateWishlistEntryDto {
  @ApiProperty({ description: 'Product id to add to the wishlist', example: 'p-1' })
  @IsString()
  productId: string;
}

export class UpdateWishlistEntryDto {
  @ApiProperty({ description: 'If true, remove the product from the wishlist', example: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  remove?: boolean = false;
}

export class ListWishlistQueryDto {
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
