import { ReviewRepository } from '../repositories/review.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { AppError } from '../middlewares/error.middleware.js';

export const ReviewService = {
  async createReview(userId, productId, orderId, data) {
    // 1. Verify product exists
    const product = await ProductRepository.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError('Product not found', 404);
    }

    // 2. Check if user already reviewed this product
    const existing = await ReviewRepository.hasUserReviewedProduct(userId, productId);
    if (existing) {
      throw new AppError('You have already reviewed this product', 400);
    }

    // 3. Verify purchase (if orderId provided)
    let isVerified = false;
    if (!orderId) {
      throw new AppError('Valid purchase required', 403);
    }

    const order = await OrderRepository.findById(orderId);
    const hasValidOwnership = order && order.userId.toString() === userId;
    const hasProduct = hasValidOwnership && order.items.some(item => item.productId.toString() === productId);

    if (!hasValidOwnership || !hasProduct) {
      throw new AppError('Valid purchase required', 403);
    }

    isVerified = true;

    // 4. Create review
    const review = await ReviewRepository.create({
      productId,
      userId,
      orderId,
      rating: data.rating,
      title: data.title,
      comment: data.comment ?? data.content,
      media: data.media || [],
      isVerified,
      status: 'pending' // Requires admin approval,
    });

    return review;
  },

  async getProductReviews(productId, page = 1, limit = 10, filters = {}, sortBy = 'recent') {
    const skip = (page - 1) * limit;
    const sort = sortBy === 'recent' ? { createdAt: -1 } : { createdAt: -1 };
    const reviews = await ReviewRepository.findApprovedByProductIdFiltered(productId, filters, sort);
    const { averageRating, count } = await ReviewRepository.getAverageRating(productId);

    return {
      reviews: reviews.slice(skip, skip + limit),
      total: reviews.length,
      rating: {
        average: parseFloat(averageRating.toFixed(2)),
        count
      },
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  },

  async getUserReviews(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const reviews = await ReviewRepository.findByUserId(userId);
    const total = reviews.length;

    return {
      reviews: reviews.slice(skip, skip + limit),
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async updateReview(reviewId, userId, data) {
    const review = await ReviewRepository.findById(reviewId);
    if (!review || review.isDeleted) {
      throw new AppError('Review not found', 404);
    }

    // Only user who created review can update it
    if (review.userId.toString() !== userId) {
      throw new AppError('Cannot update review', 403);
    }

    // Cannot update if already approved
    if (review.status === 'approved') {
      throw new AppError('Cannot modify approved review', 400);
    }

    const updated = await ReviewRepository.updateById(reviewId, {
      rating: data.rating || review.rating,
      title: data.title || review.title,
      comment: data.comment || data.content || review.comment,
      media: data.media || review.media,
      status: 'pending' // Reset to pending if modified
    });

    return updated;
  },

  async deleteReview(reviewId, userId) {
    const review = await ReviewRepository.findById(reviewId);
    if (!review || review.isDeleted) {
      throw new AppError('Review not found', 404);
    }

    if (review.userId.toString() !== userId) {
      throw new AppError('Cannot delete review', 403);
    }

    return review.deleteOne();
  },

  async getReviewById(reviewId) {
    const review = await ReviewRepository.findById(reviewId);
    if (!review || review.isDeleted) {
      throw new AppError('Review not found', 404);
    }
    return review;
  },

  // Admin only
  async getPendingReviews(limit = 20) {
    return ReviewRepository.findPendingReviews(limit);
  },

  async approveReview(reviewId) {
    const review = await ReviewRepository.updateReviewStatus(reviewId, 'approved');

    // Update product rating
    const { averageRating, count } = await ReviewRepository.getAverageRating(review.productId);
    await ProductRepository.updateById(review.productId, {
      rating: parseFloat(averageRating.toFixed(2)),
      reviewCount: count
    });

    return review;
  },

  async rejectReview(reviewId, reason) {
    return ReviewRepository.updateReviewStatus(reviewId, 'rejected', reason);
  },

  // Helper for product page
  async getProductRatingSummary(productId) {
    const { averageRating, count } = await ReviewRepository.getAverageRating(productId);

    // Get rating distribution
    const reviews = await ReviewRepository.findApprovedByProductId(productId);
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    reviews.forEach(review => {
      distribution[review.rating]++;
    });

    return {
      average: parseFloat(averageRating.toFixed(2)),
      total: count,
      distribution,
      verified: reviews.filter(r => r.isVerified).length
    };
  },

  async markHelpful(reviewId, userId, helpful = true) {
    // Validate inputs
    if (!reviewId || !userId) {
      throw new AppError('Review ID and User ID are required', 400);
    }

    // Check if user already marked this review as helpful
    const review = await ReviewRepository.findById(reviewId);
    if (!review) {
      throw new AppError('Review not found', 404);
    }

    if (review.userId.toString() === userId) {
      throw new AppError('You cannot vote on your own review', 400);
    }

    const alreadyMarkedHelpful = review.helpfulBy && review.helpfulBy.some((id) => id.toString() === userId);
    const alreadyMarkedNotHelpful = review.notHelpfulBy && review.notHelpfulBy.some((id) => id.toString() === userId);
    const alreadyMarked = alreadyMarkedHelpful || alreadyMarkedNotHelpful;
    if (alreadyMarked) {
      throw new AppError('You have already voted on this review', 400);
    }

    if (helpful) {
      return ReviewRepository.incrementHelpful(reviewId, userId);
    }

    return ReviewRepository.incrementNotHelpful(reviewId, userId);
  }
};
