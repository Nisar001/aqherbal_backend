import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../src/utils/logger.js';

dotenv.config();

// Import models
const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: String,
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  maxDiscountAmount: Number,
  minOrderValue: { type: Number, default: 0 },
  maxUsageCount: Number,
  usageCount: { type: Number, default: 0 },
  maxUsagePerUser: { type: Number, default: 1 },
  validFrom: Date,
  validUntil: Date,
  isActive: { type: Boolean, default: true },
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  restrictedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  usageHistory: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    usedAt: { type: Date, default: Date.now },
    discountApplied: Number
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', CouponSchema);

const sampleCoupons = [
  {
    code: 'WELCOME10',
    description: 'Welcome offer - 10% off on first order',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscountAmount: 500,
    minOrderValue: 500,
    maxUsageCount: 1000,
    maxUsagePerUser: 1,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-12-31'),
    isActive: true
  },
  {
    code: 'SAVE20',
    description: 'Save 20% on orders above ₹1000',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscountAmount: 1000,
    minOrderValue: 1000,
    maxUsageCount: 500,
    maxUsagePerUser: 3,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-06-30'),
    isActive: true
  },
  {
    code: 'FLAT100',
    description: 'Flat ₹100 off on orders above ₹500',
    discountType: 'fixed',
    discountValue: 100,
    minOrderValue: 500,
    maxUsageCount: 200,
    maxUsagePerUser: 2,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-03-31'),
    isActive: true
  },
  {
    code: 'MEGA50',
    description: 'Mega sale - 50% off (up to ₹2000)',
    discountType: 'percentage',
    discountValue: 50,
    maxDiscountAmount: 2000,
    minOrderValue: 2000,
    maxUsageCount: 100,
    maxUsagePerUser: 1,
    validFrom: new Date('2026-02-01'),
    validUntil: new Date('2026-02-28'),
    isActive: true
  },
  {
    code: 'HERBAL15',
    description: '15% off on all herbal products',
    discountType: 'percentage',
    discountValue: 15,
    maxDiscountAmount: 750,
    minOrderValue: 800,
    maxUsageCount: 300,
    maxUsagePerUser: 5,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-12-31'),
    isActive: true
  },
  {
    code: 'EXPIRED10',
    description: 'Expired coupon for testing',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 0,
    maxUsageCount: 100,
    maxUsagePerUser: 1,
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-12-31'),
    isActive: false
  },
  {
    code: 'FIRSTBUY',
    description: 'First purchase - ₹150 off',
    discountType: 'fixed',
    discountValue: 150,
    minOrderValue: 1000,
    maxUsageCount: 500,
    maxUsagePerUser: 1,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-12-31'),
    isActive: true
  },
  {
    code: 'PREMIUM25',
    description: 'Premium members - 25% off',
    discountType: 'percentage',
    discountValue: 25,
    maxDiscountAmount: 1500,
    minOrderValue: 1500,
    maxUsageCount: 200,
    maxUsagePerUser: 10,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-12-31'),
    isActive: true
  }
];

async function seedCoupons() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aqherbal');
    logger.info('Connected to MongoDB');

    // Clear existing coupons
    await Coupon.deleteMany({});
    logger.info('Cleared existing coupons');

    // Insert sample coupons
    const inserted = await Coupon.insertMany(sampleCoupons);
    logger.info(`Inserted ${inserted.length} sample coupons`);

    // Display created coupons
    console.log('\n✅ Sample Coupons Created:\n');
    inserted.forEach(coupon => {
      console.log(`Code: ${coupon.code}`);
      console.log(`  Description: ${coupon.description}`);
      console.log(`  Type: ${coupon.discountType}`);
      console.log(`  Value: ${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : '₹'}`);
      console.log(`  Min Order: ₹${coupon.minOrderValue}`);
      console.log(`  Valid: ${coupon.validFrom.toDateString()} - ${coupon.validUntil.toDateString()}`);
      console.log(`  Status: ${coupon.isActive ? '🟢 Active' : '🔴 Inactive'}`);
      console.log('');
    });

    console.log('🎉 Coupon seeding completed successfully!\n');

    // Disconnect
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error seeding coupons:', error);
    process.exit(1);
  }
}

// Run the seeder
seedCoupons();
