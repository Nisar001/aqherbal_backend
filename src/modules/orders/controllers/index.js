import { OrderService } from '../../../services/order.service.js';
import { validateCreateOrderRequest, validateUpdateOrderStatus, validateCancelOrder } from '../../../validations/order.validation.js';
import { response } from '../../../helpers/response.helper.js';
import { calculatePagination, buildPaginationMeta } from '../../../helpers/pagination.helper.js';
import UserModel from '../../../models/user.model.js';

const getRequestUserId = (req) => req.user?.id || req.user?._id || req.user?.userId;

export const createOrder = async (req, res, next) => {
  try {
    let requestBody = req.body;

    if (!requestBody.shippingAddress && requestBody.shippingAddressId) {
      const user = await UserModel.findById(getRequestUserId(req));
      const selectedAddress = user?.addresses?.find(
        (address) => address._id?.toString() === requestBody.shippingAddressId
      );

      if (selectedAddress) {
        requestBody = {
          ...requestBody,
          shippingAddress: selectedAddress.toObject ? selectedAddress.toObject() : selectedAddress
        };
      }
    }

    const { error, value } = validateCreateOrderRequest(requestBody);
    if (error) {
      return response(res, 400, error.details[0]?.message || 'Validation error', null, error.details);
    }

    const order = await OrderService.createOrderFromCart(
      getRequestUserId(req),
      value.shippingAddress,
      value.couponCode,
      value.paymentMethod
    );
    response(res, 201, 'Order created successfully', {
      ...order.toObject(),
      orderId: order._id
    });
  } catch (err) {
    next(err);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const { page, limit } = calculatePagination(req.query, 10, 50);

    const result = await OrderService.getUserOrders(getRequestUserId(req), page, limit, { status: req.query.status });
    const pagination = buildPaginationMeta(result.total, page, limit);
    return res.status(200).json({
      success: true,
      data: result.orders,
      pagination,
      message: 'Orders retrieved successfully'
    });
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
    if (order.userId.toString() !== getRequestUserId(req) && req.user.role !== 'admin') {
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

    const order = await OrderService.cancelOrder(req.params.id, getRequestUserId(req), value.reason);
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
