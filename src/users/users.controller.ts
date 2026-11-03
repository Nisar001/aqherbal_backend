import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import type { AuthUser } from '../common/guards/jwt-auth.guard';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user profile' })
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user.sub);
  }

  @Patch('me')
  @ResponseMessage('Profile updated')
  @ApiOperation({ summary: 'Update the current user profile' })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.sub, dto);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'List my addresses' })
  listAddresses(@CurrentUser() user: AuthUser) {
    return this.usersService.listAddresses(user.sub);
  }

  @Post('me/addresses')
  @ResponseMessage('Address added')
  @ApiOperation({ summary: 'Add an address' })
  createAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(user.sub, dto);
  }

  @Patch('me/addresses/:id')
  @ResponseMessage('Address updated')
  @ApiOperation({ summary: 'Update one of my addresses' })
  updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.sub, id, dto);
  }

  @Delete('me/addresses/:id')
  @ResponseMessage('Address deleted')
  @ApiOperation({ summary: 'Delete one of my addresses' })
  deleteAddress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deleteAddress(user.sub, id);
  }
}
