import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

export interface Actor {
  id: string;
  ip?: string;
}

export interface ListActivityLogsQuery {
  page?: number;
  limit?: number;
  search?: string;
  entity?: string;
  action?: string;
  adminId?: string;
  fromDate?: string;
  toDate?: string;
}

@Injectable()
export class ActivityLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------- admin ---------------------------------

  async adminList(query: ListActivityLogsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = {};

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' as const } },
        { entity: { contains: query.search, mode: 'insensitive' as const } },
        { metadata: { path: ['message'], equals: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.entity) {
      where.entity = query.entity;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.adminId) {
      where.adminId = query.adminId;
    }
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.adminActivityLog.count({ where }),
      this.prisma.adminActivityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      }),
    ]);

    return {
      data: logs.map((l) => this.toAdminActivityLog(l)),
      message: 'Activity logs fetched',
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminGet(id: string) {
    const log = await this.prisma.adminActivityLog.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
    if (!log) throw new NotFoundException('Activity log entry not found');

    return {
      data: this.toAdminActivityLog(log),
      message: 'Activity log fetched',
    };
  }

  // ------------------------------- helpers ------------------------------

  private toAdminActivityLog(l: any) {
    return {
      id: l.id,
      adminId: l.adminId,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      metadata: l.metadata,
      ipAddress: l.ipAddress,
      adminName: l.admin?.name,
      adminEmail: l.admin?.email,
      adminRole: l.admin?.role,
      adminActive: l.admin?.isActive,
      createdAt: l.createdAt,
    };
  }
}
