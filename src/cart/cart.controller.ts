import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/guards/jwt-auth.guard';
import { CartService } from './cart.service';
import {
  CartItemDto,
  UpdateCartItemDto,
  ApplyCouponDto,
  RemoveCouponDto,
  ListCartItemsQueryDto,
} from './dto/cart.dto';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ResponseMessage('Cart fetched')
  @ApiOperation({ summary: 'Get the current user cart' })
  getCart(@CurrentUser() user: AuthUser, @Query() query: ListCartItemsQueryDto) {
    return this.cartService.getCart(user.sub, query);
  }

  @Post('items')
  @ResponseMessage('Item added to cart')
  @ApiOperation({ summary: 'Add a product variant to the cart' })
  addItem(
    @CurrentUser() user: AuthUser,
    @Body() dto: CartItemDto,
  ) {
    return this.cartService.addItem(user.sub, dto, { id: user.sub, ip: '' });
  }

  @Patch('items/:id')
  @ResponseMessage('Cart item updated')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.sub, id, dto, { id: user.sub, ip: '' });
  }

  @Delete('items/:id')
  @ResponseMessage('Cart item removed')
  @ApiOperation({ summary: 'Remove a cart item' })
  removeItem(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cartService.removeItem(user.sub, id, { id: user.sub, ip: '' });
  }

  @Post('apply-coupon')
  @ResponseMessage('Coupon applied')
  @ApiOperation({ summary: 'Apply a coupon code to the cart' })
  applyCoupon(
    @CurrentUser() user: AuthUser,
    @Body() dto: ApplyCouponDto,
  ) {
    return this.cartService.applyCoupon(user.sub, dto, { id: user.sub, ip: '' });
  }

  @Delete('remove-coupon')
  @ResponseMessage('Coupon removed')
  @ApiOperation({ summary: 'Remove the applied coupon' })
  removeCoupon(
    @CurrentUser() user: AuthUser,
    @Body() dto: RemoveCouponDto,
  ) {
    return this.cartService.removeCoupon(user.sub, dto, { id: user.sub, ip: '' });
  }
}
