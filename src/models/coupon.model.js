import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: false,
      default: ''
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0
    },
    maxDiscount: {
      type: Number, // For percentage coupons, cap the discount amount
      default: null
    },
    maxUses: {
      type: Number,
      default: null // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0
    },
    currentUses: {
      type: Number,
      default: 0
    },
    maxUsesPerUser: {
      type: Number,
      default: 1
    },
    validFrom: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date,
      required: false
    },
    expiryDate: {
      type: Date,
      required: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    applicableCategories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    applicableProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    usageHistory: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      },
      discountAmount: Number,
      usedAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save: sync expiryDate <-> validUntil so both field names work
couponSchema.pre('save', function (next) {
  if (this.expiryDate && !this.validUntil) {
    this.validUntil = this.expiryDate;
  } else if (this.validUntil && !this.expiryDate) {
    this.expiryDate = this.validUntil;
  }
  next();
});

// Indexes
couponSchema.index({ code: 1, isDeleted: 1 });
couponSchema.index({ isActive: 1, validUntil: 1 });
couponSchema.index({ 'usageHistory.userId': 1 });

// Methods
couponSchema.methods.isValid = function () {
  const now = new Date();
  const expiresAt = this.validUntil || this.expiryDate;
  const notExpired = expiresAt ? expiresAt >= now : true;
  return (
    this.isActive &&
    !this.isDeleted &&
    notExpired &&
    (this.maxUses === null || this.usedCount < this.maxUses)
  );
};

couponSchema.methods.canUserUse = function (userId) {
  const userUsageCount = this.usageHistory.filter(
    (history) => history.userId.toString() === userId.toString()
  ).length;
  return userUsageCount < this.maxUsesPerUser;
};

couponSchema.methods.calculateDiscount = function (orderTotal) {
  if (orderTotal < this.minOrderValue) {
    return 0;
  }

  let discount = 0;
  if (this.discountType === 'percentage') {
    discount = (orderTotal * this.discountValue) / 100;
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else {
    discount = this.discountValue;
  }

  return Math.min(discount, orderTotal);
};

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
