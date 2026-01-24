/**
 * Coupons Tests
 * Tests: Coupon validation, application, discount calculation, limits
 */

import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../src/server.js';
import Coupon from '../src/models/coupon.model.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Cart from '../src/models/cart.model.js';
import Product from '../src/models/product.model.js';
import Category from '../src/models/category.model.js';
import { generateTestToken } from './setup.js';

describe('🎟️ Coupons', () => {
  
  let userToken;
  let userId;
  let adminToken;
  let adminId;
  let coupon;
  let product;
  let user;

  beforeEach(async () => {
    // Create user
    user = await User.create({
      email: 'coupon@test.com',
      password: 'SecurePass123!',
      name: 'John',
    });
    userId = user._id.toString();
    userToken = generateTestToken(userId, 'user');

    // Create admin
    const admin = await User.create({
      email: 'admin@coupon.com',
      password: 'SecurePass123!',
      name: 'Admin',
      role: 'admin',
    });
    adminId = admin._id.toString();
    adminToken = generateTestToken(adminId, 'admin');

    // Create category and product
    const category = await Category.create({
      name: 'Herbs',
      slug: 'herbs',
    });

    product = await Product.create({
      name: 'Turmeric',
      sku: 'TURMERIC-001',
      categoryId: category._id,
      price: 500,
      stock: 100,
      isActive: true,
      isApproved: true,
    });
  });

  // ============= CREATE COUPON TESTS (Admin) =============
  describe('POST /api/v1/coupons', () => {
    
    it('✓ Should create percentage coupon', async () => {
      const res = await request(app)
        .post('/api/v1/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'SAVE10',
          description: '10% off on all products',
          discountType: 'percentage',
          discountValue: 10,
          maxUses: 100,
          maxUsesPerUser: 1,
          minOrderValue: 500,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('SAVE10');
      expect(res.body.data.discountType).toBe('percentage');
    });

    it('✓ Should create fixed coupon', async () => {
      const res = await request(app)
        .post('/api/v1/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'FLAT50',
          description: 'Flat 50 rupees off',
          discountType: 'fixed',
          discountValue: 50,
          maxUses: 200,
          maxUsesPerUser: 2,
          minOrderValue: 300,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.discountType).toBe('fixed');
    });

    it('✗ Should fail without admin role', async () => {
      const res = await request(app)
        .post('/api/v1/coupons')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'SAVE10',
          discountType: 'percentage',
          discountValue: 10,
        });

      expect(res.status).toBe(403);
    });

    it('✗ Should fail with duplicate code', async () => {
      await Coupon.create({
        code: 'DUPLICATE',
        discountType: 'percentage',
        discountValue: 10,
      });

      const res = await request(app)
        .post('/api/v1/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'DUPLICATE',
          discountType: 'percentage',
          discountValue: 15,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('exists');
    });

    it('✗ Should validate discount value', async () => {
      const res = await request(app)
        .post('/api/v1/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'INVALID',
          discountType: 'percentage',
          discountValue: 150, // More than 100%
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should require expiry date in future', async () => {
      const res = await request(app)
        .post('/api/v1/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'EXPIRED',
          discountType: 'percentage',
          discountValue: 10,
          expiryDate: new Date(Date.now() - 1000), // Past date
        });

      expect(res.status).toBe(400);
    });
  });

  // ============= VALIDATE COUPON TESTS =============
  describe('POST /api/v1/coupons/validate', () => {
    
    beforeEach(async () => {
      coupon = await Coupon.create({
        code: 'VALID10',
        discountType: 'percentage',
        discountValue: 10,
        maxUses: 100,
        maxUsesPerUser: 2,
        minOrderValue: 500,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      });
    });

    it('✓ Should validate valid coupon', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'VALID10',
          orderAmount: 1000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.discountValue).toBe(100); // 10% of 1000
    });

    it('✗ Should reject invalid coupon code', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'INVALID',
          orderAmount: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('invalid');
    });

    it('✗ Should reject expired coupon', async () => {
      await Coupon.findByIdAndUpdate(coupon._id, {
        expiryDate: new Date(Date.now() - 1000),
      });

      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'VALID10',
          orderAmount: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('expired');
    });

    it('✗ Should reject if min order value not met', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'VALID10',
          orderAmount: 300, // Less than 500 minimum
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('minimum');
    });

    it('✗ Should reject if max uses reached', async () => {
      await Coupon.findByIdAndUpdate(coupon._id, {
        currentUses: 100,
        maxUses: 100,
      });

      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'VALID10',
          orderAmount: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('limit');
    });

    it('✗ Should reject if user max uses exceeded', async () => {
      // Simulate user already used coupon twice
      await Order.create([
        {
          userId: user._id,
          orderNumber: 'ORD-001',
          items: [],
          totalAmount: 100,
          appliedCoupon: coupon._id,
          status: 'completed',
        },
        {
          userId: user._id,
          orderNumber: 'ORD-002',
          items: [],
          totalAmount: 100,
          appliedCoupon: coupon._id,
          status: 'completed',
        },
      ]);

      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'VALID10',
          orderAmount: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already used');
    });

    it('✓ Should calculate percentage discount correctly', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'VALID10',
          orderAmount: 500,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.discountValue).toBe(50); // 10% of 500
    });

    it('✓ Should apply fixed discount', async () => {
      const fixedCoupon = await Coupon.create({
        code: 'FIXED50',
        discountType: 'fixed',
        discountValue: 50,
        maxUses: 100,
        minOrderValue: 0,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      });

      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'FIXED50',
          orderAmount: 500,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.discountValue).toBe(50);
    });
  });

  // ============= APPLY COUPON TO CART TESTS =============
  describe('POST /api/v1/cart/apply-coupon', () => {
    
    beforeEach(async () => {
      coupon = await Coupon.create({
        code: 'APPLY10',
        discountType: 'percentage',
        discountValue: 10,
        maxUses: 100,
        minOrderValue: 500,
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Add product to cart
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

    it('✓ Should apply coupon to cart', async () => {
      const res = await request(app)
        .post('/api/v1/cart/apply-coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'APPLY10',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.appliedCoupon).toBe('APPLY10');
      expect(res.body.data.discountAmount).toBeGreaterThan(0);
      expect(res.body.data.finalAmount).toBeLessThan(res.body.data.subtotal);
    });

    it('✗ Should fail with empty cart', async () => {
      await Cart.deleteOne({ userId: user._id });

      const res = await request(app)
        .post('/api/v1/cart/apply-coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'APPLY10',
        });

      expect(res.status).toBe(400);
    });
  });

  // ============= UPDATE COUPON TESTS (Admin) =============
  describe('PUT /api/v1/coupons/:id', () => {
    
    beforeEach(async () => {
      coupon = await Coupon.create({
        code: 'UPDATE10',
        discountType: 'percentage',
        discountValue: 10,
        maxUses: 100,
      });
    });

    it('✓ Should update coupon', async () => {
      const res = await request(app)
        .put(`/api/v1/coupons/${coupon._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          discountValue: 15,
          maxUses: 200,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.discountValue).toBe(15);
      expect(res.body.data.maxUses).toBe(200);
    });

    it('✗ Should not allow users to update', async () => {
      const res = await request(app)
        .put(`/api/v1/coupons/${coupon._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          discountValue: 15,
        });

      expect(res.status).toBe(403);
    });
  });

  // ============= DELETE COUPON TESTS (Admin) =============
  describe('DELETE /api/v1/coupons/:id', () => {
    
    beforeEach(async () => {
      coupon = await Coupon.create({
        code: 'DELETE10',
        discountType: 'percentage',
        discountValue: 10,
      });
    });

    it('✓ Should delete coupon', async () => {
      const res = await request(app)
        .delete(`/api/v1/coupons/${coupon._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify deletion
      const deleted = await Coupon.findById(coupon._id);
      expect(deleted).toBeNull();
    });

    it('✗ Should not allow users to delete', async () => {
      const res = await request(app)
        .delete(`/api/v1/coupons/${coupon._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ============= LIST COUPONS TESTS =============
  describe('GET /api/v1/coupons', () => {
    
    beforeEach(async () => {
      await Coupon.create([
        {
          code: 'LIST1',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
        },
        {
          code: 'LIST2',
          discountType: 'fixed',
          discountValue: 50,
          isActive: true,
        },
        {
          code: 'LIST3',
          discountType: 'percentage',
          discountValue: 20,
          isActive: false,
        },
      ]);
    });

    it('✓ Should list active coupons for users', async () => {
      const res = await request(app)
        .get('/api/v1/coupons')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      // Only active coupons should be returned
      expect(res.body.data.every((c) => c.isActive === true)).toBe(true);
    });

    it('✓ Should list all coupons for admin', async () => {
      const res = await request(app)
        .get('/api/v1/coupons')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ============= EDGE CASES =============
  describe('🔧 Edge Cases', () => {
    
    it('✓ Should handle case-insensitive coupon code', async () => {
      await Coupon.create({
        code: 'CASESENSITIVE',
        discountType: 'percentage',
        discountValue: 10,
        maxUses: 100,
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'casesensitive', // Lowercase
          orderAmount: 500,
        });

      expect(res.status).toBe(200);
    });

    it('✓ Should not apply discount greater than order amount', async () => {
      const expensiveCoupon = await Coupon.create({
        code: 'HUGE99',
        discountType: 'percentage',
        discountValue: 99,
        maxUses: 100,
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'HUGE99',
          orderAmount: 100,
        });

      expect(res.status).toBe(200);
      // Discount should not exceed order amount
      expect(res.body.data.discountValue).toBeLessThanOrEqual(100);
    });
  });
});
