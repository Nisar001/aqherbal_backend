/**
 * Cart Tests
 * Tests: Add to cart, Update cart, Remove from cart, Clear cart
 */

import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../src/server.js';
import Cart from '../src/models/cart.model.js';
import Product from '../src/models/product.model.js';
import User from '../src/models/user.model.js';
import Category from '../src/models/category.model.js';
import { generateTestToken } from './setup.js';

describe('🛒 Shopping Cart', () => {
  
  let userToken;
  let userId;
  let product;
  let user;

  beforeEach(async () => {
    // Create user
    user = await User.create({
      email: 'cart@test.com',
      password: 'SecurePass123!',
      name: 'John',
    });
    userId = user._id.toString();
    userToken = generateTestToken(userId, 'user');

    // Create category
    const category = await Category.create({
      name: 'Herbs',
      slug: 'herbs',
    });

    // Create product
    product = await Product.create({
      name: 'Turmeric',
      sku: 'TURMERIC-001',
      categoryId: category._id,
      price: 299,
      stock: 100,
      isActive: true,
      isApproved: true,
    });
  });

  // ============= GET CART TESTS =============
  describe('GET /api/v1/cart', () => {
    
    it('✓ Should get empty cart for new user', async () => {
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.totalPrice).toBe(0);
    });

    it('✓ Should get cart with items', async () => {
      // Add item first
      await Cart.create({
        userId: user._id,
        items: [
          {
            productId: product._id,
            quantity: 2,
            price: product.price,
          },
        ],
      });

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.totalPrice).toBe(product.price * 2);
    });

    it('✗ Should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/cart');

      expect(res.status).toBe(401);
    });
  });

  // ============= ADD TO CART TESTS =============
  describe('POST /api/v1/cart/add', () => {
    
    it('✓ Should add product to cart', async () => {
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          quantity: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].productId.toString()).toBe(product._id.toString());
      expect(res.body.data.items[0].quantity).toBe(2);
    });

    it('✓ Should increase quantity for duplicate product', async () => {
      // Add first time
      await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          quantity: 1,
        });

      // Add again
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          quantity: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].quantity).toBe(3);
    });

    it('✗ Should fail with invalid quantity', async () => {
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          quantity: -1,
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should fail with out-of-stock quantity', async () => {
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          quantity: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('stock');
    });

    it('✗ Should fail with non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: fakeId,
          quantity: 1,
        });

      expect(res.status).toBe(404);
    });

    it('✗ Should fail with inactive product', async () => {
      const inactiveProduct = await Product.create({
        name: 'Inactive',
        sku: 'INACT-001',
        categoryId: product.categoryId,
        price: 99,
        stock: 10,
        isActive: false,
        isApproved: true,
      });

      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: inactiveProduct._id.toString(),
          quantity: 1,
        });

      expect(res.status).toBe(400);
    });
  });

  // ============= UPDATE CART ITEM TESTS =============
  describe('PUT /api/v1/cart/update', () => {
    
    beforeEach(async () => {
      await Cart.create({
        userId: user._id,
        items: [
          {
            productId: product._id,
            quantity: 2,
            price: product.price,
          },
        ],
      });
    });

    it('✓ Should update item quantity', async () => {
      const res = await request(app)
        .put('/api/v1/cart/update')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          quantity: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].quantity).toBe(5);
    });

    it('✗ Should fail with invalid quantity', async () => {
      const res = await request(app)
        .put('/api/v1/cart/update')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          quantity: 0,
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should fail with quantity exceeding stock', async () => {
      const res = await request(app)
        .put('/api/v1/cart/update')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          quantity: 5000,
        });

      expect(res.status).toBe(400);
    });
  });

  // ============= REMOVE FROM CART TESTS =============
  describe('DELETE /api/v1/cart/remove/:productId', () => {
    
    beforeEach(async () => {
      await Cart.create({
        userId: user._id,
        items: [
          {
            productId: product._id,
            quantity: 2,
            price: product.price,
          },
        ],
      });
    });

    it('✓ Should remove product from cart', async () => {
      const res = await request(app)
        .delete(`/api/v1/cart/remove/${product._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(0);
    });

    it('✗ Should fail with non-existent item', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const res = await request(app)
        .delete(`/api/v1/cart/remove/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ============= CLEAR CART TESTS =============
  describe('DELETE /api/v1/cart/clear', () => {
    
    beforeEach(async () => {
      await Cart.create({
        userId: user._id,
        items: [
          {
            productId: product._id,
            quantity: 2,
            price: product.price,
          },
        ],
      });
    });

    it('✓ Should clear entire cart', async () => {
      const res = await request(app)
        .delete('/api/v1/cart/clear')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(0);
      expect(res.body.data.totalPrice).toBe(0);
    });
  });
});
