import { CartModel } from '../models/cart.model.js';
import { BaseRepository } from './base.repository.js';

class CartRepositoryImpl extends BaseRepository {
  async findByUserId(userId) {
    return CartModel.findOne({ userId, isDeleted: false }).populate('items.productId');
  }

  async findOrCreateByUserId(userId) {
    let cart = await this.findByUserId(userId);
    if (!cart) {
      cart = await CartModel.create({ userId, items: [] });
    }
    return cart;
  }

  async addOrUpdateItem(userId, productId, quantity) {
    return CartModel.findOneAndUpdate(
      { userId, isDeleted: false, 'items.productId': productId },
      { $set: { 'items.$.quantity': quantity }, updatedAt: new Date() },
      { new: true }
    ).populate('items.productId');
  }

  async addItem(userId, productId, quantity) {
    return CartModel.findOneAndUpdate(
      { userId, isDeleted: false },
      { $push: { items: { productId, quantity } }, updatedAt: new Date() },
      { new: true }
    ).populate('items.productId');
  }

  async removeItem(userId, productId) {
    return CartModel.findOneAndUpdate(
      { userId, isDeleted: false },
      { $pull: { items: { productId } }, updatedAt: new Date() },
      { new: true }
    ).populate('items.productId');
  }

  async clearCart(userId) {
    return CartModel.findOneAndUpdate(
      { userId },
      { items: [], subtotal: 0, tax: 0, total: 0, updatedAt: new Date() },
      { new: true }
    );
  }
}

export const CartRepository = new CartRepositoryImpl(CartModel);
