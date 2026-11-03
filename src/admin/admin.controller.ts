import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { ListUsersQueryDto, UpdateUserStatusDto } from './dto/admin-user.dto';
import { CreateStaffDto, UpdateStaffRolesDto } from './dto/staff.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ---------------------------------- users ---------------------------------

  @Get('users')
  @ApiOperation({ summary: 'List users with filtering + pagination' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get a user by id' })
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Block / unblock a user' })
  updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.adminService.updateUserStatus(id, dto.isActive ?? false, {
      id: actor.sub,
    });
  }

  // ---------------------------------- staff ---------------------------------

  @Get('staff')
  @ApiOperation({ summary: 'List staff / sub-admin accounts' })
  listStaff() {
    return this.adminService.listStaff();
  }

  @Post('staff')
  @ResponseMessage('Staff account created')
  @ApiOperation({ summary: 'Create a staff / sub-admin account' })
  createStaff(@Body() dto: CreateStaffDto, @CurrentUser() actor: AuthUser) {
    return this.adminService.createStaff(dto, { id: actor.sub });
  }

  @Patch('staff/:id/roles')
  @ApiOperation({ summary: 'Assign a role to a staff account' })
  updateStaffRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffRolesDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.adminService.updateStaffRoles(id, dto.role, { id: actor.sub });
  }
}
