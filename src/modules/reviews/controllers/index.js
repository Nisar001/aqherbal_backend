import { ReviewService } from '../../../services/review.service.js';
import {
  validateCreateReview,
  validateUpdateReview,
  validateModerationAction,
  validateMarkHelpful
} from '../../../validations/review.validation.js';
import { response } from '../../../helpers/response.helper.js';

export const createReview = async (req, res, next) => {
  try {
    if (String(req.body.content ?? req.body.comment ?? '').length > 5000) {
      return response(res, 400, 'content length must be less than or equal to 5000 characters');
    }

    const { error, value } = validateCreateReview(req.body);
    if (error) {
      return response(res, 400, error.details[0]?.message || 'Validation error', null, error.details);
    }

    const review = await ReviewService.createReview(
      req.user.id,
      value.productId,
      value.orderId,
      value
    );
    response(res, 201, 'Review submitted for moderation', review);
  } catch (err) {
    next(err);
  }
};

export const getProductReviews = async (req, res, next) => {
  try {
    const { calculatePagination, buildPaginationMeta } = await import('../../../helpers/pagination.helper.js');
    const { productId } = req.params;
    const { page, limit } = calculatePagination(req.query, 10, 50);
    const filters = {};
    if (req.query.rating !== undefined) {
      filters.rating = Number(req.query.rating);
    }

    const result = await ReviewService.getProductReviews(productId, page, limit, filters, req.query.sortBy);
    const pagination = buildPaginationMeta(result.total, page, limit);
    return res.status(200).json({
      success: true,
      message: 'Reviews retrieved',
      data: result.reviews,
      pagination,
      averageRating: result.rating.average
    });
  } catch (err) {
    next(err);
  }
};

export const getMyReviews = async (req, res, next) => {
  try {
    const { calculatePagination, buildPaginationMeta } = await import('../../../helpers/pagination.helper.js');
    const { page, limit } = calculatePagination(req.query, 10, 50);

    const result = await ReviewService.getUserReviews(req.user.id, page, limit);
    const pagination = buildPaginationMeta(result.total, page, limit);
    response(res, 200, 'Your reviews', { reviews: result.reviews, pagination });
  } catch (err) {
    next(err);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    if (String(req.body.content ?? req.body.comment ?? '').length > 5000) {
      return response(res, 400, 'content length must be less than or equal to 5000 characters');
    }

    const { error, value } = validateUpdateReview(req.body);
    if (error) {
      return response(res, 400, error.details[0]?.message || 'Validation error', null, error.details);
    }

    const review = await ReviewService.updateReview(
      req.params.id,
      req.user.id,
      value
    );
    response(res, 200, 'Review updated', review);
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const review = await ReviewService.deleteReview(req.params.id, req.user.id);
    response(res, 200, 'Review deleted', review);
  } catch (err) {
    next(err);
  }
};

export const getReviewById = async (req, res, next) => {
  try {
    const review = await ReviewService.getReviewById(req.params.id);
    response(res, 200, 'Review retrieved', review);
  } catch (err) {
    next(err);
  }
};

export const getProductRatingSummary = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const summary = await ReviewService.getProductRatingSummary(productId);
    response(res, 200, 'Rating summary', summary);
  } catch (err) {
    next(err);
  }
};

// Admin only
export const getPendingReviews = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const reviews = await ReviewService.getPendingReviews(limit);
    response(res, 200, 'Pending reviews', reviews);
  } catch (err) {
    next(err);
  }
};

export const approveReview = async (req, res, next) => {
  try {
    const approved = req.body?.approved;
    const review = approved === false
      ? await ReviewService.rejectReview(req.params.id, req.body?.rejectionReason)
      : await ReviewService.approveReview(req.params.id);
    response(res, 200, 'Review approved', review);
  } catch (err) {
    next(err);
  }
};

export const rejectReview = async (req, res, next) => {
  try {
    const { error, value } = validateModerationAction(req.body);
    if (error) {
      return response(res, 400, 'Validation error', null, error.details);
    }

    const review = await ReviewService.rejectReview(req.params.id, value.rejectionReason);
    response(res, 200, 'Review rejected', review);
  } catch (err) {
    next(err);
  }
};

export const markReviewHelpful = async (req, res, next) => {
  try {
    const { error, value } = validateMarkHelpful(req.body);
    if (error) {
      return response(res, 400, error.details[0]?.message || 'Validation error', null, error.details);
    }

    const review = await ReviewService.markHelpful(req.params.id, req.user.id, value.helpful);
    response(res, 200, 'Review vote recorded', review);
  } catch (err) {
    next(err);
  }
};
