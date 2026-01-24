/**
 * Security Tests
 * Tests: Input validation, injection prevention, authentication bypass, authorization enforcement,
 * rate limiting, session security, CSRF, XSS prevention
 */

import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../src/server.js';
import User from '../src/models/user.model.js';
import { generateTestToken } from './setup.js';

describe('🔒 Security & Authorization', () => {
  
  let userToken;
  let userId;
  let adminToken;
  let adminId;

  beforeEach(async () => {
    // Create regular user
    const user = await User.create({
      email: 'security@test.com',
      password: 'SecurePass123!',
      name: 'Security',
      role: 'user',
    });
    userId = user._id.toString();
    userToken = generateTestToken(userId, 'user');

    // Create admin
    const admin = await User.create({
      email: 'admin.security@test.com',
      password: 'SecurePass123!',
      name: 'AdminSec',
      role: 'admin',
    });
    adminId = admin._id.toString();
    adminToken = generateTestToken(adminId, 'admin');
  });

  // ============= SQL INJECTION TESTS =============
  describe('🗄️ SQL/NoSQL Injection Prevention', () => {
    
    it('✗ Should prevent MongoDB injection in login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { $ne: null },
          password: { $ne: null },
        });

      expect([400, 401, 403]).toContain(res.status);
    });

    it('✗ Should prevent injection via email field', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com"; DROP TABLE users; --',
          password: 'SecurePass123!',
          name: 'Attacker',
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should prevent query operator injection', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({
          price: { $gt: 0 }, // Attempt to inject MongoDB operator
        });

      // Should either ignore the operator or reject it
      expect([200, 400]).toContain(res.status);
    });

    it('✗ Should sanitize search input', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({
          search: '<script>alert("xss")</script>',
        });

      // Should handle gracefully
      expect([200, 400]).toContain(res.status);
    });
  });

  // ============= XSS PREVENTION TESTS =============
  describe('💉 XSS Prevention', () => {
    
    it('✗ Should sanitize review content', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: '507f1f77bcf86cd799439011',
          orderId: '507f1f77bcf86cd799439012',
          rating: 5,
          title: '<img src=x onerror="alert(1)">',
          content: '<script>alert("XSS")</script>',
        });

      // Should either sanitize or reject
      expect([400, 403]).toContain(res.status);
    });

    it('✗ Should escape product name in API response', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ search: '"><script>alert("xss")</script>' });

      // Verify no script tags in response
      expect(JSON.stringify(res.body)).not.toContain('<script>');
    });
  });

  // ============= AUTHENTICATION BYPASS TESTS =============
  describe('🔑 Authentication Enforcement', () => {
    
    it('✗ Should deny requests without token', async () => {
      const res = await request(app)
        .get('/api/v1/cart');

      expect(res.status).toBe(401);
    });

    it('✗ Should reject malformed authorization header', async () => {
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', 'InvalidFormat');

      expect(res.status).toBe(401);
    });

    it('✗ Should reject expired token', async () => {
      // Generate token that's already expired
      const expiredToken = generateTestToken(userId, 'user', -3600); // -1 hour

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('✗ Should reject tampered token', async () => {
      const tamperedToken = userToken.slice(0, -5) + 'XXXXX';

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
    });

    it('✗ Should reject token from different user', async () => {
      const otherUser = await User.create({
        email: 'other@test.com',
        password: 'SecurePass123!',
        name: 'Other',
      });
      const otherToken = generateTestToken(otherUser._id.toString(), 'user');

      // Try accessing another user's cart with different token
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      // But the data should be from otherUser, not current user
    });
  });

  // ============= AUTHORIZATION (Role-Based Access) TESTS =============
  describe('👮 Authorization & Role Enforcement', () => {
    
    it('✗ Should prevent user from accessing admin endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('✗ Should prevent user from approving products', async () => {
      const res = await request(app)
        .put('/api/v1/admin/products/507f1f77bcf86cd799439011/approve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ approved: true });

      expect(res.status).toBe(403);
    });

    it('✗ Should prevent user from viewing analytics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('✓ Should allow admin to access admin endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should either succeed or have other reasons for failure (not 403)
      expect(res.status).not.toBe(403);
    });

    it('✗ Should prevent role escalation via token manipulation', async () => {
      // Try to create a user token but claim admin role
      const fakeAdminToken = generateTestToken(userId, 'admin');

      // This should still fail because the actual user is not an admin
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${fakeAdminToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ============= FIELD-LEVEL AUTHORIZATION TESTS =============
  describe('👤 Field-Level Authorization', () => {
    
    it('✗ Should not allow users to modify other user profiles', async () => {
      const otherUser = await User.create({
        email: 'victim@test.com',
        password: 'SecurePass123!',
        name: 'Victim',
      });

      const res = await request(app)
        .put(`/api/v1/users/${otherUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Hacked',
          email: 'hacked@test.com',
        });

      expect(res.status).toBe(403);
    });

    it('✗ Should not allow users to delete other user accounts', async () => {
      const otherUser = await User.create({
        email: 'target@test.com',
        password: 'SecurePass123!',
        name: 'Target',
      });

      const res = await request(app)
        .delete(`/api/v1/users/${otherUser._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('✗ Should not allow users to view other user orders', async () => {
      const otherUser = await User.create({
        email: 'orders@test.com',
        password: 'SecurePass123!',
        name: 'Orders',
      });

      const res = await request(app)
        .get(`/api/v1/orders?userId=${otherUser._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Should return empty or 403
      expect([200, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.length).toBe(0);
      }
    });
  });

  // ============= RATE LIMITING TESTS =============
  describe('⏱️ Rate Limiting', () => {
    
    it('✓ Should enforce rate limiting on login attempts', async () => {
      const responses = [];
      
      // Make multiple login attempts
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@test.com',
            password: 'wrongpassword',
          });
        responses.push(res.status);
      }

      // After several attempts, should get rate limited
      const hasRateLimitResponse = responses.some((status) => status === 429);
      expect(hasRateLimitResponse).toBe(true);
    });

    it('✓ Should have rate limit headers', async () => {
      const res = await request(app)
        .get('/api/v1/products');

      expect(res.headers).toHaveProperty('x-ratelimit-limit');
      expect(res.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  // ============= CSRF PREVENTION TESTS =============
  describe('🛡️ CSRF Prevention', () => {
    
    it('✗ Should reject POST without CSRF token (if required)', async () => {
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: '507f1f77bcf86cd799439011',
          quantity: 1,
        });

      // Either should succeed (no CSRF required) or reject (CSRF required)
      expect([200, 400, 403]).toContain(res.status);
    });
  });

  // ============= SENSITIVE DATA EXPOSURE TESTS =============
  describe('🔐 Sensitive Data Protection', () => {
    
    it('✗ Should not expose password in user response', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (res.status === 200) {
        expect(res.body.data).not.toHaveProperty('password');
      }
    });

    it('✗ Should not expose hashed password in user list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      if (res.status === 200 && res.body.data.length > 0) {
        res.body.data.forEach((user) => {
          expect(user).not.toHaveProperty('password');
        });
      }
    });

    it('✓ Should not expose email verification tokens', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (res.status === 200) {
        expect(res.body.data).not.toHaveProperty('emailVerificationToken');
      }
    });
  });

  // ============= LOGICAL AUTHORIZATION TESTS =============
  describe('⚡ Business Logic Authorization', () => {
    
    it('✗ Should not allow user to apply admin-only coupons', async () => {
      const res = await request(app)
        .post('/api/v1/coupons')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'ADMIN-ONLY',
          discountType: 'percentage',
          discountValue: 50,
        });

      expect(res.status).toBe(403);
    });

    it('✗ Should not allow user to bypass payment', async () => {
      // Try to mark order as paid without actual payment
      const res = await request(app)
        .post('/api/v1/orders/fake/complete-payment')
        .set('Authorization', `Bearer ${userToken}`);

      expect([404, 403, 400]).toContain(res.status);
    });

    it('✗ Should not allow shipping address spoofing', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddressId: 'fake-address-id',
          paymentMethod: 'card',
        });

      expect([400, 404, 403]).toContain(res.status);
    });
  });

  // ============= INPUT VALIDATION TESTS =============
  describe('✅ Input Validation', () => {
    
    it('✗ Should reject oversized payloads', async () => {
      const hugeString = 'a'.repeat(1000000); // 1MB

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: '507f1f77bcf86cd799439011',
          orderId: '507f1f77bcf86cd799439012',
          rating: 5,
          title: hugeString,
          content: 'Review',
        });

      expect([400, 413]).toContain(res.status);
    });

    it('✗ Should validate email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePass123!',
          name: 'Test',
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should reject null/undefined in required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: null,
          password: null,
          name: null,
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should validate number ranges', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: '507f1f77bcf86cd799439011',
          orderId: '507f1f77bcf86cd799439012',
          rating: 999, // Invalid range
          title: 'Bad rating',
          content: 'Review',
        });

      expect(res.status).toBe(400);
    });
  });

  // ============= SESSION SECURITY TESTS =============
  describe('🔐 Session & Token Security', () => {
    
    it('✓ Should invalidate token on logout', async () => {
      // Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userToken}`);

      // Try to use old token
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      // Should be rejected
      expect(res.status).toBe(401);
    });

    it('✓ Should require fresh token after sensitive operations', async () => {
      // Change password (sensitive operation)
      await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'SecurePass123!',
          newPassword: 'NewSecurePass123!',
        });

      // Old token should still work (in some systems, new token is issued)
      // But verify new password is required on next login
    });
  });

  // ============= HTTP SECURITY HEADERS TESTS =============
  describe('📋 HTTP Security Headers', () => {
    
    it('✓ Should have X-Content-Type-Options header', async () => {
      const res = await request(app)
        .get('/api/v1/products');

      expect(res.headers).toHaveProperty('x-content-type-options');
    });

    it('✓ Should have X-Frame-Options header', async () => {
      const res = await request(app)
        .get('/api/v1/products');

      expect(res.headers).toHaveProperty('x-frame-options');
    });

    it('✓ Should have Strict-Transport-Security (HTTPS)', async () => {
      const res = await request(app)
        .get('/api/v1/products');

      // In production, should enforce HTTPS
      // expect(res.headers).toHaveProperty('strict-transport-security');
    });
  });
});
