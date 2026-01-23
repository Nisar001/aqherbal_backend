import { ReviewModel } from '../models/review.model.js';
import { BaseRepository } from './base.repository.js';

class ReviewRepositoryImpl extends BaseRepository {
  async findByProductId(productId, filters = {}) {
    return ReviewModel.find({ productId, isDeleted: false, ...filters })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });
  }

  async findByProductIdLean(productId, filters = {}) {
    return ReviewModel.find({ productId, isDeleted: false, status: 'approved', ...filters })
      .lean()
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });
  }

  async findApprovedByProductId(productId) {
    return ReviewModel.find({ productId, status: 'approved', isDeleted: false })
      .lean()
      .populate('userId', 'name avatar');
  }

  async findByUserId(userId) {
    return ReviewModel.find({ userId, isDeleted: false })
      .populate('productId', 'name images')
      .sort({ createdAt: -1 });
  }

  async findPendingReviews(limit = 20) {
    return ReviewModel.find({ status: 'pending', isDeleted: false })
      .populate('userId', 'name email')
      .populate('productId', 'name')
      .sort({ createdAt: 1 })
      .limit(limit);
  }

  async countByProductId(productId) {
    return ReviewModel.countDocuments({ productId, status: 'approved', isDeleted: false });
  }

  async getAverageRating(productId) {
    const result = await ReviewModel.aggregate([
      { $match: { productId, status: 'approved', isDeleted: false } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);
    return result[0] || { averageRating: 0, count: 0 };
  }

  async updateReviewStatus(reviewId, status, rejectionReason = null) {
    const update = { status };
    if (rejectionReason) update.rejectionReason = rejectionReason;
    return ReviewModel.findByIdAndUpdate(reviewId, update, { new: true })
      .populate('userId', 'name email')
      .populate('productId', 'name');
  }

  async checkUserPurchase(_userId, _productId) {
    // This will be called from OrderRepository to verify purchase
    // For now, returns a placeholder method
    return true;
  }

  async incrementHelpful(reviewId) {
    return ReviewModel.findByIdAndUpdate(
      reviewId,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );
  }

  async hasUserReviewedProduct(userId, productId) {
    return ReviewModel.findOne({
      userId,
      productId,
      isDeleted: false
    });
  }
}

export const ReviewRepository = new ReviewRepositoryImpl(ReviewModel);
