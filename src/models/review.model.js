import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String, required: true },
  comment: { type: String, trim: true },
  media: [String], // URLs from Cloudinary
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  rejectionReason: String,
  isVerified: { type: Boolean, default: false }, // Set to true only if user purchased product
  helpfulCount: { type: Number, default: 0 },
  notHelpfulCount: { type: Number, default: 0 },
  helpfulBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track users who found it helpful (prevent duplicates)
  notHelpfulBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date }
}, { timestamps: true });

reviewSchema.index({ productId: 1, isDeleted: 1 });
reviewSchema.index({ userId: 1, isDeleted: 1 });
reviewSchema.index({ status: 1, isDeleted: 1 });
reviewSchema.index({ isVerified: 1 });

const ReviewModel = mongoose.model('Review', reviewSchema);

export { ReviewModel };
export default ReviewModel;
