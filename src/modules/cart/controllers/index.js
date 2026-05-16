import { CartService } from '../../../services/cart.service.js';
import { responseHelper } from '../../../helpers/response.helper.js';
import { validateAddToCart, validateUpdateCart } from '../../../validations/cart.validation.js';

const getRequestUserId = (req) => req.user?._id || req.user?.id || req.user?.userId;
const withLegacyTotals = (cart) => {
  const plain = typeof cart.toObject === 'function' ? cart.toObject() : cart;
  return {
    ...plain,
    totalPrice: plain.subtotal ?? plain.total ?? 0
  };
};

export const getCart = async (req, res, next) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return responseHelper.unauthorized(res, 'Authentication required');

    const cart = await CartService.getCart(userId);
    return responseHelper.success(res, withLegacyTotals(cart), 'Cart fetched');
  } catch (err) {
    next(err);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return responseHelper.unauthorized(res, 'Authentication required');

    const { error } = validateAddToCart(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);

    const cart = await CartService.addToCart(userId, req.body.productId, req.body.quantity);
    return responseHelper.success(res, withLegacyTotals(cart), 'Item added to cart');
  } catch (err) {
    next(err);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return responseHelper.unauthorized(res, 'Authentication required');

    const { productId } = req.params;
    const { error } = validateUpdateCart(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);

    const cart = await CartService.updateItemQuantity(userId, productId, req.body.quantity);
    return responseHelper.success(res, withLegacyTotals(cart), 'Cart item updated');
  } catch (err) {
    next(err);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return responseHelper.unauthorized(res, 'Authentication required');

    const { productId } = req.params;
    const cart = await CartService.removeFromCart(userId, productId);
    return responseHelper.success(res, withLegacyTotals(cart), 'Item removed from cart');
  } catch (err) {
    next(err);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return responseHelper.unauthorized(res, 'Authentication required');

    const cart = await CartService.clearCart(userId);
    return responseHelper.success(
      res,
      withLegacyTotals(cart || { items: [], total: 0, subtotal: 0 }),
      'Cart cleared'
    );
  } catch (err) {
    next(err);
  }
};

export const applyCoupon = async (req, res, next) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return responseHelper.unauthorized(res, 'Authentication required');

    const { code } = req.body;
    if (!code) return responseHelper.validationError(res, 'Coupon code is required');

    // Get the user's cart
    const cart = await CartService.getCart(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Validate and apply coupon
    const { CouponService } = await import('../../../services/coupon.service.js');
    const result = await CouponService.validateAndApplyCoupon(
      code,
      userId,
      cart.subtotal || cart.total || 0,
      cart.items
    );

    return responseHelper.success(res, {
      ...withLegacyTotals(cart),
      appliedCoupon: result.code,
      discountAmount: result.discountAmount,
      subtotal: cart.subtotal || 0,
      finalAmount: result.finalTotal
    }, 'Coupon applied successfully');
  } catch (err) {
    next(err);
  }
};
