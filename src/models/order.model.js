import mongoose from 'mongoose';
import { ORDER_STATUS } from '../constants/orderStatus.js';

const addressSchema = new mongoose.Schema({
  name: String,
  phone: String,
  street: String,
  line1: String,
  line2: String,
  city: String,
  state: String,
  zip: String,
  pincode: String,
  country: { type: String, default: 'India' }
});

const stockReservationSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number,
  reservedAt: { type: Date, default: Date.now }
});

const statusHistorySchema = new mongoose.Schema({
  status: String,
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String
});

const orderProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number,
  priceAtPurchase: Number,
  discountApplied: { type: Number, default: 0 }
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  orderNumber: { type: String, unique: true, index: true },
  items: [orderProductSchema],
  subtotal: { type: Number, min: 0 },
  tax: { type: Number, min: 0 },
  shippingCost: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  couponCode: String,
  couponDiscount: { type: Number, default: 0 },
  totalAmount: { type: Number, min: 0 },
  status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.PENDING, index: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  paymentStatus: { type: String, enum: ['pending', 'authorized', 'captured', 'failed', 'refunded'], default: 'pending' },
  shippingAddress: addressSchema,
  trackingNumber: String,
  statusHistory: [statusHistorySchema],
  stockReservation: [stockReservationSchema],
  placedAt: { type: Date, default: Date.now },
  deliveredAt: Date,
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date }
}, { timestamps: true });

orderSchema.index({ userId: 1, isDeleted: 1 });
orderSchema.index({ status: 1, isDeleted: 1 });
orderSchema.index({ paymentStatus: 1 });

const OrderModel = mongoose.model('Order', orderSchema);

export { OrderModel };
export default OrderModel;
