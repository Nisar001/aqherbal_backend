import { OrderService } from '../../../services/order.service.js';
import { validateCreateOrder, validateUpdateOrderStatus, validateCancelOrder } from '../../../validations/order.validation.js';
import { response } from '../../../helpers/response.helper.js';
import { calculatePagination, buildPaginationMeta } from '../../../helpers/pagination.helper.js';

export const createOrder = async (req, res, next) => {
  try {
    const { error, value } = validateCreateOrder(req.body);
    if (error) {
      return response(res, 400, 'Validation error', null, error.details);
    }

    const order = await OrderService.createOrderFromCart(req.user.id, value.shippingAddress, value.couponCode);
    response(res, 201, 'Order created successfully', order);
  } catch (err) {
    next(err);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const { page, limit } = calculatePagination(req.query, 10, 50);

    const result = await OrderService.getUserOrders(req.user.id, page, limit);
    const pagination = buildPaginationMeta(result.total, page, limit);
    response(res, 200, 'Orders retrieved successfully', { orders: result.orders, pagination });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await OrderService.getOrderById(req.params.id);

    if (!order) {
      return response(res, 404, 'Order not found', null);
    }

    // Check ownership (user can only see their own orders; admin can see all)
    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return response(res, 403, 'Forbidden', null);
    }

    response(res, 200, 'Order retrieved successfully', order);
  } catch (err) {
    next(err);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { error, value } = validateCancelOrder(req.body);
    if (error) {
      return response(res, 400, 'Validation error', null, error.details);
    }

    const order = await OrderService.cancelOrder(req.params.id, req.user.id, value.reason);
    response(res, 200, 'Order cancelled successfully', order);
  } catch (err) {
    next(err);
  }
};

// Admin only
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { error, value } = validateUpdateOrderStatus(req.body);
    if (error) {
      return response(res, 400, 'Validation error', null, error.details);
    }

    const order = await OrderService.updateOrderStatus(
      req.params.id,
      value.status,
      req.user.id,
      value.notes
    );
    response(res, 200, 'Order status updated', order);
  } catch (err) {
    next(err);
  }
};

export const getOrdersByStatus = async (req, res, next) => {
  try {
    const { calculatePagination, buildPaginationMeta } = await import('../../../helpers/pagination.helper.js');
    const { status } = req.params;
    const { page, limit } = calculatePagination(req.query, 20, 100);

    const result = await OrderService.getOrdersByStatus(status, page, limit);
    const pagination = buildPaginationMeta(result.total, page, limit);
    response(res, 200, 'Orders retrieved', { orders: result.orders, pagination });
  } catch (err) {
    next(err);
  }
};

export const getRecentOrders = async (req, res, next) => {
  try {
    const { calculatePagination, buildPaginationMeta } = await import('../../../helpers/pagination.helper.js');
    const { page, limit } = calculatePagination(req.query, 10, 50);

    const result = await OrderService.getRecentOrders(page, limit);
    const pagination = buildPaginationMeta(result.total, page, limit);
    response(res, 200, 'Recent orders retrieved', { orders: result.orders, pagination });
  } catch (err) {
    next(err);
  }
};
