/**
 * Orders & Payments Tests
 * Tests: Create order, Payment flow, Order status updates, Refunds
 */

import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../src/server.js';
import Order from '../src/models/order.model.js';
import Payment from '../src/models/payment.model.js';
import Product from '../src/models/product.model.js';
import User from '../src/models/user.model.js';
import Category from '../src/models/category.model.js';
import Cart from '../src/models/cart.model.js';
import { generateTestToken } from './setup.js';

describe('📋 Orders & Payments', () => {
  
  let userToken;
  let userId;
  let user;
  let product;
  let category;

  beforeEach(async () => {
    // Create user
    user = await User.create({
      email: 'order@test.com',
      password: 'SecurePass123!',
      name: 'John',
      lastName: 'Doe',
      phone: '+919876543210',
      addresses: [
        {
          addressType: 'home',
          street: '123 Main St',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'India',
          isDefault: true,
        },
      ],
    });
    userId = user._id.toString();
    userToken = generateTestToken(userId, 'user');

    // Create category
    category = await Category.create({
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

  // ============= CREATE ORDER TESTS =============
  describe('POST /api/v1/orders', () => {
    
    beforeEach(async () => {
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

    it('✓ Should create order from cart', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('orderId');
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.totalAmount).toBe(product.price * 2);
    });

    it('✗ Should fail with empty cart', async () => {
      // Clear cart
      await Cart.deleteOne({ userId: user._id });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cart');
    });

    it('✗ Should fail without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      expect(res.status).toBe(401);
    });

    it('✗ Should fail with out-of-stock item', async () => {
      // Update product stock to 0
      await Product.findByIdAndUpdate(product._id, { stock: 0 });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('stock');
    });

    it('✗ Should fail with invalid payment method', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'invalid_method',
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should update inventory after order creation', async () => {
      const beforeStock = product.stock;

      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(beforeStock - 2);
    });
  });

  // ============= GET ORDERS TESTS =============
  describe('GET /api/v1/orders', () => {
    
    beforeEach(async () => {
      // Create test orders
      await Order.create([
        {
          userId: user._id,
          orderNumber: 'ORD-001',
          items: [
            {
              productId: product._id,
              quantity: 1,
              price: product.price,
            },
          ],
          totalAmount: product.price,
          shippingAddress: user.addresses[0],
          paymentMethod: 'card',
          paymentStatus: 'pending',
          status: 'pending',
        },
        {
          userId: user._id,
          orderNumber: 'ORD-002',
          items: [
            {
              productId: product._id,
              quantity: 2,
              price: product.price,
            },
          ],
          totalAmount: product.price * 2,
          shippingAddress: user.addresses[0],
          paymentMethod: 'upi',
          paymentStatus: 'captured',
          status: 'confirmed',
        },
      ]);
    });

    it('✓ Should get user orders', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('✓ Should filter orders by status', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ status: 'pending' });

      expect(res.status).toBe(200);
      expect(res.body.data.every((order) => order.status === 'pending')).toBe(true);
    });

    it('✓ Should have pagination', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pagination');
    });
  });

  // ============= GET ORDER DETAILS TESTS =============
  describe('GET /api/v1/orders/:id', () => {
    
    let order;

    beforeEach(async () => {
      order = await Order.create({
        userId: user._id,
        orderNumber: 'ORD-DETAIL-001',
        items: [
          {
            productId: product._id,
            quantity: 1,
            price: product.price,
          },
        ],
        totalAmount: product.price,
        shippingAddress: user.addresses[0],
        paymentMethod: 'card',
        status: 'pending',
      });
    });

    it('✓ Should get order details', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${order._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id.toString()).toBe(order._id.toString());
      expect(res.body.data.items.length).toBe(1);
    });

    it('✗ Should not allow user to view other user orders', async () => {
      const otherUser = await User.create({
        email: 'other@test.com',
        password: 'SecurePass123!',
        name: 'Jane',
      });
      const otherUserToken = generateTestToken(otherUser._id.toString(), 'user');

      const res = await request(app)
        .get(`/api/v1/orders/${order._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(403);
    });

    it('✗ Should return 404 for non-existent order', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const res = await request(app)
        .get(`/api/v1/orders/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ============= PAYMENT INITIATION TESTS =============
  describe('POST /api/v1/payments/initiate', () => {
    
    let order;

    beforeEach(async () => {
      order = await Order.create({
        userId: user._id,
        orderNumber: 'ORD-PAY-001',
        items: [
          {
            productId: product._id,
            quantity: 1,
            price: product.price,
          },
        ],
        totalAmount: product.price,
        shippingAddress: user.addresses[0],
        paymentMethod: 'card',
        status: 'pending',
        paymentStatus: 'pending',
      });
    });

    it('✓ Should initiate payment', async () => {
      const res = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: order._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('paymentUrl');
      expect(res.body).toHaveProperty('paymentId');
    });

    it('✗ Should fail with non-existent order', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const res = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: fakeId,
        });

      expect(res.status).toBe(404);
    });

    it('✗ Should fail if order already paid', async () => {
      order.paymentStatus = 'captured';
      await order.save();

      const res = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: order._id.toString(),
        });

      expect(res.status).toBe(400);
    });
  });

  // ============= PAYMENT VERIFICATION TESTS =============
  describe('POST /api/v1/payments/verify', () => {
    
    let order;
    let payment;

    beforeEach(async () => {
      order = await Order.create({
        userId: user._id,
        orderNumber: 'ORD-VERIFY-001',
        items: [
          {
            productId: product._id,
            quantity: 1,
            price: product.price,
          },
        ],
        totalAmount: product.price,
        shippingAddress: user.addresses[0],
        paymentMethod: 'card',
        status: 'pending',
        paymentStatus: 'pending',
      });

      payment = await Payment.create({
        orderId: order._id,
        userId: user._id,
        amount: product.price,
        paymentMethod: 'card',
        status: 'initiated',
        razorpayPaymentId: 'pay_test_123',
      });
    });

    it('✓ Should verify successful payment', async () => {
      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentId: payment._id.toString(),
          razorpayPaymentId: 'pay_test_123',
          razorpayOrderId: 'order_test_123',
          razorpaySignature: 'valid_signature',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');

      // Check order status updated
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.paymentStatus).toBe('captured');
      expect(updatedOrder.status).toBe('confirmed');
    });

    it('✗ Should reject payment with invalid signature', async () => {
      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentId: payment._id.toString(),
          razorpayPaymentId: 'pay_test_123',
          razorpayOrderId: 'order_test_123',
          razorpaySignature: 'invalid_signature',
        });

      expect(res.status).toBe(400);
    });
  });

  // ============= ORDER CANCELLATION TESTS =============
  describe('PUT /api/v1/orders/:id/cancel', () => {
    
    let order;

    beforeEach(async () => {
      // Reduce stock first
      await Product.findByIdAndUpdate(product._id, { stock: product.stock - 2 });

      order = await Order.create({
        userId: user._id,
        orderNumber: 'ORD-CANCEL-001',
        items: [
          {
            productId: product._id,
            quantity: 2,
            price: product.price,
          },
        ],
        totalAmount: product.price * 2,
        shippingAddress: user.addresses[0],
        status: 'pending',
      });
    });

    it('✓ Should cancel pending order', async () => {
      const res = await request(app)
        .put(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Changed my mind',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('✗ Should fail if order already shipped', async () => {
      order.status = 'shipped';
      await order.save();

      const res = await request(app)
        .put(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Changed my mind',
        });

      expect(res.status).toBe(400);
    });

    it('✓ Should restore inventory on cancellation', async () => {
      const beforeCancelStock = (await Product.findById(product._id)).stock;

      await request(app)
        .put(`/api/v1/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Changed my mind',
        });

      const afterCancelStock = (await Product.findById(product._id)).stock;
      expect(afterCancelStock).toBe(beforeCancelStock + 2);
    });
  });
});
