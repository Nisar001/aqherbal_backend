/**
 * Test Setup & Configuration
 * Handles database connection, cleanup, and test utilities
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Set test environment before loading modules
process.env.NODE_ENV = 'test';

// Load test environment
dotenv.config({ path: '.env.test' });

/**
 * Test Database Connection
 */
export const connectTestDB = async () => {
  try {
    // If already connected, disconnect first
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
      await mongoose.connection.close();
    }
    
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/aqherbal_test';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✓ Test database connected');
  } catch (error) {
    console.error('✗ Test database connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Disconnect Test Database
 */
export const disconnectTestDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✓ Test database disconnected');
  } catch (error) {
    console.error('✗ Test database disconnection failed:', error.message);
  }
};

/**
 * Clear Database Collections
 */
export const clearDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log('✓ Database cleared');
  } catch (error) {
    console.error('✗ Database clear failed:', error.message);
  }
};

/**
 * Seed Test Data
 */
export const seedTestData = async (model, data) => {
  try {
    return await model.insertMany(data);
  } catch (error) {
    console.error('✗ Data seeding failed:', error.message);
    throw error;
  }
};

/**
 * Mock External Services
 */
export const mockServices = {
  // Mock Cloudinary
  uploadImage: jest.fn().mockResolvedValue({
    public_id: 'test_image_123',
    secure_url: 'https://res.cloudinary.com/test/image/upload/v123/test_image_123.jpg',
  }),

  // Mock Email Service
  sendEmail: jest.fn().mockResolvedValue({
    messageId: 'test_msg_123',
    status: 'sent',
  }),

  // Mock Payment Gateway
  initiatePayment: jest.fn().mockResolvedValue({
    paymentId: 'pay_test_123',
    shortUrl: 'https://rzp.io/test123',
    status: 'initiated',
  }),

  // Mock Shipment Tracking
  trackShipment: jest.fn().mockResolvedValue({
    trackingNumber: 'TEST123456789',
    status: 'delivered',
    lastUpdate: new Date(),
  }),

  // Mock Redis
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
};

/**
 * Generate Test JWT Token
 */
export const generateTestToken = (userId, role = 'user') => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { userId, role, email: `test${userId}@example.com` },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
  return token;
};

/**
 * Create Test User with all required fields
 */
export const createTestUser = async (User, overrides = {}) => {
  const defaults = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'SecurePass123!',
    phone: '+919876543210',
    countryCode: '+91',
    role: 'user',
    ...overrides,
  };
  return User.create(defaults);
};

/**
 * Global Test Setup
 */
beforeAll(async () => {
  await connectTestDB();
});

/**
 * Global Test Teardown
 */
afterAll(async () => {
  await disconnectTestDB();
});

/**
 * Clear Database After Each Test
 */
afterEach(async () => {
  await clearDatabase();
});

export default {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  seedTestData,
  mockServices,
  generateTestToken,
  createTestUser,
};
