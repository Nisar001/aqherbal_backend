import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Hair Care' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ description: 'Generated from name when omitted' })
  @IsOptional()
  @Matches(SLUG_PATTERN, {
    message: 'slug must be lowercase kebab-case (a-z, 0-9, hyphens)',
  })
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional({ description: 'Category image URL' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Parent category id (subcategories)' })
  @IsOptional()
  parentId?: string | null;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(SLUG_PATTERN, {
    message: 'slug must be lowercase kebab-case (a-z, 0-9, hyphens)',
  })
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Parent category id, or null to make it a root category',
  })
  @IsOptional()
  parentId?: string | null;
}
