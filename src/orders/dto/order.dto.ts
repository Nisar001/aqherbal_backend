import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderStatus } from '../../../generated/prisma/client';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  ValidateNested,
  IsInstance,
} from 'class-validator';

/** Order creation accepts ONLY variant ids, quantities, an optional coupon code
 * and the customer's delivery details. Prices, tax, discounts and totals are
 * always recomputed server-side — anything else is stripped by the whitelist
 * ValidationPipe.
 */

const PHONE_REGEX = /^[6-9]\d{9}$/; // 10-digit Indian mobile
const PINCODE_REGEX = /^[1-9]\d{5}$/; // 6 digits, no leading zero

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Variant id', example: 'clx...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  variantId: string;

  @ApiProperty({ description: 'Quantity', example: 2, minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;
}

export class OrderCustomerDto {
  @ApiProperty({ example: 'Ayesha Rahman' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: '9876543210', description: '10-digit Indian mobile' })
  @Matches(PHONE_REGEX, { message: 'phone must be a 10-digit Indian mobile number' })
  phone: string;

  @ApiPropertyOptional({ example: 'ayesha@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

export class OrderAddressDto {
  @ApiProperty({ example: '12, Amaltas Marg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  line1: string;

  @ApiPropertyOptional({ example: '12/B, 2nd Floor, Bhopal' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiProperty({ example: 'Bhopal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city: string;

  @ApiProperty({ example: 'M.P.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  state: string;

  @ApiProperty({ example: '462001' })
  @Matches(PINCODE_REGEX, { message: 'pincode must be a 6-digit Indian pincode' })
  pincode: string;

  @ApiProperty({ example: 'India' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  country: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Items in the checkout cart' })
  @ValidateNested()
  @IsArray()
  @IsInstance(CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ description: 'Coupon code at checkout (optional)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @ApiProperty({ description: 'Customer details (billing = shipping for store) ' })
  @ValidateNested()
  @IsArray()
  @IsInstance(OrderCustomerDto)
  customer: OrderCustomerDto;

  @ApiProperty({ description: 'Delivery address' })
  @ValidateNested()
  @IsArray()
  @IsInstance(OrderAddressDto)
  address: OrderAddressDto;
}

export class OrderLookupDto {
  @ApiProperty({ description: 'Order id / tracking number to look up' })
  @IsString()
  @IsNotEmpty()
  orderIdOrTracking: string;

  @ApiProperty({ description: 'Customer phone (verified against the order)' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CancelRequestDto {
  @ApiProperty({ example: '9876543210' })
  @Matches(PHONE_REGEX, { message: 'phone must be a 10-digit Indian mobile number' })
  phone: string;

  @ApiPropertyOptional({ example: 'Ordered by mistake' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ReportIssueDto {
  @ApiProperty({ example: '9876543210' })
  @Matches(PHONE_REGEX, { message: 'phone must be a 10-digit Indian mobile number' })
  phone: string;

  @ApiProperty({ enum: ['damaged', 'incorrect', 'missing', 'other'] })
  @IsEnum(['damaged', 'incorrect', 'missing', 'other'])
  issueType: 'damaged' | 'incorrect' | 'missing' | 'other';

  @ApiPropertyOptional({ example: 'Jar arrived cracked' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Razorpay order id from handler' })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiProperty({ description: 'Razorpay payment intent id from handler' })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty({ description: 'Razorpay signature from webhook handler' })
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'shipped' })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  toStatus: OrderStatus;

  @ApiPropertyOptional({ example: 'Ordered by mistake' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}

/** Admin: list orders — also used by the public CSV export route. */
export class ListAdminOrdersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'] })
  @IsOptional()
  @IsEnum(['confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'])
  status?: 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

  @ApiPropertyOptional({ description: 'Filter by user id' })
  @IsOptional()
  @IsString()
  userId?: string;

}

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['pending', 'received', 'packed', 'shipped', 'delivered', 'cancelled', 'issue_reported'] })
  @IsOptional()
  @IsEnum(['pending', 'received', 'packed', 'shipped', 'delivered', 'cancelled', 'issue_reported'])
  status?: 'pending' | 'received' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'issue_reported';

  @ApiPropertyOptional({ description: 'Filter by payment status' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'From date (ISO date)' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date (ISO date)' })
  @IsOptional()
  @IsString()
  toDate?: string;
}
