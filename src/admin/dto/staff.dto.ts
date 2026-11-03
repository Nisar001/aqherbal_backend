import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Staff Member' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'staff@aqherbal.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Secret@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiPropertyOptional({ enum: ['staff', 'admin'], default: 'staff' })
  @IsOptional()
  @IsIn(['staff', 'admin'])
  role?: 'staff' | 'admin';
}

export class UpdateStaffRolesDto {
  @ApiProperty({ enum: ['customer', 'staff', 'admin'] })
  @IsIn(['customer', 'staff', 'admin'])
  role: 'customer' | 'staff' | 'admin';
}
