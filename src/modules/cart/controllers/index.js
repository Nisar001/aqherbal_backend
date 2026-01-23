import { CartService } from '../../../services/cart.service.js';
import { responseHelper } from '../../../helpers/response.helper.js';
import { validateAddToCart, validateUpdateCart } from '../../../validations/cart.validation.js';

export const getCart = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) return responseHelper.unauthorized(res, 'Authentication required');

    const cart = await CartService.getCart(userId);
    return responseHelper.success(res, cart, 'Cart fetched');
  } catch (err) {
    next(err);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) return responseHelper.unauthorized(res, 'Authentication required');

    const { error } = validateAddToCart(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);

    const cart = await CartService.addToCart(userId, req.body.productId, req.body.quantity);
    return responseHelper.success(res, cart, 'Item added to cart', 201);
  } catch (err) {
    next(err);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) return responseHelper.unauthorized(res, 'Authentication required');

    const { productId } = req.params;
    const { error } = validateUpdateCart(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);

    const cart = await CartService.updateItemQuantity(userId, productId, req.body.quantity);
    return responseHelper.success(res, cart, 'Cart item updated');
  } catch (err) {
    next(err);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) return responseHelper.unauthorized(res, 'Authentication required');

    const { productId } = req.params;
    const cart = await CartService.removeFromCart(userId, productId);
    return responseHelper.success(res, cart, 'Item removed from cart');
  } catch (err) {
    next(err);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) return responseHelper.unauthorized(res, 'Authentication required');

    const cart = await CartService.clearCart(userId);
    return responseHelper.success(res, cart, 'Cart cleared');
  } catch (err) {
    next(err);
  }
};
