/**
 * Admin Tests
 * Tests: Dashboard, analytics, user management, order management, product approval
 */

import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../src/server.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import Product from '../src/models/product.model.js';
import Payment from '../src/models/payment.model.js';
import Review from '../src/models/review.model.js';
import Category from '../src/models/category.model.js';
import { generateTestToken } from './setup.js';

describe('👨‍💼 Admin Dashboard & Management', () => {
  
  let adminToken;
  let adminId;
  let userToken;
  let userId;

  beforeEach(async () => {
    // Create admin user
    const admin = await User.create({
      email: 'admin@test.com',
      password: 'SecurePass123!',
      name: 'Admin',
      role: 'admin',
    });
    adminId = admin._id.toString();
    adminToken = generateTestToken(adminId, 'admin');

    // Create regular user
    const user = await User.create({
      email: 'user@test.com',
      password: 'SecurePass123!',
      name: 'User',
      role: 'user',
    });
    userId = user._id.toString();
    userToken = generateTestToken(userId, 'user');
  });

  // ============= DASHBOARD TESTS =============
  describe('GET /api/v1/admin/dashboard', () => {
    
    beforeEach(async () => {
      // Create test data
      const users = await User.create([
        { email: 'u1@test.com', password: 'pass', name: 'User1' },
        { email: 'u2@test.com', password: 'pass', name: 'User2' },
      ]);

      const category = await Category.create({ name: 'Test', slug: 'test' });
      const products = await Product.create([
        {
          name: 'Product1',
          sku: 'SKU1',
          categoryId: category._id,
          price: 100,
          stock: 50,
          isActive: true,
          isApproved: false,
        },
        {
          name: 'Product2',
          sku: 'SKU2',
          categoryId: category._id,
          price: 200,
          stock: 0,
          isActive: true,
          isApproved: true,
        },
      ]);

      // Create orders
      await Order.create([
        {
          userId: users[0]._id,
          orderNumber: 'ORD001',
          items: [{ productId: products[0]._id, quantity: 1, price: 100 }],
          totalAmount: 100,
          status: 'delivered',
          paymentStatus: 'captured',
        },
        {
          userId: users[1]._id,
          orderNumber: 'ORD002',
          items: [{ productId: products[1]._id, quantity: 2, price: 200 }],
          totalAmount: 400,
          status: 'pending',
          paymentStatus: 'pending',
        },
      ]);
    });

    it('✓ Should return dashboard stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('totalOrders');
      expect(res.body.data).toHaveProperty('totalRevenue');
      expect(res.body.data).toHaveProperty('totalProducts');
    });

    it('✓ Should have sales breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sales).toHaveProperty('total');
      expect(res.body.data.sales).toHaveProperty('thisMonth');
    });

    it('✓ Should count pending products', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('pendingProducts');
      expect(res.body.data.pendingProducts).toBe(1);
    });

    it('✗ Should not allow regular users to access', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('✗ Should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard');

      expect(res.status).toBe(401);
    });
  });

  // ============= USER MANAGEMENT TESTS =============
  describe('GET /api/v1/admin/users', () => {
    
    beforeEach(async () => {
      await User.create([
        { email: 'test1@test.com', password: 'pass', name: 'Test1' },
        { email: 'test2@test.com', password: 'pass', name: 'Test2' },
      ]);
    });

    it('✓ Should list users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('✓ Should have pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pagination');
    });

    it('✓ Should search users by email', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'test1' });

      expect(res.status).toBe(200);
      expect(res.body.data.some((u) => u.email.includes('test1'))).toBe(true);
    });

    it('✓ Should filter by role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ role: 'user' });

      expect(res.status).toBe(200);
      expect(res.body.data.every((u) => u.role === 'user')).toBe(true);
    });
  });

  // ============= USER DETAILS TESTS =============
  describe('GET /api/v1/admin/users/:id', () => {
    
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'details@test.com',
        password: 'SecurePass123!',
        name: 'Details',
      });
    });

    it('✓ Should get user details with order history', async () => {
      // Create order for user
      const category = await Category.create({ name: 'Test', slug: 'test' });
      const product = await Product.create({
        name: 'Test',
        sku: 'TEST',
        categoryId: category._id,
        price: 100,
        stock: 10,
      });

      await Order.create({
        userId: testUser._id,
        orderNumber: 'TEST001',
        items: [{ productId: product._id, quantity: 1, price: 100 }],
        totalAmount: 100,
        status: 'delivered',
      });

      const res = await request(app)
        .get(`/api/v1/admin/users/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('details@test.com');
      expect(res.body.data).toHaveProperty('orders');
    });
  });

  // ============= PRODUCT APPROVAL TESTS =============
  describe('GET /api/v1/admin/products/pending', () => {
    
    beforeEach(async () => {
      const category = await Category.create({ name: 'Test', slug: 'test' });
      await Product.create([
        {
          name: 'Pending1',
          sku: 'PND1',
          categoryId: category._id,
          price: 100,
          stock: 10,
          isApproved: false,
        },
        {
          name: 'Pending2',
          sku: 'PND2',
          categoryId: category._id,
          price: 200,
          stock: 20,
          isApproved: false,
        },
      ]);
    });

    it('✓ Should list pending products', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.every((p) => p.isApproved === false)).toBe(true);
    });
  });

  // ============= APPROVE PRODUCT TESTS =============
  describe('PUT /api/v1/admin/products/:id/approve', () => {
    
    let product;

    beforeEach(async () => {
      const category = await Category.create({ name: 'Test', slug: 'test' });
      product = await Product.create({
        name: 'To Approve',
        sku: 'APPROVE1',
        categoryId: category._id,
        price: 100,
        stock: 10,
        isApproved: false,
      });
    });

    it('✓ Should approve product', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/products/${product._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approved: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isApproved).toBe(true);
    });

    it('✓ Should reject product with reason', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/products/${product._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approved: false,
          rejectionReason: 'Image quality too low',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isApproved).toBe(false);
    });

    it('✗ Should not allow regular users', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/products/${product._id}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          approved: true,
        });

      expect(res.status).toBe(403);
    });
  });

  // ============= ORDER MANAGEMENT TESTS =============
  describe('GET /api/v1/admin/orders', () => {
    
    beforeEach(async () => {
      const users = await User.create([
        { email: 'o1@test.com', password: 'pass', name: 'O1' },
        { email: 'o2@test.com', password: 'pass', name: 'O2' },
      ]);

      const category = await Category.create({ name: 'Test', slug: 'test' });
      const product = await Product.create({
        name: 'Test',
        sku: 'TEST',
        categoryId: category._id,
        price: 100,
        stock: 100,
      });

      await Order.create([
        {
          userId: users[0]._id,
          orderNumber: 'ADMIN001',
          items: [{ productId: product._id, quantity: 1, price: 100 }],
          totalAmount: 100,
          status: 'pending',
        },
        {
          userId: users[1]._id,
          orderNumber: 'ADMIN002',
          items: [{ productId: product._id, quantity: 2, price: 100 }],
          totalAmount: 200,
          status: 'delivered',
        },
      ]);
    });

    it('✓ Should list all orders', async () => {
      const res = await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('✓ Should filter by status', async () => {
      const res = await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'pending' });

      expect(res.status).toBe(200);
      expect(res.body.data.every((o) => o.status === 'pending')).toBe(true);
    });
  });

  // ============= ANALYTICS TESTS =============
  describe('GET /api/v1/admin/analytics', () => {
    
    it('✓ Should return sales analytics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('salesByMonth');
      expect(res.body.data).toHaveProperty('topProducts');
      expect(res.body.data).toHaveProperty('customerGrowth');
    });

    it('✓ Should accept date range filter', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(res.status).toBe(200);
    });
  });

  // ============= ADMIN ACTIONS LOG TESTS =============
  describe('GET /api/v1/admin/logs', () => {
    
    it('✓ Should return admin action logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('✓ Should filter by action type', async () => {
      const res = await request(app)
        .get('/api/v1/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'product_approval' });

      expect(res.status).toBe(200);
    });
  });
});
