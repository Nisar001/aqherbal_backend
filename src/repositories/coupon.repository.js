import Coupon from '../models/coupon.model.js';
import { BaseRepository } from './base.repository.js';

class CouponRepositoryImpl extends BaseRepository {
  constructor() {
    super(Coupon);
  }

  async findByCode(code) {
    return await this.model.findOne({
      code: code.toUpperCase(),
      isDeleted: false
    });
  }

  async findActiveByCode(code) {
    const now = new Date();
    return await this.model.findOne({
      code: code.toUpperCase(),
      isActive: true,
      isDeleted: false,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    });
  }

  async findAll(filters = {}) {
    const { isActive, page = 1, limit = 20 } = filters;
    const query = { isDeleted: false };

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const skip = (page - 1) * limit;
    const coupons = await this.model
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('applicableCategories', 'name')
      .populate('applicableProducts', 'name');

    const total = await this.model.countDocuments(query);

    return {
      coupons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async recordUsage(couponId, userId, orderId, discountAmount) {
    return await this.model.findByIdAndUpdate(
      couponId,
      {
        $inc: { usedCount: 1 },
        $push: {
          usageHistory: {
            userId,
            orderId,
            discountAmount,
            usedAt: new Date()
          }
        }
      },
      { new: true }
    );
  }

  async getUserUsageCount(couponId, userId) {
    const coupon = await this.model.findById(couponId);
    if (!coupon) return 0;

    return coupon.usageHistory.filter(
      (history) => history.userId.toString() === userId.toString()
    ).length;
  }

  async getUsageStats(couponId) {
    const coupon = await this.model.findById(couponId);
    if (!coupon) return null;

    const totalDiscount = coupon.usageHistory.reduce(
      (sum, history) => sum + history.discountAmount,
      0
    );

    return {
      couponId: coupon._id,
      code: coupon.code,
      usedCount: coupon.usedCount,
      maxUses: coupon.maxUses,
      totalDiscount,
      uniqueUsers: new Set(coupon.usageHistory.map(h => h.userId.toString())).size
    };
  }

  async deactivateExpiredCoupons() {
    const now = new Date();
    return await this.model.updateMany(
      {
        isActive: true,
        validUntil: { $lt: now },
        isDeleted: false
      },
      {
        $set: { isActive: false }
      }
    );
  }
}

export const CouponRepository = new CouponRepositoryImpl();
