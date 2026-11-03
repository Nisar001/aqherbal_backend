import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Writes an audit trail entry for every admin write action
 * (required by the plan's non-functional/security section).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    adminId: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await this.prisma.adminActivityLog.create({
        data: {
          adminId: params.adminId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          metadata: (params.metadata ?? undefined) as
            Prisma.InputJsonValue | undefined,
          ipAddress: params.ipAddress,
        },
      });
    } catch (err) {
      // Audit must never break the main flow
      this.logger.error(
        `Failed to write audit log (${params.action} ${params.entity}): ${(err as Error).message}`,
      );
    }
  }
}
