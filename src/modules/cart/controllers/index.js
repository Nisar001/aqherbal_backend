import { CartService } from '../../../services/cart.service.js';
import { responseHelper } from '../../../helpers/response.helper.js';
import { validateAddToCart, validateUpdateCart } from '../../../validations/cart.validation.js';

const getRequestUserId = (req) => req.user?._id || req.user?.id || req.user?.userId;
const withLegacyTotals = (cart) => ({
  ...cart,
  totalPrice: cart.total ?? cart.subtotal ?? 0
});

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
