import { Controller, Get, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/guards/jwt-auth.guard';
import { ActivityLogService } from './activity-log.service';

@ApiTags('Admin — Activity Logs')
@ApiBearerAuth()
@Controller('admin/activity-logs')
@UseGuards() // Roles enforced by the global RolesGuard
@Roles('admin')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ResponseMessage('Activity logs fetched')
  @ApiOperation({ summary: 'Admin: list activity logs' })
  list(@Query() query: ListActivityLogsQuery, @CurrentUser() user: AuthUser) {
    return this.activityLogService.adminList({ ...query, adminId: user.sub });
  }

  @Get(':id')
  @ResponseMessage('Activity log fetched')
  @ApiOperation({ summary: 'Admin: get a specific activity log' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.activityLogService.adminGet(id);
  }
}

interface ListActivityLogsQuery {
  page?: number;
  limit?: number;
  action?: string;
}
