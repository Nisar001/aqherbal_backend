import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../constants/paymentStatus.js';
import { BUSINESS_CONFIG } from '../config/business.config.js';

const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: BUSINESS_CONFIG.PAYMENT.DEFAULT_CURRENCY },
  status: {
    type: String,
    enum: [...Object.values(PAYMENT_STATUS), 'initiated', 'completed'],
    default: PAYMENT_STATUS.PENDING,
    index: true
  },
  method: { type: String, enum: ['card', 'netbanking', 'upi'], required: true, alias: 'paymentMethod' },
  gatewayTransactionId: String,
  gatewayPaymentId: { type: String, alias: 'razorpayPaymentId' },
  reference: String,
  metadata: mongoose.Schema.Types.Mixed,
  webhookVerified: { type: Boolean, default: false },
  webhookData: mongoose.Schema.Types.Mixed,
  failureReason: String,
  failureCode: String,
  paidAt: Date,
  capturedAt: Date,
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

const PaymentModel = mongoose.model('Payment', paymentSchema);

export { PaymentModel };
export default PaymentModel;
