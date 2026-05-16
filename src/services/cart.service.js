import { CartRepository } from '../repositories/cart.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { AppError } from '../middlewares/error.middleware.js';
import { calculateTax } from '../config/business.config.js';

const calculateTotals = (subtotal, state = null) => {
  const tax = calculateTax(subtotal, state);
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

// Helper to get price from item (handles populated or unpopulated productId)
const getItemPrice = (item) => {
  if (item.productId && typeof item.productId === 'object' && item.productId.price) {
    return item.productId.price;
  }
  return item.price || 0;
};

const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => {
    const price = getItemPrice(item);
    const discount = (item.productId && typeof item.productId === 'object' ? item.productId.discount : 0) || 0;
    const discountedPrice = price * (1 - discount / 100);
    return sum + discountedPrice * item.quantity;
  }, 0);
};

// Normalize cart to return productId as string ID in items (not populated object)
const normalizeCart = (cart) => {
  const obj = typeof cart.toObject === 'function' ? cart.toObject() : cart;
  const items = (obj.items || []).map(item => ({
    ...item,
    productId: item.productId?._id || item.productId
  }));
  return { ...obj, items };
};

export const CartService = {
  async getCart(userId) {
    const cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      return { items: [], subtotal: 0, tax: 0, total: 0 };
    }
    // Recalculate totals
    const subtotal = calculateSubtotal(cart.items);
    const { tax, total } = calculateTotals(subtotal);
    return { ...normalizeCart(cart), subtotal, tax, total };
  },

  async addToCart(userId, productId, quantity) {
    // Validate product exists and is active
    const product = await ProductRepository.findById(productId);
    if (!product || product.isDeleted || !product.isActive || !product.isApproved) {
      if (!product || product.isDeleted) {
        throw new AppError('Product not found or unavailable', 404);
      }
      throw new AppError('Product not available (inactive or not approved)', 400);
    }

    // Validate stock
    if (product.stock < quantity) {
      throw new AppError(`Insufficient stock. Available: ${product.stock}`, 400);
    }

    // Ensure cart exists
    await CartRepository.findOrCreateByUserId(userId);

    // Use atomic $inc to handle concurrent requests safely
    // Validates stock against new total after increment
    let cart = await CartRepository.incrementItemQuantity(userId, productId, quantity);

    // After atomic increment, validate total quantity vs stock
    if (cart) {
      const updatedItem = cart.items.find((item) => {
        const itemProductId = item.productId?._id?.toString() || item.productId?.toString();
        return itemProductId === productId.toString();
      });
      if (updatedItem && updatedItem.quantity > product.stock) {
        // Roll back: set to max allowed
        cart = await CartRepository.addOrUpdateItem(userId, productId, product.stock);
        throw new AppError(`Cannot add more. Available: ${product.stock}`, 400);
      }
    }

    // Recalculate and update totals
    const subtotal = calculateSubtotal(cart.items);
    const { tax, total } = calculateTotals(subtotal);
    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.total = total;
    await cart.save();

    return normalizeCart(cart);
  },

  async updateItemQuantity(userId, productId, quantity) {
    // Validate product and stock
    const product = await ProductRepository.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError('Product not found', 404);
    }

    if (quantity > product.stock) {
      throw new AppError(`Insufficient stock. Available: ${product.stock}`, 400);
    }

    // Update cart
    const cart = await CartRepository.addOrUpdateItem(userId, productId, quantity);
    if (!cart) {
      throw new AppError('Product not in cart', 404);
    }

    // Recalculate totals
    const subtotal = calculateSubtotal(cart.items);
    const { tax, total } = calculateTotals(subtotal);
    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.total = total;
    await cart.save();

    return normalizeCart(cart);
  },

  async removeFromCart(userId, productId) {
    // First check cart exists and has the item
    const existingCart = await CartRepository.findByUserId(userId);
    if (!existingCart) {
      throw new AppError('Cart not found', 404);
    }

    const hasItem = existingCart.items.some((item) => {
      const itemProductId = item.productId?._id?.toString() || item.productId?.toString();
      return itemProductId === productId.toString();
    });

    if (!hasItem) {
      throw new AppError('Product not found in cart', 404);
    }

    const cart = await CartRepository.removeItem(userId, productId);
    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    // Recalculate totals
    if (cart.items.length === 0) {
      cart.subtotal = 0;
      cart.tax = 0;
      cart.total = 0;
    } else {
      const subtotal = calculateSubtotal(cart.items);
      const { tax, total } = calculateTotals(subtotal);
      cart.subtotal = subtotal;
      cart.tax = tax;
      cart.total = total;
    }
    await cart.save();

    return normalizeCart(cart);
  },

  async clearCart(userId) {
    return CartRepository.clearCart(userId);
  }
};

