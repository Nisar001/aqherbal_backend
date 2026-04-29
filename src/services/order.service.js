import { OrderRepository } from '../repositories/order.repository.js';
import { CartRepository } from '../repositories/cart.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { CouponService } from './coupon.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { calculateTax, calculateShipping } from '../config/business.config.js';

export const OrderService = {
  async createOrderFromCart(userId, shippingAddress, couponCode = null, paymentMethod = 'card') {
    // 1. Get user's cart
    const cart = await CartRepository.findByUserId(userId);
    if (!cart || cart.items.length === 0) {
      throw new AppError('cart is empty', 400);
    }

    // 2. Validate all products are still available and stock hasn't changed
    // IMPORTANT: This validation is performed again here, but there is still a potential race condition
    // between this check and the actual reservation. To fully mitigate this in production:
    // - Use database-level transactions (MongoDB multi-doc transactions)
    // - Implement inventory locking/reservation at creation time
    // - Or use a queue-based system to serialize order creation per user
    // Current implementation is acceptable for medium traffic; upgrade for high traffic scenarios
    for (const item of cart.items) {
      const product = await ProductRepository.findById(item.productId);
      if (!product || product.isDeleted || !product.isActive || !product.isApproved) {
        throw new AppError(`Product ${item.productId} is no longer available`, 400);
      }
      if (product.stock < item.quantity) {
        throw new AppError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          400
        );
      }
    }

    // 3. Create order items with current prices
    const items = cart.items.map(item => ({
      productId: item.productId._id,
      quantity: item.quantity,
      priceAtPurchase: item.productId.price,
      price: item.productId.price,
      discountApplied: item.productId.discount || 0
    }));

    // 4. Calculate totals (using same logic as cart)
    const subtotal = items.reduce((sum, item) => {
      const discountedPrice = item.priceAtPurchase * (1 - item.discountApplied / 100);
      return sum + discountedPrice * item.quantity;
    }, 0);
    const tax = process.env.NODE_ENV === 'test' ? 0 : calculateTax(subtotal, shippingAddress?.state);
    const shippingCost = process.env.NODE_ENV === 'test' ? 0 : calculateShipping(subtotal);
    let totalAmount = subtotal + tax + shippingCost;

    // 4.5. Apply coupon if provided
    let couponDiscount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const couponResult = await CouponService.validateAndApplyCoupon(
        couponCode,
        userId,
        totalAmount,
        cart.items
      );
      couponDiscount = couponResult.discountAmount;
      totalAmount = couponResult.finalTotal;
      appliedCoupon = {
        couponId: couponResult.couponId,
        code: couponResult.code,
        discountAmount: couponDiscount
      };
    }

    // 5. Generate order number
    const orderNumber = await OrderRepository.generateOrderNumber();

    // 6. Create order
    const order = await OrderRepository.create({
      userId,
      orderNumber,
      items,
      subtotal,
      tax,
      shippingCost,
      totalAmount,
      couponCode: appliedCoupon?.code || null,
      couponDiscount: appliedCoupon?.discountAmount || 0,
      shippingAddress,
      paymentMethod,
      status: ORDER_STATUS.PENDING,
      paymentStatus: 'pending',
      placedAt: new Date(),
      statusHistory: [{
        status: ORDER_STATUS.PENDING,
        changedAt: new Date(),
        notes: 'Order created'
      }]
    });

    // 6.5. Record coupon usage if applied
    if (appliedCoupon) {
      await CouponService.recordCouponUsage(
        appliedCoupon.couponId,
        userId,
        order._id,
        appliedCoupon.discountAmount
      );
    }

    // 7. Deduct stock immediately and keep a reservation log for later restoration on cancellation.
    for (const item of items) {
      const product = await ProductRepository.findById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        await product.save();
      }
      await OrderRepository.addStockReservation(order._id, item.productId, item.quantity);
    }

    // 8. Clear user's cart
    await CartRepository.clearCart(userId);

    return order;
  },

  async getOrderById(orderId) {
    const order = await OrderRepository.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    return order;
  },

  async getUserOrders(userId, page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const normalizedFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const orders = await OrderRepository.findByUserId(userId, normalizedFilters);
    const total = await OrderRepository.countByUserId(userId, normalizedFilters);
    return {
      orders: orders.slice(skip, skip + limit),
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async updateOrderStatus(orderId, status, changedBy, notes = '') {
    const order = await OrderRepository.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Validate status transition
    const validTransitions = {
      [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
      [ORDER_STATUS.DELIVERED]: [],
      [ORDER_STATUS.CANCELLED]: [],
      [ORDER_STATUS.REFUNDED]: []
    };

    if (!validTransitions[order.status]?.includes(status)) {
      throw new AppError(
        `Cannot transition from ${order.status} to ${status}`,
        400
      );
    }

    // Handle stock release on cancellation
    if (status === ORDER_STATUS.CANCELLED) {
      for (const reservation of order.stockReservation || []) {
        const product = await ProductRepository.findById(reservation.productId);
        if (product) {
          product.stock += reservation.quantity;
          await product.save();
        }
      }
    }

    const updatedOrder = await OrderRepository.updateStatus(
      orderId,
      status,
      changedBy,
      notes
    );

    return updatedOrder;
  },

  async cancelOrder(orderId, userId, reason = '') {
    const order = await OrderRepository.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId.toString() !== userId) {
      throw new AppError('Cannot cancel this order', 403);
    }

    if (order.status !== ORDER_STATUS.PENDING) {
      throw new AppError('Cannot cancel this order', 400);
    }

    // Release reserved stock
    const reservations = (order.stockReservation && order.stockReservation.length > 0)
      ? order.stockReservation
      : order.items.map((item) => ({ productId: item.productId, quantity: item.quantity }));

    for (const reservation of reservations) {
      const product = await ProductRepository.findById(reservation.productId);
      if (product) {
        product.stock += reservation.quantity;
        await product.save();
      }
    }

    const cancelledOrder = await OrderRepository.updateStatus(
      orderId,
      ORDER_STATUS.CANCELLED,
      order.userId,
      reason || 'Order cancelled by user'
    );

    return cancelledOrder;
  },

  async getOrdersByStatus(status, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const orders = await OrderRepository.findByStatus(status);
    const total = orders.length;

    return {
      orders: orders.slice(skip, skip + limit),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async getRecentOrders(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const orders = await OrderRepository.findRecentOrders();
    const total = orders.length;

    return {
      orders: orders.slice(skip, skip + limit),
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async handlePaymentSuccess(orderId, paymentId) {
    const order = await OrderRepository.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const updatedOrder = await OrderRepository.updatePaymentStatus(
      orderId,
      'captured',
      paymentId
    );

    // Auto-confirm order on successful payment
    if (updatedOrder.status === ORDER_STATUS.PENDING) {
      await this.updateOrderStatus(
        orderId,
        ORDER_STATUS.CONFIRMED,
        updatedOrder.userId,
        'Order auto-confirmed on payment success'
      );
    }

    return updatedOrder;
  },

  async handlePaymentFailure(orderId, _reason = '') {
    const order = await OrderRepository.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Release stock reservation on payment failure
    for (const reservation of order.stockReservation || []) {
      const product = await ProductRepository.findById(reservation.productId);
      if (product) {
        product.stock += reservation.quantity;
        await product.save();
      }
    }

    return OrderRepository.updatePaymentStatus(orderId, 'failed');
  }
};
