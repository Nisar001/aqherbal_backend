import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../admin/audit.service';
import { CartItemDto, UpdateCartItemDto, ApplyCouponDto, RemoveCouponDto } from './dto/cart.dto';
import { toNumber } from '../catalog/catalog.helpers';
import { Product } from '../../generated/prisma/client';

export interface Actor {
  id: string;
  ip?: string;
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------- public ----------------------------------

  async getCart(userId: string, query: { limit?: number }) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventory: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    sku: true,
                    basePrice: true,
                    brand: true,
                    isPrescriptionRequired: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return this.emptyCart(userId);
    }

    const limit = query.limit ?? 20;
    const total = cart.items.length;
    const data = cart.items.map((item) => this.toCartItem(item, limit));

    return {
      data,
      message: 'Cart fetched',
      pagination: { page: 1, limit, total, totalPages: Math.ceil(total / limit) },
      couponCode: cart.couponCode,
    };
  }

  async addItem(userId: string, dto: CartItemDto, actor: Actor) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { inventory: true, product: { select: { id: true, name: true } } },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
    const product = variant.product;
    if (!variant.inventory || variant.inventory.quantity <= 0) {
      throw new NotFoundException(
        `Variant "${product.name}" is out of stock`,
      );
    }

    const quantity = Math.min(dto.quantity ?? 1, variant.inventory.quantity);

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (cart) {
      const existing = cart.items.find((i) => i.variantId === dto.variantId);
      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: Math.min(existing.quantity + quantity, variant.inventory.quantity),
          },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            variantId: variant.id,
            quantity,
          },
        });
      }
    } else {
      const cart = await this.prisma.cart.create({
        data: {
          userId,
          items: {
            create: {
              productId: product.id,
              variantId: variant.id,
              quantity,
            },
          },
        },
      });
      await this.audit.log({
        adminId: actor.id,
        action: 'cart.create',
        entity: 'Cart',
        entityId: cart.id,
        metadata: { userId },
        ipAddress: actor.ip,
      });
      return this.toCartItem((await this.prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: true },
      }))!.items[0], 20, true);
    }

    const updated = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    return this.toCartItem(updated!.items[0], 20, true);
  }

  async updateItem(
    userId: string,
    id: string,
    dto: UpdateCartItemDto,
    actor: Actor,
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    if (!cart) throw new NotFoundException('Cart not found');
    const item = cart.items.find((i) => i.id === id);
    if (!item) throw new NotFoundException('Cart item not found');

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: item.variantId },
      include: { inventory: true },
    });
    if (!variant || !variant.inventory) {
      throw new NotFoundException('Product variant not found');
    }

    const quantity =
      (dto.quantity ?? item.quantity) < 1
        ? 1
        : Math.min(dto.quantity ?? item.quantity, variant.inventory.quantity);

    if (quantity === 0) {
      throw new NotFoundException('Cannot set quantity to 0 — remove the item instead');
    }

    await this.prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'cart.item.update',
      entity: 'CartItem',
      entityId: id,
      metadata: { quantity, variantId: item.variantId },
      ipAddress: actor.ip,
    });

    return this.toCartItem(item, 20, true);
  }

  async removeItem(userId: string, id: string, actor: Actor) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    if (!cart) throw new NotFoundException('Cart not found');
    const item = cart.items.find((i) => i.id === id);
    if (!item) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id } });

    await this.audit.log({
      adminId: actor.id,
      action: 'cart.item.delete',
      entity: 'CartItem',
      entityId: id,
      metadata: { variantId: item.variantId },
      ipAddress: actor.ip,
    });

    return { data: { id }, message: 'Cart item removed' };
  }

  async applyCoupon(
    userId: string,
    dto: ApplyCouponDto,
    actor: Actor,
  ) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (!coupon || !coupon.isActive) {
      throw new NotFoundException('Coupon not found');
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new NotFoundException('Coupon has expired');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    if (!cart || cart.items.length === 0) {
      throw new NotFoundException('Cart is empty');
    }



    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { couponCode: dto.code.trim().toUpperCase() },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'cart.coupon.apply',
      entity: 'Cart',
      entityId: cart.id,
      metadata: { couponCode: dto.code.trim().toUpperCase() },
      ipAddress: actor.ip,
    });

    const updated = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    return {
      data: { couponCode: updated!.couponCode },
      message: 'Coupon applied',
    };
  }

  async removeCoupon(
    userId: string,
    dto: RemoveCouponDto,
    actor: Actor,
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });
    if (!cart) throw new NotFoundException('Cart not found');

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { couponCode: null },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'cart.coupon.remove',
      entity: 'Cart',
      entityId: cart.id,
      metadata: { reason: dto.reason },
      ipAddress: actor.ip,
    });

    return { data: null, message: 'Coupon removed' };
  }

  // -------------------------------- helpers --------------------------------

  private toCartItem(item: any, limit: number, isNew?: boolean) {
    const variant = item.variant;
    const product = variant.product;
    const stock = variant.inventory?.quantity ?? 0;

    return {
      id: item.id,
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      sku: product.sku,
      price: toNumber(variant.price),
      quantity: item.quantity,
      stock,
      maxQuantity: stock,
      isPrescriptionRequired: product.isPrescriptionRequired,
      image: null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      totalPrice: toNumber(variant.price) * item.quantity,
      // pagination metadata for the storefront
      page: 1,
      limit,
      total: Math.ceil(limit / limit),
    };
  }

  private emptyCart(userId: string) {
    return {
      data: [],
      message: 'Cart is empty',
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      couponCode: null,
    };
  }
}
