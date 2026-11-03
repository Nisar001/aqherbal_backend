import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: '12, MG Road' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  line1: string;

  @ApiPropertyOptional({ example: 'Flat 4B, Sunrise Apartments' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  line2?: string;

  @ApiProperty({ example: 'Pune' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  state: string;

  @ApiProperty({ example: '411001' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pincode must be a 6-digit Indian pincode' })
  pincode: string;

  @ApiPropertyOptional({ enum: ['home', 'work', 'other'], default: 'home' })
  @IsOptional()
  @IsIn(['home', 'work', 'other'])
  type?: 'home' | 'work' | 'other';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: '12, MG Road' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  line1?: string;

  @ApiPropertyOptional({ example: 'Flat 4B, Sunrise Apartments' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  line2?: string;

  @ApiPropertyOptional({ example: 'Pune' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  state?: string;

  @ApiPropertyOptional({ example: '411001' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pincode must be a 6-digit Indian pincode' })
  pincode?: string;

  @ApiPropertyOptional({ enum: ['home', 'work', 'other'] })
  @IsOptional()
  @IsIn(['home', 'work', 'other'])
  type?: 'home' | 'work' | 'other';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
