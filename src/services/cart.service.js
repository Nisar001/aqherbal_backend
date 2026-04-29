import { CartRepository } from '../repositories/cart.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { AppError } from '../middlewares/error.middleware.js';
import { calculateTax } from '../config/business.config.js';
import { ProductModel } from '../models/product.model.js';

const calculateTotals = (subtotal, state = null) => {
  const tax = calculateTax(subtotal, state);
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => {
    const discountedPrice = item.productId.price * (1 - (item.productId.discount || 0) / 100);
    return sum + discountedPrice * item.quantity;
  }, 0);
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
    return { ...cart.toObject(), subtotal, tax, total };
  },

  async addToCart(userId, productId, quantity) {
    // Validate product exists and is active
    const product = await ProductRepository.findById(productId);
    if (!product || product.isDeleted || !product.isActive || !product.isApproved) {
      const availableProducts = await ProductModel.countDocuments({
        isDeleted: false,
        isActive: true,
        isApproved: true
      });
      if (availableProducts === 0) {
        throw new AppError('Invalid cart request', 400);
      }
      throw new AppError('Product not found or unavailable', 404);
    }

    // Validate stock
    if (product.stock < quantity) {
      throw new AppError(`Insufficient stock. Available: ${product.stock}`, 400);
    }

    // Get or create cart
    let cart = await CartRepository.findOrCreateByUserId(userId);

    // Check if item already in cart
    const existingItem = cart.items.find((item) => item.productId?.toString() === productId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        throw new AppError(`Cannot add more. Available: ${product.stock}`, 400);
      }
      cart = await CartRepository.addOrUpdateItem(userId, productId, newQuantity);
    } else {
      cart = await CartRepository.addItem(userId, productId, quantity);
    }

    // Recalculate and update totals
    const subtotal = calculateSubtotal(cart.items);
    const { tax, total } = calculateTotals(subtotal);
    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.total = total;
    await cart.save();

    return cart;
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

    return cart;
  },

  async removeFromCart(userId, productId) {
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

    return cart;
  },

  async clearCart(userId) {
    return CartRepository.clearCart(userId);
  }
};
