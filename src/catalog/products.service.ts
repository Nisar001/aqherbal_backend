import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Prisma, Product } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../admin/audit.service';
import { StorageService } from '../storage/storage.service';
import type { Actor } from './categories.service';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  computeInventoryStatus,
  imageExtension,
  randomSkuSuffix,
  slugify,
  toNumber,
} from './catalog.helpers';
import {
  AdminListProductsQueryDto,
  CreateProductDto,
  CreateVariantDto,
  ListProductsQueryDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './dto/product.dto';

export const MAX_IMAGES_PER_PRODUCT = 10;

/** Prisma `where` for the public storefront listing. Exported for tests. */
export function buildProductWhere(
  query: ListProductsQueryDto,
): Prisma.ProductWhereInput {
  const search = query.search?.trim();
  return {
    status: 'active',
    isDeleted: false,
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.brand
      ? { brand: { equals: query.brand, mode: 'insensitive' } }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            { brand: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          variants: {
            some: {
              price: {
                ...(query.minPrice !== undefined
                  ? { gte: query.minPrice }
                  : {}),
                ...(query.maxPrice !== undefined
                  ? { lte: query.maxPrice }
                  : {}),
              },
            },
          },
        }
      : {}),
  };
}

const SORT_ORDER: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  price_asc: { basePrice: 'asc' },
  price_desc: { basePrice: 'desc' },
  rating: { rating: 'desc' },
};

const LIST_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { position: 'asc' as const }, take: 1 },
  variants: {
    select: {
      price: true,
      inventory: { select: { quantity: true } },
    },
  },
};

const DETAIL_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { position: 'asc' as const } },
  variants: {
    orderBy: { createdAt: 'asc' as const },
    include: { inventory: true },
  },
};

interface ListProductRecord {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  brand: string | null;
  hsnCode: string | null;
  basePrice: unknown;
  taxPercent: unknown;
  rating: unknown;
  isPrescriptionRequired: boolean;
  status: 'draft' | 'active' | 'archived';
  isDeleted: boolean;
  createdAt: Date;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; position: number }[];
  variants: {
    price: unknown;
    inventory: { quantity: number } | null;
  }[];
}

interface DetailProductRecord extends Omit<ListProductRecord, 'variants'> {
  updatedAt: Date;
  variants: {
    id: string;
    name: string;
    sku: string;
    price: unknown;
    inventory: {
      quantity: number;
      lowStockThreshold: number;
      status: 'in_stock' | 'low_stock' | 'out_of_stock';
    } | null;
  }[];
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  // ------------------------------- public ---------------------------------

  async listProducts(query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = buildProductWhere(query);

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: SORT_ORDER[query.sort ?? 'newest'],
        skip: (page - 1) * limit,
        take: limit,
        include: LIST_INCLUDE,
      }),
    ]);

    return {
      data: products.map((p) => this.toListItem(p as ListProductRecord)),
      message: 'Products fetched',
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'active', isDeleted: false },
      include: DETAIL_INCLUDE,
    });
    if (!product) throw new NotFoundException('Product not found');

    return {
      data: this.toDetail(product),
      message: 'Product fetched',
    };
  }

  async listReviews(
    productId: string,
    query: { page?: number; limit?: number },
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = { productId, status: 'approved' as const };

    const [total, reviews] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        images: r.images,
        user: r.user,
        createdAt: r.createdAt,
      })),
      message: 'Reviews fetched',
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // -------------------------------- admin ---------------------------------

  async adminList(query: AdminListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const where: Prisma.ProductWhereInput = {
      ...(query.includeDeleted ? {} : { isDeleted: false }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { sku: { contains: search, mode: 'insensitive' as const } },
              { brand: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: LIST_INCLUDE,
      }),
    ]);

    return {
      data: products.map((p) => ({
        ...this.toListItem(p as ListProductRecord),
        deletedAt: (p as Product).deletedAt,
      })),
      message: 'Products fetched',
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminGet(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!product) throw new NotFoundException('Product not found');

    const detail = this.toDetail(product);
    return {
      data: {
        ...detail,
        deletedAt: product.deletedAt,
        updatedAt: product.updatedAt,
      },
      message: 'Product fetched',
    };
  }

  async create(dto: CreateProductDto, actor: Actor) {
    if (dto.categoryId) await this.assertCategory(dto.categoryId);

    let slug: string;
    if (dto.slug) {
      const taken = await this.prisma.product.findUnique({
        where: { slug: dto.slug },
      });
      if (taken) throw new ConflictException('Slug is already in use');
      slug = dto.slug;
    } else {
      slug = await this.resolveUniqueProductSlug(
        slugify(dto.name) || 'product',
      );
    }
    const sku = dto.sku?.trim()
      ? dto.sku.trim().toUpperCase()
      : await this.resolveUniqueSku();
    await this.assertSkuFree(sku);

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        sku,
        description: dto.description,
        categoryId: dto.categoryId ?? null,
        brand: dto.brand,
        hsnCode: dto.hsnCode,
        basePrice: dto.basePrice,
        taxPercent: dto.taxPercent ?? 18,
        isPrescriptionRequired: dto.isPrescriptionRequired ?? false,
        status: dto.status ?? 'draft',
      },
      include: DETAIL_INCLUDE,
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'product.create',
      entity: 'Product',
      entityId: product.id,
      metadata: { slug, sku, status: product.status },
      ipAddress: actor.ip,
    });

    return {
      data: this.toDetail(product),
      message: 'Product created',
    };
  }

  async update(id: string, dto: UpdateProductDto, actor: Actor) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.isDeleted)
      throw new ConflictException('Cannot edit a deleted product');

    if (dto.slug && dto.slug !== existing.slug) {
      const taken = await this.prisma.product.findUnique({
        where: { slug: dto.slug },
      });
      if (taken) throw new ConflictException('Slug is already in use');
    }
    if (dto.sku && dto.sku.toUpperCase() !== existing.sku) {
      await this.assertSkuFree(dto.sku.toUpperCase());
    }
    if (dto.categoryId) await this.assertCategory(dto.categoryId);

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku.toUpperCase() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
        ...(dto.hsnCode !== undefined ? { hsnCode: dto.hsnCode } : {}),
        ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
        ...(dto.taxPercent !== undefined ? { taxPercent: dto.taxPercent } : {}),
        ...(dto.isPrescriptionRequired !== undefined
          ? { isPrescriptionRequired: dto.isPrescriptionRequired }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: DETAIL_INCLUDE,
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'product.update',
      entity: 'Product',
      entityId: id,
      metadata: { changes: dto },
      ipAddress: actor.ip,
    });

    return {
      data: this.toDetail(product),
      message: 'Product updated',
    };
  }

  /** Soft delete — products are never hard-deleted (plan: non-functional section). */
  async remove(id: string, actor: Actor) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing || existing.isDeleted)
      throw new NotFoundException('Product not found');

    const product = await this.prisma.product.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), status: 'archived' },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'product.delete',
      entity: 'Product',
      entityId: id,
      metadata: { slug: product.slug, sku: product.sku },
      ipAddress: actor.ip,
    });

    return { data: { id, isDeleted: true }, message: 'Product deleted' };
  }

  // -------------------------------- variants -------------------------------

  async addVariant(productId: string, dto: CreateVariantDto, actor: Actor) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
    });
    if (!product) throw new NotFoundException('Product not found');

    const sku = (
      dto.sku?.trim() || `${product.sku}-${slugify(dto.name) || 'variant'}`
    ).toUpperCase();
    await this.assertSkuFree(sku);

    const quantity = dto.quantity ?? 0;
    const lowStockThreshold = dto.lowStockThreshold ?? 10;

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        name: dto.name,
        price: dto.price,
        sku,
        inventory: {
          create: {
            quantity,
            lowStockThreshold,
            status: computeInventoryStatus(quantity, lowStockThreshold),
          },
        },
      },
      include: { inventory: true },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'product.variant.create',
      entity: 'ProductVariant',
      entityId: variant.id,
      metadata: { productId, sku, price: dto.price },
      ipAddress: actor.ip,
    });

    return { data: this.toVariant(variant), message: 'Variant added' };
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto, actor: Actor) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { id: true, name: true } } },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    if (dto.sku && dto.sku.toUpperCase() !== variant.sku) {
      await this.assertSkuFree(dto.sku.toUpperCase());
    }

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku.toUpperCase() } : {}),
      },
      include: { inventory: true },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'product.variant.update',
      entity: 'ProductVariant',
      entityId: variantId,
      metadata: {
        productId: variant.productId,
        changes: dto,
      },
      ipAddress: actor.ip,
    });

    return { data: this.toVariant(updated), message: 'Variant updated' };
  }

  async removeVariant(variantId: string, actor: Actor) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { select: { id: true, name: true } },
        _count: { select: { orderItems: true } },
      },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    if (variant._count.orderItems > 0) {
      throw new ConflictException(
        'Cannot delete a variant that has order history',
      );
    }

    // Cascades to Inventory + CartItem rows.
    await this.prisma.productVariant.delete({ where: { id: variantId } });

    await this.audit.log({
      adminId: actor.id,
      action: 'product.variant.delete',
      entity: 'ProductVariant',
      entityId: variantId,
      metadata: { productId: variant.productId, sku: variant.sku },
      ipAddress: actor.ip,
    });

    return { data: { id: variantId }, message: 'Variant deleted' };
  }

  // -------------------------------- images ---------------------------------

  async addImage(
    productId: string,
    file: Express.Multer.File | undefined,
    actor: Actor,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        `Image file is required (multipart field "image"; accepted: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')})`,
      );
    }
    const extension = imageExtension(file.mimetype);
    if (!extension) {
      throw new BadRequestException(`Unsupported image type: ${file.mimetype}`);
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
    });
    if (!product) throw new NotFoundException('Product not found');

    const count = await this.prisma.productImage.count({
      where: { productId },
    });
    if (count >= MAX_IMAGES_PER_PRODUCT) {
      throw new ConflictException(
        `A product can have at most ${MAX_IMAGES_PER_PRODUCT} images`,
      );
    }

    const key = `products/${productId}/${randomUUID()}.${extension}`;
    const { url } = await this.storage.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const last = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const image = await this.prisma.productImage.create({
      data: { productId, url, position: (last?.position ?? -1) + 1 },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'product.image.upload',
      entity: 'ProductImage',
      entityId: image.id,
      metadata: { productId, key },
      ipAddress: actor.ip,
    });

    return { data: image, message: 'Image uploaded' };
  }

  async removeImage(productId: string, imageId: string, actor: Actor) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Product image not found');

    await this.storage.remove(image.url);
    await this.prisma.productImage.delete({ where: { id: imageId } });

    await this.audit.log({
      adminId: actor.id,
      action: 'product.image.delete',
      entity: 'ProductImage',
      entityId: imageId,
      metadata: { productId },
      ipAddress: actor.ip,
    });

    return { data: { id: imageId }, message: 'Image deleted' };
  }

  // -------------------------------- helpers --------------------------------

  private toListItem(product: ListProductRecord) {
    const prices = product.variants.map((v) => toNumber(v.price));
    const stock = product.variants.reduce(
      (sum, v) => sum + (v.inventory?.quantity ?? 0),
      0,
    );
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      brand: product.brand,
      hsnCode: product.hsnCode,
      basePrice: toNumber(product.basePrice),
      taxPercent: toNumber(product.taxPercent),
      rating: toNumber(product.rating),
      isPrescriptionRequired: product.isPrescriptionRequired,
      status: product.status,
      isDeleted: product.isDeleted,
      category: product.category,
      image: product.images[0]?.url ?? null,
      minPrice: prices.length
        ? Math.min(...prices)
        : toNumber(product.basePrice),
      maxPrice: prices.length
        ? Math.max(...prices)
        : toNumber(product.basePrice),
      variantCount: product.variants.length,
      stock,
      createdAt: product.createdAt,
    };
  }

  private toVariant(v: {
    id: string;
    productId: string;
    name: string;
    sku: string;
    price: unknown;
    createdAt: Date;
    updatedAt: Date;
    inventory?: {
      quantity: number;
      lowStockThreshold: number;
      status: 'in_stock' | 'low_stock' | 'out_of_stock';
    } | null;
  }) {
    return {
      id: v.id,
      productId: v.productId,
      name: v.name,
      sku: v.sku,
      price: toNumber(v.price),
      stock: v.inventory?.quantity ?? 0,
      lowStockThreshold: v.inventory?.lowStockThreshold ?? 0,
      inventoryStatus: v.inventory?.status ?? ('out_of_stock' as const),
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }

  private toDetail(product: DetailProductRecord) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      brand: product.brand,
      hsnCode: product.hsnCode,
      basePrice: toNumber(product.basePrice),
      taxPercent: toNumber(product.taxPercent),
      rating: toNumber(product.rating),
      isPrescriptionRequired: product.isPrescriptionRequired,
      status: product.status,
      isDeleted: product.isDeleted,
      category: product.category,
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        position: img.position,
      })),
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: toNumber(v.price),
        stock: v.inventory?.quantity ?? 0,
        lowStockThreshold: v.inventory?.lowStockThreshold ?? 0,
        inventoryStatus: v.inventory?.status ?? ('out_of_stock' as const),
      })),
      stock: product.variants.reduce(
        (sum, v) => sum + (v.inventory?.quantity ?? 0),
        0,
      ),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private async assertCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');
  }

  private async assertSkuFree(sku: string) {
    const taken = await this.prisma.productVariant.findUnique({
      where: { sku },
    });
    if (taken) throw new ConflictException('SKU is already in use');

    const productTaken = await this.prisma.product.findUnique({
      where: { sku },
    });
    if (productTaken) throw new ConflictException('SKU is already in use');
  }

  private async resolveUniqueProductSlug(base: string): Promise<string> {
    const root = base || 'product';
    let candidate = root;
    let suffix = 2;
    while (
      await this.prisma.product.findUnique({ where: { slug: candidate } })
    ) {
      candidate = `${root}-${suffix++}`;
    }
    return candidate;
  }

  private async resolveUniqueSku(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `AQ-${randomSkuSuffix()}`;
      const [product, variant] = await Promise.all([
        this.prisma.product.findUnique({ where: { sku: candidate } }),
        this.prisma.productVariant.findUnique({ where: { sku: candidate } }),
      ]);
      if (!product && !variant) return candidate;
    }
    return `AQ-${Date.now().toString(36).toUpperCase()}`;
  }
}
