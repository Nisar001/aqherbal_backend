import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../admin/audit.service';
import { CreateWishlistEntryDto, ListWishlistQueryDto } from './dto/wishlist.dto';
import { toNumber } from '../catalog/catalog.helpers';

export interface Actor {
  id: string;
  ip?: string;
}

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------- public ----------------------------------

  async getWishlist(userId: string, query: ListWishlistQueryDto) {
    const wishlist = await this.prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            basePrice: true,
            brand: true,
            isPrescriptionRequired: true,
            status: true,
            isDeleted: true,
            category: {
              select: { id: true, name: true, slug: true },
            },
            images: {
              orderBy: { position: 'asc' },
              take: 1,
              select: { url: true },
            },
            variants: {
              select: { price: true },
            },
          },
        },
      },
      take: query.limit ?? 20,
    });

    if (wishlist.length === 0) {
      return { data: [], message: 'Wishlist is empty' };
    }

    return {
      data: wishlist.map((entry) => this.toWishlistEntry(entry)),
      message: 'Wishlist fetched',
      pagination: {
        page: 1,
        limit: query.limit ?? 20,
        total: wishlist.length,
        totalPages: 1,
      },
    };
  }

  async addProduct(
    userId: string,
    dto: CreateWishlistEntryDto,
    actor: Actor,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, status: true, isDeleted: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.status !== 'active' || product.isDeleted) {
      throw new NotFoundException('Product is not available for wishlisting');
    }

    const entry = await this.prisma.wishlist.upsert({
      where: {
        userId_productId: {
          userId,
          productId: dto.productId,
        },
      },
      create: {
        userId,
        productId: dto.productId,
      },
      update: {},
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'wishlist.add',
      entity: 'Wishlist',
      entityId: entry.id,
      metadata: { productId: dto.productId },
      ipAddress: actor.ip,
    });

    return this.toWishlistEntry(entry);
  }

  async removeProduct(
    userId: string,
    productId: string,
    actor: Actor,
  ) {
    const entry = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
    if (!entry) {
      throw new NotFoundException('Product not in wishlist');
    }

    await this.prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'wishlist.remove',
      entity: 'Wishlist',
      entityId: entry.id,
      metadata: { productId },
      ipAddress: actor.ip,
    });

    return { data: { productId }, message: 'Product removed from wishlist' };
  }

  // -------------------------------- helpers --------------------------------

  private toWishlistEntry(entry: any) {
    const product = entry.product;
    const price = product.variants.length > 0 ? toNumber(product.variants[0].price) : 0;

    return {
      id: entry.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      sku: product.sku,
      price: price,
      brand: product.brand,
      category: product.category,
      image: product.images?.[0]?.url ?? null,
      isPrescriptionRequired: product.isPrescriptionRequired,
      status: product.status,
      createdAt: entry.createdAt,
    };
  }
}
