import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../admin/audit.service';
import { Actor } from './categories.service';
import { computeInventoryStatus } from './catalog.helpers';
import { UpdateInventoryDto } from './dto/inventory.dto';

export interface InventoryListQuery {
  page?: number;
  limit?: number;
  category?: string;
  inStock?: boolean;
  sku?: string;
}

export interface InventoryVariant {
  variantId: string;
  sku: string;
  variantName: string;
  price: number;
  product: { id: string; name: string; slug: string; status: string };
  quantity: number;
  lowStockThreshold: number;
  status: string;
  updatedAt: Date;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async updateStock(variantId: string, dto: UpdateInventoryDto, actor: Actor) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        inventory: true,
        product: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    const lowStockThreshold =
      dto.lowStockThreshold ?? variant.inventory?.lowStockThreshold ?? 10;
    const status = computeInventoryStatus(dto.quantity, lowStockThreshold);

    const inventory = await this.prisma.inventory.upsert({
      where: { variantId },
      create: { variantId, quantity: dto.quantity, lowStockThreshold, status },
      update: { quantity: dto.quantity, lowStockThreshold, status },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'inventory.update',
      entity: 'Inventory',
      entityId: variantId,
      metadata: {
        sku: variant.sku,
        product: variant.product.slug,
        quantity: dto.quantity,
        lowStockThreshold,
        status,
      },
      ipAddress: actor.ip,
    });

    return {
      data: {
        variantId,
        sku: variant.sku,
        quantity: inventory.quantity,
        lowStockThreshold: inventory.lowStockThreshold,
        status: inventory.status,
        updatedAt: inventory.updatedAt,
      },
      message: 'Inventory updated',
    };
  }

  async lowStock() {
    const items = await this.prisma.inventory.findMany({
      where: { status: { in: ['low_stock', 'out_of_stock'] } },
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, status: true },
            },
          },
        },
      },
      orderBy: [{ quantity: 'asc' }, { updatedAt: 'desc' }],
    });

    return {
      data: items.map((item) => ({
        variantId: item.variantId,
        sku: item.variant.sku,
        variantName: item.variant.name,
        price: Number(item.variant.price),
        product: item.variant.product,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
        status: item.status,
        updatedAt: item.updatedAt,
      })),
      message: 'Low stock items fetched',
    };
  }

  async list(query: InventoryListQuery = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where: any = { ...query };
    if (query.inStock === true) {
      where.status = 'in_stock';
    } else if (query.inStock === false) {
      where.status = { in: ['low_stock', 'out_of_stock'] };
    }

    const items = await this.prisma.inventory.findMany({
      where,
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, status: true },
            },
          },
        },
      },
      orderBy: [{ quantity: 'asc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.inventory.count({ where });

    return {
      data: items.map((item) => ({
        variantId: item.variantId,
        sku: item.variant.sku,
        variantName: item.variant.name,
        price: Number(item.variant.price),
        product: item.variant.product,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
        status: item.status,
        updatedAt: item.updatedAt,
      })),
      message: 'Inventory fetched',
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async get(variantId: string) {
    const item = await this.prisma.inventory.findUnique({
      where: { variantId },
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, status: true },
            },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Inventory variant not found');

    return {
      data: {
        variantId: item.variantId,
        sku: item.variant.sku,
        variantName: item.variant.name,
        price: Number(item.variant.price),
        product: item.variant.product,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
        status: item.status,
        updatedAt: item.updatedAt,
      },
      message: 'Inventory variant fetched',
    };
  }
}
