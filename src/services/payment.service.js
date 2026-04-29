import dotenv from 'dotenv';
dotenv.config();
import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { OrderService } from './order.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import { PAYMENT_STATUS } from '../constants/paymentStatus.js';
import { BUSINESS_CONFIG } from '../config/business.config.js';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
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
    const validMethods = BUSINESS_CONFIG.PAYMENT.SUPPORTED_METHODS;
    if (!validMethods.includes(method)) {
      throw new AppError('Invalid payment method', 400);
    }

    // 2. Create payment record
    const payment = await PaymentRepository.create({
      orderId,
      userId,
      amount: order.totalAmount,
      currency: BUSINESS_CONFIG.PAYMENT.DEFAULT_CURRENCY,
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
      if (BUSINESS_CONFIG.PAYMENT.RAZORPAY_METHODS.includes(method)) {
        paymentIntent = await this.createRazorpayOrder(order, payment);
      } else {
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
      if (process.env.NODE_ENV === 'test') {
        await PaymentRepository.updateById(payment._id, {
          gatewayTransactionId: `order_test_${payment._id}`,
          metadata: {
            ...payment.metadata,
            razorpayOrderId: `order_test_${payment._id}`,
            keyId: 'rzp_test_key'
          }
        });

        return {
          paymentId: payment._id,
          razorpayOrderId: `order_test_${payment._id}`,
          razorpayKeyId: 'rzp_test_key',
          amount: order.totalAmount,
          currency: 'INR',
          orderId: order._id,
          method: payment.method
        };
      }

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

      await PaymentRepository.updateById(payment._id, {
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

  async verifyRazorpayWebhook(signature, body, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
    if (!signature || !secret) {
      throw new AppError('Missing Razorpay webhook signature or secret', 400);
    }
    const payload = Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body);
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    if (expected !== signature) {
      throw new AppError('Invalid Razorpay webhook signature', 400);
    }
    return true;
  },

  async verifyStripeWebhook(signature, payload, secret = process.env.STRIPE_WEBHOOK_SECRET) {
    if (!signature || !secret) {
      throw new AppError('Missing Stripe webhook signature or secret', 400);
    }
    const rawPayload = Buffer.isBuffer(payload) || typeof payload === 'string'
      ? payload
      : JSON.stringify(payload);
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' });
      return stripe.webhooks.constructEvent(rawPayload, signature, secret);
    } catch (error) {
      throw new AppError(`Stripe webhook verification failed: ${error.message}`, 400);
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

    // Send email notification for order confirmation
    try {
      const { sendPaymentSuccessEmail } = await import('./email.service.js');
      const order = await OrderService.getOrderById(payment.orderId);
      const user = order.userId;

      await sendPaymentSuccessEmail({
        to: user.email,
        name: user.name || user.firstName || 'Customer',
        orderNumber: order.orderNumber,
        amount: updatedPayment.amount,
        paymentMethod: updatedPayment.method
      });
    } catch (emailError) {
      // Log but don't throw - payment already succeeded
      console.error('Failed to send payment success email:', emailError.message);
    }

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

    // Send email notification for payment failure
    try {
      const { sendPaymentFailedEmail } = await import('./email.service.js');
      const order = await OrderService.getOrderById(payment.orderId);
      const user = order.userId;

      await sendPaymentFailedEmail({
        to: user.email,
        name: user.name || user.firstName || 'Customer',
        orderNumber: order.orderNumber,
        amount: updatedPayment.amount,
        reason
      });
    } catch (emailError) {
      // Log but don't throw - payment failure already recorded
      console.error('Failed to send payment failure email:', emailError.message);
    }

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

    const retries = (payment.metadata && payment.metadata.retryCount) || 0;
    if (retries >= BUSINESS_CONFIG.PAYMENT.MAX_RETRY_ATTEMPTS) {
      throw new AppError('Retry limit reached for this payment', 400);
    }

    const windowMs = BUSINESS_CONFIG.PAYMENT.RETRY_WINDOW_HOURS * 60 * 60 * 1000;
    if (Date.now() - payment.createdAt.getTime() > windowMs) {
      throw new AppError('Payment is too old to retry', 400);
    }

    await PaymentRepository.incrementRetryCount(paymentId);

    const order = await OrderRepository.findById(payment.orderId);
    return this.initiatePayment(userId, order._id, payment.method);
  },

  async getFailedPayments(hours = 24) {
    return PaymentRepository.findFailedPayments(hours);
  }
};
