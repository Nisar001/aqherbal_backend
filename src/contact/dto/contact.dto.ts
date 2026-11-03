import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Free-text fields are size-limited here and HTML-stripped in the service
 * before storage (defence against stored XSS in the admin inbox).
 */

export class CreateContactDto {
  @ApiProperty({ example: 'Ayesha Rahman' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'ayesha@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ enum: ['order', 'product', 'delivery', 'returns', 'other'] })
  @Matches(/^(order|product|delivery|returns|other)$/, {
    message: 'topic must be one of: order, product, delivery, returns, other',
  })
  topic: 'order' | 'product' | 'delivery' | 'returns' | 'other';

  @ApiProperty({ example: 'My jar arrived with a loose lid.' })
  @IsString()
  @MaxLength(3000)
  message: string;

  /**
   * Honeypot — real users never fill this hidden field. When present the
   * request is accepted but silently dropped (bot sees success).
   */
  @ApiPropertyOptional({ description: 'Honeypot field — leave empty' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class SubscribeDto {
  @ApiProperty({ example: 'ayesha@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiPropertyOptional({ description: 'Honeypot field — leave empty' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
