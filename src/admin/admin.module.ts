import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { ActivityLogController } from './activity-log.controller';
import { DashboardController } from './dashboard.controller';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ActivityLogService } from './activity-log.service';
import { DashboardService } from './dashboard.service';
import { AuditService } from './audit.service';
import { AdminService } from './admin.service';

/** Super-admin module — every admin-only controller lives here. */
@Module({
  imports: [AuthModule],
  controllers: [
    AdminController,
    ActivityLogController,
    DashboardController,
    ReportsController,
  ],
  providers: [
    ReportsService,
    ActivityLogService,
    DashboardService,
    AuditService,
    AdminService,
  ],
  exports: [AuditService],
})
export class AdminModule {}
