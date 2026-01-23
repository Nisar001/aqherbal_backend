import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { OrderService } from './order.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import { PAYMENT_STATUS } from '../constants/paymentStatus.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

export const PaymentService = {
  async initiatePayment(userId, orderId, method) {
    // 1. Validate order exists and belongs to user
    const order = await OrderRepository.findById(orderId);
    if (!order || order.userId.toString() !== userId) {
      throw new AppError('Order not found', 404);
    }

    if (order.paymentStatus !== 'pending') {
      throw new AppError('Payment already processed for this order', 400);
    }

    // Validate payment method
    const validMethods = ['card', 'netbanking', 'upi', 'wallet'];
    if (!validMethods.includes(method)) {
      throw new AppError('Invalid payment method', 400);
    }

    // 2. Create payment record
    const payment = await PaymentRepository.create({
      orderId,
      userId,
      amount: order.totalAmount,
      currency: 'INR',
      method,
      status: PAYMENT_STATUS.PENDING,
      metadata: {
        orderNumber: order.orderNumber,
        initiatedAt: new Date()
      }
    });

    // 3. Generate payment intent based on method
    let paymentIntent;
    try {
      switch (method) {
      case 'card':
      case 'netbanking':
      case 'upi':
        // All Razorpay methods
        paymentIntent = await this.createRazorpayOrder(order, payment);
        break;
      case 'wallet':
        paymentIntent = await this.processWalletPayment(userId, order, payment);
        break;
      default:
        throw new AppError('Invalid payment method', 400);
      }
    } catch (err) {
      // Mark payment as failed
      await PaymentRepository.updateStatus(payment._id, PAYMENT_STATUS.FAILED, {
        error: err.message
      });
      throw err;
    }

    return paymentIntent;
  },

  async createRazorpayOrder(order, payment) {
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });

      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(order.totalAmount * 100), // paise
        currency: 'INR',
        receipt: payment._id.toString(),
        notes: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          userId: order.userId.toString()
        }
      });

      await PaymentRepository.findByIdAndUpdate(payment._id, {
        gatewayTransactionId: razorpayOrder.id,
        metadata: {
          ...payment.metadata,
          razorpayOrderId: razorpayOrder.id,
          keyId: process.env.RAZORPAY_KEY_ID
        }
      });

      return {
        paymentId: payment._id,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amount: order.totalAmount,
        currency: 'INR',
        orderId: order._id,
        method: payment.method
      };
    } catch (error) {
      throw new AppError(`Razorpay order creation failed: ${error.message}`, 500);
    }
  },

  async processWalletPayment(_userId, _order, _payment) {
    // TODO: Implement wallet payment (requires user wallet model)
    throw new AppError('Wallet payment not yet implemented', 501);
  },

  async verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, signature) {
    try {
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new AppError('Invalid payment signature', 400);
      }

      return true;
    } catch (error) {
      throw new AppError(`Signature verification failed: ${error.message}`, 400);
    }
  },

  async captureRazorpayPayment(razorpayPaymentId) {
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      const payment = await razorpay.payments.fetch(razorpayPaymentId);

      if (payment.status === 'captured') {
        return payment;
      }

      if (payment.status !== 'authorized') {
        throw new AppError(`Invalid payment status: ${payment.status}`, 400);
      }

      const capturedPayment = await razorpay.payments.capture(razorpayPaymentId, payment.amount);
      return capturedPayment;
    } catch (error) {
      throw new AppError(`Failed to capture payment: ${error.message}`, 500);
    }
  },

  async handlePaymentSuccess(paymentId, transactionId) {
    const payment = await PaymentRepository.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    // Update payment status
    const updatedPayment = await PaymentRepository.updateStatus(
      paymentId,
      PAYMENT_STATUS.CAPTURED,
      { transactionId, successAt: new Date() }
    );

    // Update order status and handle stock deduction
    await OrderService.handlePaymentSuccess(payment.orderId, paymentId);

    // TODO: Queue email notification for order confirmation

    return updatedPayment;
  },

  async handlePaymentFailure(paymentId, reason = '') {
    const payment = await PaymentRepository.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    // Update payment status
    const updatedPayment = await PaymentRepository.updateStatus(
      paymentId,
      PAYMENT_STATUS.FAILED,
      {
        failureReason: reason,
        failureAt: new Date()
      }
    );

    // Release stock reservation
    await OrderService.handlePaymentFailure(payment.orderId, reason);

    // TODO: Queue email notification for payment failure

    return updatedPayment;
  },

  async getPaymentHistory(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const payments = await PaymentRepository.findByUserId(userId);
    const total = payments.length;

    return {
      payments: payments.slice(skip, skip + limit),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async retryPayment(paymentId, userId) {
    const payment = await PaymentRepository.findById(paymentId);
    if (!payment || payment.userId.toString() !== userId) {
      throw new AppError('Payment not found', 404);
    }

    if (payment.status !== PAYMENT_STATUS.FAILED) {
      throw new AppError('Only failed payments can be retried', 400);
    }

    const order = await OrderRepository.findById(payment.orderId);
    return this.initiatePayment(userId, order._id, payment.method);
  }
};
