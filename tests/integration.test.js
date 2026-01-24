/**
 * Integration Tests
 * Tests: Multi-module workflows (cart → order → payment → shipment)
 */

import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../src/server.js';
import User from '../src/models/user.model.js';
import Product from '../src/models/product.model.js';
import Category from '../src/models/category.model.js';
import Cart from '../src/models/cart.model.js';
import Order from '../src/models/order.model.js';
import Coupon from '../src/models/coupon.model.js';
import { generateTestToken } from './setup.js';

describe('🔗 Integration Tests - Complete Customer Workflows', () => {
  
  let userToken;
  let userId;
  let user;
  let product1;
  let product2;
  let category;

  beforeEach(async () => {
    // Create user with address
    user = await User.create({
      email: 'integration@test.com',
      password: 'SecurePass123!',
      name: 'Integration',
      lastName: 'Test',
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

    // Create products
    category = await Category.create({
      name: 'Herbs',
      slug: 'herbs',
    });

    product1 = await Product.create({
      name: 'Turmeric Powder',
      sku: 'TURMERIC-INTEG-001',
      categoryId: category._id,
      price: 299,
      stock: 100,
      isActive: true,
      isApproved: true,
      description: 'High quality turmeric powder',
    });

    product2 = await Product.create({
      name: 'Ginger Root',
      sku: 'GINGER-INTEG-001',
      categoryId: category._id,
      price: 199,
      stock: 50,
      isActive: true,
      isApproved: true,
      description: 'Fresh ginger root',
    });
  });

  // ============= COMPLETE PURCHASE FLOW =============
  describe('🛒 Complete Purchase Workflow', () => {
    
    it('✓ Should complete full purchase: Browse → Add to Cart → Apply Coupon → Order → Pay', async () => {
      // STEP 1: Browse products
      const browseRes = await request(app)
        .get('/api/v1/products')
        .query({ category: category._id.toString() });

      expect(browseRes.status).toBe(200);
      expect(browseRes.body.data.length).toBeGreaterThanOrEqual(2);

      // STEP 2: Add items to cart
      const addCart1 = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product1._id.toString(),
          quantity: 2,
        });

      expect(addCart1.status).toBe(200);

      const addCart2 = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product2._id.toString(),
          quantity: 1,
        });

      expect(addCart2.status).toBe(200);

      // STEP 3: View cart
      const cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(cartRes.status).toBe(200);
      expect(cartRes.body.data.items.length).toBe(2);
      const subtotal = cartRes.body.data.subtotal;

      // STEP 4: Create coupon
      const coupon = await Coupon.create({
        code: 'INTEGRATION10',
        discountType: 'percentage',
        discountValue: 10,
        maxUses: 100,
        minOrderValue: subtotal - 100, // Should be applicable
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // STEP 5: Apply coupon
      const couponRes = await request(app)
        .post('/api/v1/cart/apply-coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'INTEGRATION10',
        });

      expect(couponRes.status).toBe(200);
      const discountedAmount = couponRes.body.data.finalAmount;

      // STEP 6: Create order
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.data.status).toBe('pending');
      expect(orderRes.body.data.appliedCoupon).toBe('INTEGRATION10');
      const orderId = orderRes.body.data._id;

      // STEP 7: Verify order details
      const orderDetailsRes = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(orderDetailsRes.status).toBe(200);
      expect(orderDetailsRes.body.data.items.length).toBe(2);

      // STEP 8: Initiate payment
      const paymentRes = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: orderId,
        });

      expect(paymentRes.status).toBe(200);
      expect(paymentRes.body).toHaveProperty('paymentUrl');

      // STEP 9: Verify coupon usage incremented
      const updatedCoupon = await Coupon.findById(coupon._id);
      expect(updatedCoupon.currentUses).toBeGreaterThan(0);
    });
  });

  // ============= CART TO ORDER WORKFLOW =============
  describe('📦 Cart to Order Conversion', () => {
    
    it('✓ Should clear cart after order creation', async () => {
      // Add to cart
      await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product1._id.toString(),
          quantity: 2,
        });

      // Verify cart has items
      let cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(cartRes.body.data.items.length).toBe(1);

      // Create order
      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      // Verify cart is cleared
      cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(cartRes.body.data.items.length).toBe(0);
    });

    it('✓ Should update inventory after order', async () => {
      const initialStock = product1.stock;

      // Add to cart
      await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product1._id.toString(),
          quantity: 5,
        });

      // Create order
      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      // Check updated stock
      const updatedProduct = await Product.findById(product1._id);
      expect(updatedProduct.stock).toBe(initialStock - 5);
    });
  });

  // ============= MULTIPLE ORDERS BY SAME USER =============
  describe('👤 Multiple Orders Management', () => {
    
    it('✓ Should allow user to place multiple orders', async () => {
      // First order
      await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product1._id.toString(),
          quantity: 1,
        });

      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      // Add different product to cart
      await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product2._id.toString(),
          quantity: 2,
        });

      // Second order
      const order2Res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'upi',
        });

      expect(order2Res.status).toBe(201);

      // Verify both orders in user's order list
      const ordersRes = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(ordersRes.body.data.length).toBe(2);
    });
  });

  // ============= PRODUCT REVIEW AFTER PURCHASE =============
  describe('⭐ Post-Purchase Review Flow', () => {
    
    it('✓ Should allow review of purchased product', async () => {
      // Create order
      await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product1._id.toString(),
          quantity: 1,
        });

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      const orderId = orderRes.body.data._id;

      // Mark as delivered (normally done by admin/webhook)
      await Order.findByIdAndUpdate(orderId, { status: 'delivered' });

      // Submit review
      const reviewRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product1._id.toString(),
          orderId: orderId,
          rating: 5,
          title: 'Excellent product after purchase',
          content: 'Very satisfied with the turmeric powder',
        });

      expect(reviewRes.status).toBe(201);
      expect(reviewRes.body.data.status).toBe('pending');

      // Verify review appears in product reviews
      const productReviewsRes = await request(app)
        .get(`/api/v1/products/${product1._id}/reviews`);

      expect(productReviewsRes.status).toBe(200);
      // Should include the pending review
    });

    it('✗ Should prevent review without completed order', async () => {
      // Try to review without purchase
      const reviewRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product1._id.toString(),
          orderId: 'fake-order-id',
          rating: 5,
          title: 'Fake review',
          content: 'Never bought this',
        });

      expect(reviewRes.status).toBe(403);
    });
  });

  // ============= ORDER CANCELLATION WORKFLOW =============
  describe('❌ Order Cancellation Flow', () => {
    
    it('✓ Should allow cancellation of pending order', async () => {
      // Create order
      await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product1._id.toString(),
          quantity: 3,
        });

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      const orderId = orderRes.body.data._id;
      const initialStock = (await Product.findById(product1._id)).stock;

      // Cancel order
      const cancelRes = await request(app)
        .put(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Changed my mind',
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('cancelled');

      // Verify inventory restored
      const updatedStock = (await Product.findById(product1._id)).stock;
      expect(updatedStock).toBeGreaterThan(initialStock);
    });
  });

  // ============= CONCURRENT REQUEST HANDLING =============
  describe('⚡ Concurrent Request Handling', () => {
    
    it('✓ Should handle concurrent cart operations', async () => {
      const requests = [];

      // Simulate 5 concurrent "add to cart" requests
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/v1/cart/add')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              productId: product1._id.toString(),
              quantity: 1,
            })
        );
      }

      const results = await Promise.all(requests);

      // All should succeed
      results.forEach((res) => {
        expect(res.status).toBe(200);
      });

      // Cart should have 5 items
      const cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(cartRes.body.data.items[0].quantity).toBe(5);
    });

    it('✓ Should prevent overselling on concurrent orders', async () => {
      // Create second user
      const user2 = await User.create({
        email: 'concurrent@test.com',
        password: 'SecurePass123!',
        name: 'Concurrent',
        addresses: user.addresses,
      });

      const user2Token = generateTestToken(user2._id.toString(), 'user');

      // Create product with low stock
      const lowStockProduct = await Product.create({
        name: 'Limited Stock',
        sku: 'LIMITED-001',
        categoryId: category._id,
        price: 500,
        stock: 2, // Only 2 items
        isActive: true,
        isApproved: true,
      });

      // User 1 adds to cart
      await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: lowStockProduct._id.toString(),
          quantity: 2,
        });

      // User 2 tries to add same product
      const user2AddRes = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          productId: lowStockProduct._id.toString(),
          quantity: 1,
        });

      // User 2 can add to cart (reserved on order, not cart)
      expect(user2AddRes.status).toBe(200);

      // User 1 creates order (reserves stock)
      const order1Res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      expect(order1Res.status).toBe(201);

      // User 2 tries to create order (should fail - insufficient stock)
      const order2Res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          shippingAddressId: user2.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      expect(order2Res.status).toBe(400);
      expect(order2Res.body.message).toContain('stock');
    });
  });

  // ============= CROSS-MODULE DATA CONSISTENCY =============
  describe('📊 Data Consistency Across Modules', () => {
    
    it('✓ Should maintain data consistency: Cart → Order → Payment → Inventory', async () => {
      // Add to cart
      await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product1._id.toString(),
          quantity: 2,
        });

      // Create order
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: user.addresses[0]._id.toString(),
          paymentMethod: 'card',
        });

      const order = orderRes.body.data;

      // Verify order matches cart data
      expect(order.items[0].quantity).toBe(2);
      expect(order.items[0].productId).toBe(product1._id.toString());
      expect(order.totalAmount).toBe(product1.price * 2);

      // Verify inventory was reduced
      const updatedProduct = await Product.findById(product1._id);
      expect(updatedProduct.stock).toBe(product1.stock - 2);

      // Verify cart was cleared
      const cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(cartRes.body.data.items.length).toBe(0);
    });
  });
});
