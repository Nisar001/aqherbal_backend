import { PaymentModel } from '../models/payment.model.js';
import { BaseRepository } from './base.repository.js';

class PaymentRepositoryImpl extends BaseRepository {
  async findByOrderId(orderId) {
    return PaymentModel.findOne({ orderId, isDeleted: false })
      .populate('orderId')
      .populate('userId', 'name email');
  }

  async findByGatewayTransactionId(gatewayTransactionId) {
    return PaymentModel.findOne({ gatewayTransactionId, isDeleted: false });
  }

  async findByUserId(userId, filters = {}) {
    return PaymentModel.find({ userId, isDeleted: false, ...filters })
      .populate('orderId')
      .sort({ createdAt: -1 });
  }

  async findByStatus(status) {
    return PaymentModel.find({ status, isDeleted: false })
      .populate('orderId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
  }

  async updateStatus(paymentId, status, metadata = {}) {
    const update = { status };
    if (status === 'captured') {
      update.capturedAt = new Date();
    }
    if (metadata) {
      update.metadata = { ...metadata };
    }
    return PaymentModel.findByIdAndUpdate(paymentId, update, { new: true });
  }

  async recordWebhook(paymentId, event, webhookData) {
    return PaymentModel.findByIdAndUpdate(
      paymentId,
      {
        $set: {
          webhookVerified: true,
          webhookData
        },
        $push: {
          metadata: { event, timestamp: new Date() }
        }
      },
      { new: true }
    );
  }

  async incrementRetryCount(paymentId) {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) return null;
    const currentCount = (payment.metadata && payment.metadata.retryCount) || 0;
    return PaymentModel.findByIdAndUpdate(
      paymentId,
      {
        $set: {
          metadata: {
            ...payment.metadata,
            retryCount: currentCount + 1,
            lastRetryAt: new Date()
          }
        }
      },
      { new: true }
    );
  }

  async findFailedPayments(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return PaymentModel.find({
      status: 'failed',
      isDeleted: false,
      createdAt: { $gte: since }
    })
      .populate('orderId')
      .populate('userId', 'email');
  }
}

export const PaymentRepository = new PaymentRepositoryImpl(PaymentModel);
