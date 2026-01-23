import { CouponService } from '../../../services/coupon.service.js';
import { successResponse } from '../../../helpers/response.helper.js';
import { AppError } from '../../../middlewares/error.middleware.js';

export const createCoupon = async (req, res, next) => {
  try {
    const coupon = await CouponService.createCoupon(req.body, req.user.id);
    return successResponse(res, coupon, 'Coupon created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await CouponService.updateCoupon(id, req.body);
    return successResponse(res, coupon, 'Coupon updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await CouponService.deleteCoupon(id);
    return successResponse(res, result, 'Coupon deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const getCouponById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await CouponService.getCouponById(id);
    return successResponse(res, coupon, 'Coupon retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getAllCoupons = async (req, res, next) => {
  try {
    const { calculatePagination, buildPaginationMeta } = await import('../../../helpers/pagination.helper.js');
    const { isActive } = req.query;
    const { page: pageNum, limit: pageLimit } = calculatePagination(req.query, 20, 100);

    const filters = {
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: pageNum,
      limit: pageLimit
    };
    const result = await CouponService.getAllCoupons(filters);
    const pagination = buildPaginationMeta(result.total, pageNum, pageLimit);
    return res.status(200).json({
      success: true,
      data: result.coupons,
      pagination,
      message: 'Coupons retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (req, res, next) => {
  try {
    const { code, orderTotal, cartItems } = req.body;
    const userId = req.user.id;

    if (!code || !orderTotal) {
      throw new AppError('Coupon code and order total are required', 400);
    }

    const result = await CouponService.validateAndApplyCoupon(
      code,
      userId,
      orderTotal,
      cartItems
    );
    return successResponse(res, result, 'Coupon validated successfully');
  } catch (error) {
    next(error);
  }
};

export const getCouponUsageStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await CouponService.getCouponUsageStats(id);
    if (!stats) {
      throw new AppError('Coupon not found', 404);
    }
    return successResponse(res, stats, 'Coupon usage stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};
