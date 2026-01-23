import { jest } from '@jest/globals';
import { CartService } from '../src/services/cart.service.js';
import * as CartRepositoryModule from '../src/repositories/cart.repository.js';
import * as ProductRepositoryModule from '../src/repositories/product.repository.js';

describe('CartService', () => {
  test('addToCart: validates stock availability', async () => {
    const mockProduct = {
      _id: 'prod123',
      name: 'Turmeric',
      price: 30,
      discount: 10,
      stock: 5,
      isDeleted: false,
      isActive: true,
      isApproved: true
    };

    const mockCart = {
      _id: 'cart123',
      userId: 'user123',
      items: [],
      save: jest.fn().mockResolvedValue({}),
      toObject: jest.fn().mockReturnValue({})
    };

    jest.spyOn(ProductRepositoryModule.ProductRepository, 'findById').mockResolvedValue(mockProduct);
    jest.spyOn(CartRepositoryModule.CartRepository, 'findOrCreateByUserId').mockResolvedValue(mockCart);
    jest.spyOn(CartRepositoryModule.CartRepository, 'addItem').mockResolvedValue(mockCart);

    try {
      await CartService.addToCart('user123', 'prod123', 10); // More than stock
      expect(true).toBe(false); // Should throw
    } catch (err) {
      expect(err.message).toContain('Insufficient stock');
    }
  });

  test('addToCart: calculates totals with tax', async () => {
    const mockProduct = {
      _id: 'prod123',
      price: 100,
      discount: 10,
      stock: 50,
      isDeleted: false,
      isActive: true,
      isApproved: true
    };

    const mockCart = {
      _id: 'cart123',
      userId: 'user123',
      items: [{ productId: mockProduct, quantity: 2 }],
      subtotal: 0,
      tax: 0,
      total: 0,
      save: jest.fn().mockResolvedValue({}),
      toObject: jest.fn().mockReturnValue({})
    };

    jest.spyOn(ProductRepositoryModule.ProductRepository, 'findById').mockResolvedValue(mockProduct);
    jest.spyOn(CartRepositoryModule.CartRepository, 'findOrCreateByUserId').mockResolvedValue(mockCart);
    jest.spyOn(CartRepositoryModule.CartRepository, 'addItem').mockResolvedValue(mockCart);

    const result = await CartService.addToCart('user123', 'prod123', 2);
    expect(result.subtotal).toBe(180); // 100 * 0.9 * 2
    expect(result.tax).toBe(18); // 180 * 0.1
    expect(result.total).toBe(198); // 180 + 18
  });

  test('getCart: returns empty cart when no cart exists', async () => {
    jest.spyOn(CartRepositoryModule.CartRepository, 'findByUserId').mockResolvedValue(null);

    const result = await CartService.getCart('user123');
    expect(result.items).toEqual([]);
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });
});
