import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String
});

const orderProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number,
  price: Number
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  products: [orderProductSchema],
  totalAmount: Number,
  status: { type: String, default: 'pending' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  shippingAddress: addressSchema,
  trackingNumber: String,
  placedAt: { type: Date, default: Date.now },
  deliveredAt: Date,
  updatedAt: { type: Date, default: Date.now }
});

export const OrderModel = mongoose.model('Order', orderSchema);
