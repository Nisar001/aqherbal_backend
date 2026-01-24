/**
 * Reviews Tests
 * Tests: Review submission, ratings, helpful voting, filtering
 */

import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../src/server.js';
import Review from '../src/models/review.model.js';
import Product from '../src/models/product.model.js';
import Order from '../src/models/order.model.js';
import User from '../src/models/user.model.js';
import Category from '../src/models/category.model.js';
import { generateTestToken } from './setup.js';

describe('⭐ Reviews', () => {
  
  let userToken;
  let userId;
  let user;
  let product;
  let order;

  beforeEach(async () => {
    // Create user
    user = await User.create({
      email: 'reviewer@test.com',
      password: 'SecurePass123!',
      name: 'John',
      lastName: 'Reviewer',
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
      name: 'Organic Turmeric',
      sku: 'TURMERIC-REVIEW',
      categoryId: category._id,
      price: 299,
      stock: 100,
      isActive: true,
      isApproved: true,
    });

    // Create completed order for review eligibility
    order = await Order.create({
      userId: user._id,
      orderNumber: 'ORD-REVIEW-001',
      items: [
        {
          productId: product._id,
          quantity: 1,
          price: product.price,
        },
      ],
      totalAmount: product.price,
      shippingAddress: {
        street: '123 Main St',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
      },
      status: 'delivered',
      paymentStatus: 'captured',
    });
  });

  // ============= SUBMIT REVIEW TESTS =============
  describe('POST /api/v1/reviews', () => {
    
    it('✓ Should submit review for purchased product', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          orderId: order._id.toString(),
          rating: 5,
          title: 'Excellent product',
          content: 'Great quality turmeric, very effective.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.userId.toString()).toBe(userId);
      expect(res.body.data.status).toBe('pending');
    });

    it('✗ Should fail without valid purchase', async () => {
      const otherUser = await User.create({
        email: 'nopurchase@test.com',
        password: 'SecurePass123!',
        name: 'No',
      });
      const otherUserToken = generateTestToken(otherUser._id.toString(), 'user');

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          productId: product._id.toString(),
          orderId: order._id.toString(),
          rating: 5,
          title: 'Fake review',
          content: 'I never bought this.',
        });

      expect(res.status).toBe(403);
    });

    it('✗ Should fail without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .send({
          productId: product._id.toString(),
          orderId: order._id.toString(),
          rating: 5,
          title: 'Review',
          content: 'Content',
        });

      expect(res.status).toBe(401);
    });

    it('✗ Should fail with invalid rating', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          orderId: order._id.toString(),
          rating: 10, // Invalid: should be 1-5
          title: 'Bad rating',
          content: 'Content',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('rating');
    });

    it('✗ Should fail with rating 0', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          orderId: order._id.toString(),
          rating: 0,
          title: 'Zero rating',
          content: 'Content',
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          // Missing: rating, title, content
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should prevent duplicate reviews from same user', async () => {
      // Submit first review
      await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          orderId: order._id.toString(),
          rating: 5,
          title: 'First review',
          content: 'Good product',
        });

      // Try to submit another review
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          orderId: order._id.toString(),
          rating: 4,
          title: 'Second review',
          content: 'Different content',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already reviewed');
    });

    it('✗ Should reject review with excessive content length', async () => {
      const longContent = 'a'.repeat(5001); // More than 5000 chars

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id.toString(),
          orderId: order._id.toString(),
          rating: 4,
          title: 'Long review',
          content: longContent,
        });

      expect(res.status).toBe(400);
    });
  });

  // ============= GET PRODUCT REVIEWS TESTS =============
  describe('GET /api/v1/products/:id/reviews', () => {
    
    beforeEach(async () => {
      // Create multiple reviews
      const users = await User.create([
        {
          email: 'reviewer1@test.com',
          password: 'SecurePass123!',
          name: 'Reviewer1',
        },
        {
          email: 'reviewer2@test.com',
          password: 'SecurePass123!',
          name: 'Reviewer2',
        },
        {
          email: 'reviewer3@test.com',
          password: 'SecurePass123!',
          name: 'Reviewer3',
        },
      ]);

      // Create orders for each reviewer
      const orders = [];
      for (const u of users) {
        const o = await Order.create({
          userId: u._id,
          orderNumber: `ORD-${u._id}`,
          items: [{ productId: product._id, quantity: 1, price: product.price }],
          totalAmount: product.price,
          status: 'delivered',
        });
        orders.push(o);
      }

      // Create reviews
      await Review.create([
        {
          userId: users[0]._id,
          productId: product._id,
          orderId: orders[0]._id,
          rating: 5,
          title: 'Excellent',
          content: 'Very good product',
          status: 'approved',
        },
        {
          userId: users[1]._id,
          productId: product._id,
          orderId: orders[1]._id,
          rating: 4,
          title: 'Good',
          content: 'Good quality',
          status: 'approved',
        },
        {
          userId: users[2]._id,
          productId: product._id,
          orderId: orders[2]._id,
          rating: 3,
          title: 'Average',
          content: 'Average product',
          status: 'approved',
        },
      ]);
    });

    it('✓ Should get product reviews', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${product._id}/reviews`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('✓ Should have pagination', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${product._id}/reviews`)
        .query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body).toHaveProperty('pagination');
    });

    it('✓ Should filter by rating', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${product._id}/reviews`)
        .query({ rating: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.every((r) => r.rating === 5)).toBe(true);
    });

    it('✓ Should sort by date', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${product._id}/reviews`)
        .query({ sortBy: 'recent' });

      expect(res.status).toBe(200);
      // Verify date sorting
      for (let i = 1; i < res.body.data.length; i++) {
        const prevDate = new Date(res.body.data[i - 1].createdAt);
        const currDate = new Date(res.body.data[i].createdAt);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });

    it('✓ Should calculate average rating', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${product._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('averageRating');
      expect(res.body.averageRating).toBe((5 + 4 + 3) / 3);
    });
  });

  // ============= GET REVIEW DETAILS TESTS =============
  describe('GET /api/v1/reviews/:id', () => {
    
    let review;

    beforeEach(async () => {
      review = await Review.create({
        userId: user._id,
        productId: product._id,
        orderId: order._id,
        rating: 4,
        title: 'Good product',
        content: 'Quality is good, delivery was fast.',
        status: 'approved',
      });
    });

    it('✓ Should get review details', async () => {
      const res = await request(app)
        .get(`/api/v1/reviews/${review._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id.toString()).toBe(review._id.toString());
      expect(res.body.data.rating).toBe(4);
    });

    it('✗ Should return 404 for non-existent review', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .get(`/api/v1/reviews/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });

  // ============= UPDATE REVIEW TESTS =============
  describe('PUT /api/v1/reviews/:id', () => {
    
    let review;

    beforeEach(async () => {
      review = await Review.create({
        userId: user._id,
        productId: product._id,
        orderId: order._id,
        rating: 3,
        title: 'Initial review',
        content: 'Initial content',
        status: 'pending',
      });
    });

    it('✓ Should update own review', async () => {
      const res = await request(app)
        .put(`/api/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 5,
          title: 'Updated review',
          content: 'Updated content',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.title).toBe('Updated review');
    });

    it('✗ Should not allow updating other user reviews', async () => {
      const otherUser = await User.create({
        email: 'other@test.com',
        password: 'SecurePass123!',
        name: 'Other',
      });
      const otherUserToken = generateTestToken(otherUser._id.toString(), 'user');

      const res = await request(app)
        .put(`/api/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          rating: 5,
          title: 'Hacked',
          content: 'Hacked content',
        });

      expect(res.status).toBe(403);
    });
  });

  // ============= DELETE REVIEW TESTS =============
  describe('DELETE /api/v1/reviews/:id', () => {
    
    let review;

    beforeEach(async () => {
      review = await Review.create({
        userId: user._id,
        productId: product._id,
        orderId: order._id,
        rating: 3,
        title: 'Review to delete',
        content: 'This review will be deleted',
        status: 'approved',
      });
    });

    it('✓ Should delete own review', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);

      // Verify deletion
      const deleted = await Review.findById(review._id);
      expect(deleted).toBeNull();
    });

    it('✗ Should not allow deleting other user reviews', async () => {
      const otherUser = await User.create({
        email: 'other@test.com',
        password: 'SecurePass123!',
        name: 'Other',
      });
      const otherUserToken = generateTestToken(otherUser._id.toString(), 'user');

      const res = await request(app)
        .delete(`/api/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ============= HELPFUL VOTING TESTS =============
  describe('POST /api/v1/reviews/:id/helpful', () => {
    
    let review;

    beforeEach(async () => {
      review = await Review.create({
        userId: user._id,
        productId: product._id,
        orderId: order._id,
        rating: 5,
        title: 'Helpful review',
        content: 'Very helpful information',
        status: 'approved',
        helpfulCount: 5,
        notHelpfulCount: 1,
      });
    });

    it('✓ Should mark review as helpful', async () => {
      const otherUser = await User.create({
        email: 'voter@test.com',
        password: 'SecurePass123!',
        name: 'Voter',
      });
      const voterToken = generateTestToken(otherUser._id.toString(), 'user');

      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/helpful`)
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          helpful: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.helpfulCount).toBe(6);
    });

    it('✓ Should mark review as not helpful', async () => {
      const otherUser = await User.create({
        email: 'voter2@test.com',
        password: 'SecurePass123!',
        name: 'Voter2',
      });
      const voterToken = generateTestToken(otherUser._id.toString(), 'user');

      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/helpful`)
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          helpful: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.notHelpfulCount).toBe(2);
    });

    it('✗ Should prevent duplicate helpful votes from same user', async () => {
      const voter = await User.create({
        email: 'duplicate-voter@test.com',
        password: 'SecurePass123!',
        name: 'DupVoter',
      });
      const voterToken = generateTestToken(voter._id.toString(), 'user');

      // First vote
      await request(app)
        .post(`/api/v1/reviews/${review._id}/helpful`)
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          helpful: true,
        });

      // Duplicate vote
      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/helpful`)
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          helpful: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already voted');
    });

    it('✗ Should not allow user to vote on own review', async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/helpful`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          helpful: true,
        });

      expect(res.status).toBe(400);
    });
  });

  // ============= ADMIN REVIEW APPROVAL TESTS =============
  describe('PUT /api/v1/reviews/:id/approve', () => {
    
    let adminToken;
    let review;

    beforeEach(async () => {
      const admin = await User.create({
        email: 'admin@reviews.com',
        password: 'SecurePass123!',
        name: 'Admin',
        role: 'admin',
      });
      adminToken = generateTestToken(admin._id.toString(), 'admin');

      review = await Review.create({
        userId: user._id,
        productId: product._id,
        orderId: order._id,
        rating: 5,
        title: 'Pending review',
        content: 'Awaiting approval',
        status: 'pending',
      });
    });

    it('✓ Should approve review', async () => {
      const res = await request(app)
        .put(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approved: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('approved');
    });

    it('✓ Should reject review', async () => {
      const res = await request(app)
        .put(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approved: false,
          rejectionReason: 'Offensive content',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
    });

    it('✗ Should not allow regular users to approve', async () => {
      const res = await request(app)
        .put(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          approved: true,
        });

      expect(res.status).toBe(403);
    });
  });
});
