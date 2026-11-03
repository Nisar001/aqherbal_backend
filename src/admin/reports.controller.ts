import {
  Controller,
  Get,
  Query,
  Res,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('Admin — Reports')
@ApiBearerAuth()
@Controller('admin/reports')
@Roles('admin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('download')
  @ResponseMessage('Report downloaded')
  @ApiOperation({ summary: 'Admin: download a CSV report' })
  async downloadReport(
    @Headers('accept') accept: string,
    @Query() query: { type: string },
    @Res() res: any,
  ) {
    const { type } = query;
    const contentType = accept.includes('csv') ? 'text/csv' : 'application/json';
    return this.reportsService.download({
      type,
      accept: contentType,
      response: res,
    });
  }

  @Get('sales-summary')
  @ResponseMessage('Sales summary fetched')
  @ApiOperation({ summary: 'Admin: fetch sales summary' })
  salesSummary(@CurrentUser() user: AuthUser) {
    return this.reportsService.salesSummary(user.sub);
  }

  @Get('revenue-export')
  @ResponseMessage('Revenue export fetched')
  @ApiOperation({ summary: 'Admin: revenue export (CSV)' })
  revenueExport(@Query() query: { from?: string; to?: string }, @Res() res: any) {
    return this.reportsService.download({ type: 'revenue', accept: 'text/csv', response: res, from: query.from ?? '', to: query.to ?? '' });
  }
}
