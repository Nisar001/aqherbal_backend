import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../admin/audit.service';
import {
  ListAdminCouponsQueryDto,
  CreateAdminCouponDto,
  UpdateAdminCouponDto,
} from './dto/admin-coupon.dto';
import { toNumber } from '../catalog/catalog.helpers';

export interface Actor {
  id: string;
  ip?: string;
}

@Injectable()
export class CouponService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------- public ----------------------------------

  /** Validate a coupon against a cart before checkout starts. */
  async validateCouponForCart(
    userId: string,
    code: string,
    itemSubtotal: number,
    itemCount: number,
  ) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!coupon || !coupon.isActive) {
      throw new NotFoundException('Coupon not found');
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new NotFoundException('Coupon has expired');
    }

    if (coupon.minOrderValue !== null && itemSubtotal < Number(coupon.minOrderValue)) {
      throw new NotFoundException(
        `Minimum order value for this coupon is ₹${toNumber(coupon.minOrderValue)}`,
      );
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new NotFoundException('Coupon usage limit reached');
    }

    return {
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        value: toNumber(coupon.value),
        minOrderValue: coupon.minOrderValue ?? 0,
        maxDiscount: coupon.maxDiscount ?? 0,
        expiresAt: coupon.expiresAt,
        usageLimit: coupon.usageLimit ?? null,
        usedCount: coupon.usedCount,
        maxPerUser: coupon.maxPerUser ?? 1,
        valid: true,
      },
      message: 'Coupon is valid',
    };
  }

  /**
   * Public cart validation — returns ONLY the discount rate for the code
   * (never the coupon list, so codes cannot be enumerated).
   */
  async validateForCart(dto: { code: string; subtotalPaise?: number }) {
    const code = dto.code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    const invalid = new BadRequestException('That coupon code is not valid');
    if (!coupon || !coupon.isActive) throw invalid;
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('That coupon code has expired');
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('That coupon code has reached its usage limit');
    }
    if (
      dto.subtotalPaise !== undefined &&
      coupon.minOrderValue !== null &&
      dto.subtotalPaise < coupon.minOrderValue
    ) {
      throw new BadRequestException(
        `This code needs a minimum order of ₹${Math.ceil(coupon.minOrderValue / 100)}`,
      );
    }

    return {
      data: {
        valid: true,
        code: coupon.code,
        discountType: coupon.discountType,
        // Percentage coupons: rate as a fraction (0.1 = 10% off).
        // Fixed coupons: amount in paise plus the same rate for cart display.
        rate:
          coupon.discountType === 'percentage'
            ? toNumber(coupon.value) / 100
            : dto.subtotalPaise
              ? Math.min(coupon.value, dto.subtotalPaise) / Math.max(dto.subtotalPaise, 1)
              : 0,
        fixedPaise: coupon.discountType === 'fixed' ? coupon.value : null,
      },
      message: 'Coupon is valid',
    };
  }

  // ------------------------------- admin -----------------------------------

  async adminList(query: ListAdminCouponsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = { isActive: true };

    if (query.discountType) {
      where.discountType = query.discountType;
    }
    if (query.search) {
      where.code = { contains: query.search, mode: 'insensitive' as const };
    }

    const total = await this.prisma.coupon.count({ where });
    const coupons = await this.prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        code: true,
        discountType: true,
        value: true,
        minOrderValue: true,
        maxDiscount: true,
        expiresAt: true,
        usageLimit: true,
        usedCount: true,
        isActive: true,
        maxPerUser: true,
      },
    });

    return {
      data: (coupons as any[]).map((c) => this.toAdminCoupon(c)),
      message: 'Coupons fetched',
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminGet(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return {
      data: this.toAdminCoupon(coupon as any),
      message: 'Coupon fetched',
    };
  }

  async adminCreate(dto: CreateAdminCouponDto, actor: Actor) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Coupon code "${dto.code}" already exists`);
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        description: dto.description ?? null,
        discountType: dto.discountType ?? 'percentage',
        value: dto.value,
        minOrderValue: dto.minOrderValue ?? 0,
        maxDiscount: dto.maxDiscount ?? null,
        expiresAt: new Date(dto.expiresAt),
        usageLimit: dto.usageLimit ?? null,
        usedCount: 0,
        isActive: true,
      },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'coupon.create',
      entity: 'Coupon',
      entityId: coupon.id,
      metadata: { code: coupon.code, value: dto.value },
      ipAddress: actor.ip,
    });

    return {
      data: this.toAdminCoupon(coupon as any),
      message: 'Coupon created',
    };
  }

  async adminUpdate(
    id: string,
    dto: UpdateAdminCouponDto,
    actor: Actor,
  ) {
    const existing = await this.prisma.coupon.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Coupon not found');

    if (dto.isActive !== undefined) {
      await this.prisma.coupon.update({
        where: { id },
        data: { isActive: dto.isActive },
      });
      await this.audit.log({
        adminId: actor.id,
        action: 'coupon.update',
        entity: 'Coupon',
        entityId: id,
        metadata: { isActive: dto.isActive, changes: dto },
        ipAddress: actor.ip,
      });
      return this.adminGet(id);
    }

    if (dto.code && dto.code.toUpperCase() !== existing.code) {
      const taken = await this.prisma.coupon.findUnique({
        where: { code: dto.code.toUpperCase() },
      });
      if (taken) {
        throw new ConflictException(`Coupon code "${dto.code}" already exists`);
      }
    }

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.toUpperCase() } : {}),
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.discountType !== undefined ? { discountType: dto.discountType } : {}),
        ...(dto.minOrderValue !== undefined ? { minOrderValue: dto.minOrderValue } : {}),
        ...(dto.maxDiscount !== undefined ? { maxDiscount: dto.maxDiscount } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: new Date(dto.expiresAt) } : {}),
        ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
        ...(dto.userIds !== undefined ? { userIds: dto.userIds } : {}),
        ...(dto.maxPerUser !== undefined ? { maxPerUser: dto.maxPerUser } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'coupon.update',
      entity: 'Coupon',
      entityId: id,
      metadata: { changes: dto },
      ipAddress: actor.ip,
    });

    return {
      data: this.toAdminCoupon(coupon as any),
      message: 'Coupon updated',
    };
  }

  async adminDelete(id: string, actor: Actor) {
    const existing = await this.prisma.coupon.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Coupon not found');

    await this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'coupon.delete',
      entity: 'Coupon',
      entityId: id,
      metadata: { code: existing.code },
      ipAddress: actor.ip,
    });

    return {
      data: { id, isDeleted: true },
      message: 'Coupon removed',
    };
  }

  // -------------------------------- helpers --------------------------------

  private toAdminCoupon(c: any) {
    const description = c.description ?? null;

    return {
      id: c.id,
      code: c.code,
      description,
      discountType: c.discountType,
      value: toNumber(c.value),
      minOrderValue: c.minOrderValue ?? 0,
      maxDiscount: c.maxDiscount ?? null,
      expiresAt: c.expiresAt,
      usageLimit: c.usageLimit ?? null,
      usedCount: c.usedCount,
      isActive: c.isActive,
      maxPerUser: c.maxPerUser ?? 1,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
