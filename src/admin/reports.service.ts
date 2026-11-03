import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../catalog/catalog.helpers';
import type { Decimal } from '@prisma/client-runtime-utils';

export interface SalesReport {
  date: string;
  orders: number;
  revenue: number;
}

export interface SalesReportResponse {
  sales: SalesReport[];
  totals: { orders: number; revenue: number };
  generatedAt: string;
}

export interface ReportsParams {
  fromDate: string;
  toDate: string;
}

export interface TopSellingProduct {
  id: string;
  name: string;
  sku: string;
  totalQuantity: number;
  totalRevenue: number;
  totalOrders: number;
  lastOrderedAt: Date | null;
}

export interface TopCustomer {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  orders: number;
}

export interface CustomerReport {
  region: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------- sales ---------------------------------

  async salesReport(params: ReportsParams) {
    const from = new Date(params.fromDate);
    const to = new Date(params.toDate);

    const aggregated = await this.prisma.order.groupBy({
      by: ['placedAt'],
      where: {
        placedAt: {
          gte: from,
          lte: to,
        },
        status: { notIn: ['cancelled', 'issue_reported'] },
        paymentStatus: 'captured',
      },
      _sum: {
        total: true,
      },
      orderBy: { placedAt: 'asc' },
    });

    const sales = aggregated.map((r) => ({
      date: r.placedAt.toISOString().slice(0, 10),
      orders: 1,
      revenue: toNumber(r._sum?.total ?? 0),
    }));

    return {
      sales,
      totals: {
        orders: sales.reduce((s, r) => s + r.orders, 0),
        revenue: sales.reduce((s, r) => s + r.revenue, 0),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async salesReportCsv(params: ReportsParams) {
    const data = await this.salesReport(params);
    const header = 'Date,Orders,Revenue';
    const rows = data.sales.map((r) =>
      `${r.date},${r.orders},${r.revenue.toFixed(2)}`,
    );
    const csv = [header, ...rows].join('\n');
    return { ...data, csv, csvHeader: header };
  }

  async salesSummary(adminId: string) {
    const from = new Date();
    const to = new Date();
    const startOfDay = new Date(from.setHours(0, 0, 0, 0));
    const endOfDay = new Date(to.setHours(23, 59, 59, 999));

    const [today, weekAgo, monthAgo, totals, lowStock] = await Promise.all([
      this.salesReportTotals({ fromDate: startOfDay.toISOString(), toDate: endOfDay.toISOString() }),
      this.salesReportTotals({ fromDate: new Date(Date.now() - 7 * 86400000).toISOString(), toDate: endOfDay.toISOString() }),
      this.salesReportTotals({ fromDate: new Date(Date.now() - 30 * 86400000).toISOString(), toDate: endOfDay.toISOString() }),
      this.totalSummary(),
      this.lowStockSummary(),
    ]);

    return {
      today: today,
      weekAgo: weekAgo,
      monthAgo: monthAgo,
      totals: totals,
      lowStockVariants: lowStock.count,
    };
  }

  async totalSummary() {
    const [orders, revenue] = await Promise.all([
      this.prisma.order.count({
        where: { status: { notIn: ['cancelled', 'issue_reported'] }, paymentStatus: 'captured' },
      }),
      this.prisma.order.aggregate({
        where: { status: { notIn: ['cancelled', 'issue_reported'] }, paymentStatus: 'captured' },
        _sum: { total: true },
      }),
    ]);
    return {
      totals: {
        orders: orders,
        revenue: toNumber(revenue._sum?.total ?? 0),
      },
    };
  }

  async lowStockSummary() {
    const count = await this.prisma.inventory.count({
      where: { status: { in: ['low_stock', 'out_of_stock'] } },
    });
    return { count };
  }

  // ------------------------------- exports ------------------------------

  async download(report: {
    type: string;
    accept: string;
    response: any;
    from?: string;
    to?: string;
  }) {
    const { type, accept, response, from, to } = report;
    let data: { csv: string; csvHeader: string };
    let contentType: 'text/csv' | 'application/json';

    if (type === 'sales') {
      data = await this.salesReportCsv({ fromDate: from ?? '', toDate: to ?? '' });
      contentType = 'text/csv';
      response.setHeader('Content-Type', 'text/csv');
      response.setHeader('Content-Disposition', 'attachment; filename="sales.csv"');
      response.end(data.csv);
      return;
    }

    if (type === 'revenue') {
      data = await this.revenueExportCsv({ fromDate: from ?? '', toDate: to ?? '' });
      contentType = 'text/csv';
      response.setHeader('Content-Type', 'text/csv');
      response.setHeader('Content-Disposition', 'attachment; filename="revenue.csv"');
      response.end(data.csv);
      return;
    }

    // fallback JSON report
    const dataJson = await this.salesReport({ fromDate: from ?? '', toDate: to ?? '' });
    contentType = 'application/json';
    response.setHeader('Content-Type', 'application/json');
    response.status(200).json({ ...dataJson, generatedAt: new Date().toISOString() });
  }

  async revenueExportCsv(params: ReportsParams) {
    const data = await this.salesReport(params);
    const header = 'Date,Orders,Revenue';
    const rows = data.sales.map((r) =>
      `${r.date},${r.orders},${r.revenue.toFixed(2)}`,
    );
    const csv = [header, ...rows].join('\n');
    return { csv, csvHeader: header };
  }

  async salesReportTotals(params: ReportsParams) {
    const from = new Date(params.fromDate);
    const to = new Date(params.toDate);

    const [orders, revenue] = await Promise.all([
      this.prisma.order.count({
        where: {
          placedAt: { gte: from, lte: to },
          status: { notIn: ['cancelled', 'issue_reported'] },
          paymentStatus: 'captured',
        },
      }),
      this.prisma.order.aggregate({
        where: { placedAt: { gte: from, lte: to }, status: { notIn: ['cancelled', 'issue_reported'] }, paymentStatus: 'captured' },
        _sum: { total: true },
      }),
    ]);

    return {
      orders,
      revenue: toNumber(revenue._sum?.total ?? 0),
    };
  }

  async salesSummaryCsv() {
    const data = await this.salesReport({ fromDate: '', toDate: '' });
    const header = 'Date,Orders,Revenue';
    const rows = data.sales.map((r) =>
      `${r.date},${r.orders},${r.revenue.toFixed(2)}`,
    );
    const csv = [header, ...rows].join('\n');
    return { csv, csvHeader: header };
  }
}
