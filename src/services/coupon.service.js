import { CouponRepository } from '../repositories/coupon.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { AppError } from '../middlewares/error.middleware.js';

class CouponServiceImpl {
  async createCoupon(data, adminId) {
    // Check if coupon code already exists
    const existing = await CouponRepository.findByCode(data.code);
    if (existing) {
      throw new AppError('Coupon code already exists', 400);
    }

    // Validate percentage discount
    if (data.discountType === 'percentage' && data.discountValue > 100) {
      throw new AppError('Percentage discount cannot exceed 100%', 400);
    }

    // Create coupon
    const coupon = await CouponRepository.create({
      ...data,
      createdBy: adminId
    });

    return coupon;
  }

  async updateCoupon(couponId, data) {
    const coupon = await CouponRepository.findById(couponId);
    if (!coupon) {
      throw new AppError('Coupon not found', 404);
    }

    // Validate percentage discount if being updated
    if (data.discountType === 'percentage' && data.discountValue > 100) {
      throw new AppError('Percentage discount cannot exceed 100%', 400);
    }

    const updated = await CouponRepository.updateById(couponId, data);
    if (!updated) {
      throw new AppError('Failed to update coupon', 500);
    }
    return updated;
  }

  async deleteCoupon(couponId) {
    const coupon = await CouponRepository.findById(couponId);
    if (!coupon) {
      throw new AppError('Coupon not found', 404);
    }

    await CouponRepository.softDeleteById(couponId);
    return { message: 'Coupon deleted successfully' };
  }

  async getCouponById(couponId) {
    const coupon = await CouponRepository.findById(couponId);
    if (!coupon) {
      throw new AppError('Coupon not found', 404);
    }
    return coupon;
  }

  async getAllCoupons(filters) {
    return await CouponRepository.findAll(filters);
  }

  async validateAndApplyCoupon(code, userId, orderTotal, cartItems = []) {
    // Find active coupon
    const coupon = await CouponRepository.findActiveByCode(code);
    if (!coupon) {
      throw new AppError('Invalid or expired coupon code', 400);
    }

    // Check if coupon is valid (date, usage limits)
    if (!coupon.isValid()) {
      throw new AppError('Coupon is no longer valid', 400);
    }

    // Check user usage limit
    if (!coupon.canUserUse(userId)) {
      throw new AppError(`You have already used this coupon the maximum number of times (${coupon.maxUsesPerUser})`, 400);
    }

    // Check minimum order value
    if (orderTotal < coupon.minOrderValue) {
      throw new AppError(`Minimum order value of ₹${coupon.minOrderValue} required to use this coupon`, 400);
    }

    // Check if coupon is applicable to products/categories
    if (coupon.applicableProducts.length > 0 || coupon.applicableCategories.length > 0) {
      const isApplicable = await this.isCouponApplicableToCart(coupon, cartItems);
      if (!isApplicable) {
        throw new AppError('This coupon is not applicable to the items in your cart', 400);
      }
    }

    // Calculate discount
    const discountAmount = coupon.calculateDiscount(orderTotal);

    return {
      couponId: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalTotal: orderTotal - discountAmount
    };
  }

  async isCouponApplicableToCart(coupon, cartItems) {
    if (!cartItems || cartItems.length === 0) return true;

    // Check if any cart item matches applicable products or categories
    for (const item of cartItems) {
      const product = await ProductRepository.findById(item.productId);
      if (!product) continue;

      // Check if product is in applicable products list
      if (coupon.applicableProducts.length > 0) {
        const isApplicable = coupon.applicableProducts.some(
          (pId) => pId.toString() === product._id.toString()
        );
        if (isApplicable) return true;
      }

      // Check if product's category is in applicable categories list
      if (coupon.applicableCategories.length > 0) {
        const isApplicable = coupon.applicableCategories.some(
          (cId) => cId.toString() === product.category.toString()
        );
        if (isApplicable) return true;
      }
    }

    // If coupon has restrictions but no items matched, it's not applicable
    if (coupon.applicableProducts.length > 0 || coupon.applicableCategories.length > 0) {
      return false;
    }

    return true;
  }

  async recordCouponUsage(couponId, userId, orderId, discountAmount) {
    return await CouponRepository.recordUsage(couponId, userId, orderId, discountAmount);
  }

  async getCouponUsageStats(couponId) {
    return await CouponRepository.getUsageStats(couponId);
  }

  async deactivateExpiredCoupons() {
    return await CouponRepository.deactivateExpiredCoupons();
  }
}

export const CouponService = new CouponServiceImpl();
