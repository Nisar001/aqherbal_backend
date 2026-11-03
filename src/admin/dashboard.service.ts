import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { toNumber } from '../catalog/catalog.helpers';
import type { Decimal } from '@prisma/client-runtime-utils';

export interface AdminDashboardSummary {
  today: {
    orders: number;
    revenue: number;
    pendingOrders: number;
    pendingPayments: number;
  };
  week: { orders: number; revenue: number };
  month: { orders: number; revenue: number };
  totals: {
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    totalProducts: number;
    totalActiveUsers: number;
    totalLowStockVariants: number;
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------- public ------------------------------

  async getSummary(adminId: string = 'admin', res?: any) {
    if (res) {
      // Stream the admin dashboard JSON as downloadable report
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="dashboard.json"');
      res.end(JSON.stringify(await this.aggregate(), null, 2));
      return;
    }
    // Today's summary (UTC date — replace with IST if needed)
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const [todayOrders, todayRevenue, pendingOrders, pendingPayments,
           weekOrders, weekRevenue, monthOrders, monthRevenue,
           totalOrders, totalRevenue, totalCustomers, totalProducts,
           totalActiveUsers, totalLowStock] = await Promise.all([
      this.prisma.order.count({ where: { placedAt: { gte: startOfDay, lte: endOfDay } } }),
      this.prisma.order.aggregate({ where: { placedAt: { gte: startOfDay, lte: endOfDay }, paymentStatus: 'captured' }, _sum: { total: true } }),
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.order.count({ where: { paymentStatus: 'pending' } }),
      this.prisma.order.count({ where: { placedAt: { gte: new Date(Date.now() - 7 * 86400000), lte: endOfDay } } }),
      this.prisma.order.aggregate({ where: { placedAt: { gte: new Date(Date.now() - 7 * 86400000), lte: endOfDay }, paymentStatus: 'captured' }, _sum: { total: true } }),
      this.prisma.order.count({ where: { placedAt: { gte: new Date(Date.now() - 30 * 86400000), lte: endOfDay } } }),
      this.prisma.order.aggregate({ where: { placedAt: { gte: new Date(Date.now() - 30 * 86400000), lte: endOfDay }, paymentStatus: 'captured' }, _sum: { total: true } }),
      this.prisma.order.count({ where: { paymentStatus: 'captured', status: { notIn: ['cancelled', 'issue_reported'] } } }),
      this.prisma.order.aggregate({ where: { paymentStatus: 'captured', status: { notIn: ['cancelled', 'issue_reported'] } }, _sum: { total: true } }),
      this.prisma.user.count({ where: { isActive: true, role: 'customer' } }),
      this.prisma.product.count({ where: { status: 'active' } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.inventory.count({ where: { status: { in: ['low_stock', 'out_of_stock'] } } }),
    ]);

    return {
      today: { orders: todayOrders, revenue: toNumber(todayRevenue._sum?.total ?? 0), pendingOrders, pendingPayments },
      week: { orders: weekOrders, revenue: toNumber(weekRevenue._sum?.total ?? 0) },
      month: { orders: monthOrders, revenue: toNumber(monthRevenue._sum?.total ?? 0) },
      totals: { totalOrders, totalRevenue: toNumber(totalRevenue._sum?.total ?? 0), totalCustomers, totalProducts, totalActiveUsers, totalLowStock },
    } as unknown as AdminDashboardSummary;
  }

  /** Aggregate the full admin dashboard — used to stream the JSON export. */
  async aggregate() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const monthAgo = new Date(Date.now() - 30 * 86400000);

    const [todayOrders, todayRevenue, pendingOrders, pendingPayments,
           weekOrders, weekRevenue, monthOrders, monthRevenue,
           totalOrders, totalRevenue, totalCustomers, totalProducts,
           totalActiveUsers, totalLowStock] = await Promise.all([
      this.prisma.order.count({ where: { placedAt: { gte: startOfDay, lte: endOfDay } } }),
      this.prisma.order.aggregate({ where: { placedAt: { gte: startOfDay, lte: endOfDay }, paymentStatus: 'captured' }, _sum: { total: true } }),
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.order.count({ where: { paymentStatus: 'pending' } }),
      this.prisma.order.count({ where: { placedAt: { gte: weekAgo, lte: endOfDay } } }),
      this.prisma.order.aggregate({ where: { placedAt: { gte: weekAgo, lte: endOfDay }, paymentStatus: 'captured' }, _sum: { total: true } }),
      this.prisma.order.count({ where: { placedAt: { gte: monthAgo, lte: endOfDay } } }),
      this.prisma.order.aggregate({ where: { placedAt: { gte: monthAgo, lte: endOfDay }, paymentStatus: 'captured' }, _sum: { total: true } }),
      this.prisma.order.count({ where: { paymentStatus: 'captured', status: { notIn: ['cancelled', 'issue_reported'] } } }),
      this.prisma.order.aggregate({ where: { paymentStatus: 'captured', status: { notIn: ['cancelled', 'issue_reported'] } }, _sum: { total: true } }),
      this.prisma.user.count({ where: { isActive: true, role: 'customer' } }),
      this.prisma.product.count({ where: { status: 'active' } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.inventory.count({ where: { status: { in: ['low_stock', 'out_of_stock'] } } }),
    ]);

    return {
      today: { orders: todayOrders, revenue: toNumber(todayRevenue._sum?.total ?? 0), pendingOrders, pendingPayments },
      week: { orders: weekOrders, revenue: toNumber(weekRevenue._sum?.total ?? 0) },
      month: { orders: monthOrders, revenue: toNumber(monthRevenue._sum?.total ?? 0) },
      totals: { totalOrders, totalRevenue: toNumber(totalRevenue._sum?.total ?? 0), totalCustomers, totalProducts, totalActiveUsers, totalLowStock },
    } as unknown as AdminDashboardSummary;
  }
}
