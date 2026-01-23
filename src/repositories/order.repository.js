import { OrderModel } from '../models/order.model.js';
import { BaseRepository } from './base.repository.js';

class OrderRepositoryImpl extends BaseRepository {
  async findByUserId(userId, filters = {}) {
    return OrderModel.find({ userId, isDeleted: false, ...filters })
      .populate('items.productId')
      .populate('paymentId')
      .sort({ placedAt: -1 });
  }

  async findByUserIdLean(userId, filters = {}) {
    return OrderModel.find({ userId, isDeleted: false, ...filters })
      .lean()
      .populate('items.productId')
      .populate('paymentId')
      .sort({ placedAt: -1 });
  }

  async findByOrderNumber(orderNumber) {
    return OrderModel.findOne({ orderNumber, isDeleted: false })
      .populate('items.productId')
      .populate('paymentId');
  }

  async countByUserId(userId, filters = {}) {
    return OrderModel.countDocuments({ userId, isDeleted: false, ...filters });
  }

  async findByStatus(status, filters = {}) {
    return OrderModel.find({ status, isDeleted: false, ...filters })
      .populate('items.productId')
      .populate('userId', 'name email phone')
      .sort({ placedAt: -1 });
  }

  async findByPaymentId(paymentId) {
    return OrderModel.findOne({ paymentId, isDeleted: false })
      .populate('items.productId')
      .populate('paymentId');
  }

  async updateStatus(orderId, status, changedBy, notes = '') {
    return OrderModel.findByIdAndUpdate(
      orderId,
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            changedBy,
            notes,
            changedAt: new Date()
          }
        }
      },
      { new: true }
    ).populate('items.productId');
  }

  async addStockReservation(orderId, productId, quantity) {
    return OrderModel.findByIdAndUpdate(
      orderId,
      {
        $push: {
          stockReservation: {
            productId,
            quantity,
            reservedAt: new Date()
          }
        }
      },
      { new: true }
    );
  }

  async updatePaymentStatus(orderId, paymentStatus, paymentId = null) {
    const update = { paymentStatus };
    if (paymentId) update.paymentId = paymentId;
    return OrderModel.findByIdAndUpdate(orderId, update, { new: true });
  }

  async generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${timestamp.slice(-6)}-${random}`;
  }

  async findRecentOrders(limit = 10) {
    return OrderModel.find({ isDeleted: false })
      .lean()
      .populate('userId', 'name email')
      .populate('items.productId', 'name')
      .sort({ placedAt: -1 })
      .limit(limit);
  }
}

export const OrderRepository = new OrderRepositoryImpl(OrderModel);
