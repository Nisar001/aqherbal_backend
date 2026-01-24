/**
 * Authentication & Authorization Tests
 * Tests: Registration, Login, Token Refresh, Password Reset
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import app from '../src/server.js';
import User from '../src/models/user.model.js';
import { generateTestToken, clearDatabase } from './setup.js';

describe('🔐 Authentication & Authorization', () => {
  
  // ============= REGISTER TESTS =============
  describe('POST /api/v1/auth/register', () => {
    
    it('✓ Should register user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'SecurePass123!',
          name: 'John',
          lastName: 'Doe',
          phone: '+919876543210',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('newuser@test.com');
      expect(res.body.user.password).toBeUndefined(); // Password should not be returned
    });

    it('✗ Should fail registration with existing email', async () => {
      // Register first user
      await User.create({
        email: 'existing@test.com',
        password: 'hashedpassword',
        name: 'John',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@test.com',
          password: 'SecurePass123!',
          name: 'Jane',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Email');
    });

    it('✗ Should fail registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          name: 'John',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('✗ Should fail registration with weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: '123',
          name: 'John',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('password');
    });

    it('✗ Should fail registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          // Missing password
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('✗ Should reject oversized payload', async () => {
      const largePayload = 'x'.repeat(10000);
      
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: 'SecurePass123!',
          name: largePayload,
        });

      expect(res.status).toBe(400);
    });
  });

  // ============= LOGIN TESTS =============
  describe('POST /api/v1/auth/login', () => {
    
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'login@test.com',
        password: 'SecurePass123!',
        name: 'John',
        isEmailVerified: true,
      });
    });

    it('✓ Should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('login@test.com');
    });

    it('✗ Should fail login with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid credentials');
    });

    it('✗ Should fail login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(401);
    });

    it('✗ Should fail login with missing credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should fail login with unverified email', async () => {
      await User.create({
        email: 'unverified@test.com',
        password: 'SecurePass123!',
        name: 'Jane',
        isEmailVerified: false,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unverified@test.com',
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(403);
    });
  });

  // ============= TOKEN REFRESH TESTS =============
  describe('POST /api/v1/auth/refresh-token', () => {
    
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'refresh@test.com',
        password: 'SecurePass123!',
        name: 'John',
        refreshTokens: [],
      });

      // Simulate stored refresh token
      refreshToken = generateTestToken(testUser._id.toString(), 'user');
      testUser.refreshTokens.push(refreshToken);
      await testUser.save();
    });

    it('✓ Should refresh token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.token).not.toBe(refreshToken);
    });

    it('✗ Should fail with invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid_token_xyz' });

      expect(res.status).toBe(401);
    });

    it('✗ Should fail with expired refresh token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid';
      
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: expiredToken });

      expect(res.status).toBe(401);
    });
  });

  // ============= VERIFY EMAIL TESTS =============
  describe('POST /api/v1/auth/verify-email', () => {
    
    it('✓ Should verify email with valid token', async () => {
      const user = await User.create({
        email: 'verify@test.com',
        password: 'SecurePass123!',
        name: 'John',
        isEmailVerified: false,
        verificationToken: 'valid_verification_token',
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'valid_verification_token' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('verified');

      // Check database
      const updated = await User.findById(user._id);
      expect(updated.isEmailVerified).toBe(true);
    });

    it('✗ Should fail verification with invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid_token' });

      expect(res.status).toBe(400);
    });
  });

  // ============= PASSWORD RESET TESTS =============
  describe('POST /api/v1/auth/forgot-password', () => {
    
    it('✓ Should send password reset email', async () => {
      await User.create({
        email: 'forgot@test.com',
        password: 'SecurePass123!',
        name: 'John',
      });

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'forgot@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('reset');
    });

    it('✗ Should handle non-existent email gracefully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      // Should still return 200 for security (don't leak user existence)
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    
    it('✓ Should reset password with valid token', async () => {
      const user = await User.create({
        email: 'reset@test.com',
        password: 'OldPassword123!',
        name: 'John',
        resetPasswordToken: 'valid_reset_token',
        resetPasswordExpires: new Date(Date.now() + 3600000),
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'valid_reset_token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });

      expect(res.status).toBe(200);

      // Verify password changed
      const updated = await User.findById(user._id);
      expect(updated.password).not.toBe('OldPassword123!');
    });

    it('✗ Should fail with expired token', async () => {
      const user = await User.create({
        email: 'expired@test.com',
        password: 'OldPassword123!',
        name: 'John',
        resetPasswordToken: 'expired_token',
        resetPasswordExpires: new Date(Date.now() - 3600000), // Expired
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'expired_token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should fail with mismatched passwords', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'valid_reset_token',
          password: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('match');
    });
  });

  // ============= AUTHORIZATION TESTS =============
  describe('Authorization & Permission Enforcement', () => {
    
    let userToken;
    let adminToken;

    beforeEach(async () => {
      const user = await User.create({
        email: 'user@test.com',
        password: 'SecurePass123!',
        name: 'User',
        role: 'user',
      });

      const admin = await User.create({
        email: 'admin@test.com',
        password: 'SecurePass123!',
        name: 'Admin',
        role: 'admin',
      });

      userToken = generateTestToken(user._id.toString(), 'user');
      adminToken = generateTestToken(admin._id.toString(), 'admin');
    });

    it('✓ Admin can access admin endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).not.toBe(403);
    });

    it('✗ Regular user cannot access admin endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('✗ Unauthenticated user cannot access protected endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard');

      expect(res.status).toBe(401);
    });

    it('✗ Invalid token is rejected', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', 'Bearer invalid_token_123');

      expect(res.status).toBe(401);
    });
  });

  // ============= SECURITY TESTS =============
  describe('Security & Injection Prevention', () => {
    
    it('✗ Should reject XSS attempts in email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: '<script>alert("xss")</script>@test.com',
          password: 'SecurePass123!',
          name: 'John',
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should reject SQL injection attempts', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "'; DROP TABLE users; --",
          password: 'password',
        });

      expect(res.status).toBe(400);
    });

    it('✗ Should reject NoSQL injection attempts', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { $ne: null },
          password: { $ne: null },
        });

      expect(res.status).toBe(400);
    });
  });

  // ============= LOGOUT TESTS =============
  describe('POST /api/v1/auth/logout', () => {
    
    let userToken;

    beforeEach(async () => {
      const user = await User.create({
        email: 'logout@test.com',
        password: 'SecurePass123!',
        name: 'John',
      });
      userToken = generateTestToken(user._id.toString(), 'user');
    });

    it('✓ Should logout user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('logout');
    });

    it('✗ Should fail logout without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(401);
    });
  });
});
