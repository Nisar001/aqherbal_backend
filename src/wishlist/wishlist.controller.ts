import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import type { AuthUser } from '../common/guards/jwt-auth.guard';
import { WishlistService } from './wishlist.service';
import {
  CreateWishlistEntryDto,
  UpdateWishlistEntryDto,
  ListWishlistQueryDto,
} from './dto/wishlist.dto';

@ApiTags('Wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ResponseMessage('Wishlist fetched')
  @ApiOperation({ summary: 'Get the current user wishlist' })
  getWishlist(@CurrentUser() user: AuthUser, @Query() query: ListWishlistQueryDto) {
    return this.wishlistService.getWishlist(user.sub, query);
  }

  @Post()
  @ResponseMessage('Product added to wishlist')
  @ApiOperation({ summary: 'Add a product to the wishlist (creates or no-op if already present)' })
  addProduct(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWishlistEntryDto,
  ) {
    return this.wishlistService.addProduct(user.sub, dto, { id: user.sub, ip: '' });
  }

  @Delete(':productId')
  @ResponseMessage('Product removed from wishlist')
  @ApiOperation({ summary: 'Remove a product from the wishlist' })
  removeProduct(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeProduct(user.sub, productId, { id: user.sub, ip: '' });
  }
}
