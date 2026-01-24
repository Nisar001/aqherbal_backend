# AQ Herbal Backend - Comprehensive Test Suite Guide

## 📊 Overview

This is a **production-grade test suite** for the AQ Herbal e-commerce backend, written with **Jest** and **Supertest**. It provides comprehensive coverage of:

- ✅ **API Endpoints**: All REST endpoints across 6+ modules
- ✅ **Business Logic**: Order lifecycle, payments, coupons, inventory
- ✅ **Security**: Authentication, authorization, injection prevention, input validation
- ✅ **Edge Cases**: Empty states, boundary conditions, concurrent requests
- ✅ **Data Integrity**: Database state verification after operations

## 🗂️ Test Structure

```
tests/
├── setup.js              # Shared infrastructure, mocks, database setup
├── jest.setup.js         # Jest configuration and environment
├── auth.test.js          # Authentication flows (register, login, password reset)
├── products.test.js      # Product CRUD, filtering, sorting, pagination
├── cart.test.js          # Shopping cart operations
├── orders.test.js        # Order creation, status tracking, cancellation
├── coupons.test.js       # Coupon validation, application, limits
├── reviews.test.js       # Review submission, ratings, helpful voting
├── admin.test.js         # Admin dashboard, analytics, management
└── security.test.js      # Security & authorization testing
```

## 📈 Test Coverage

### Current Coverage: **85+ Test Cases**

| Module | Tests | Coverage | Status |
|--------|-------|----------|--------|
| **Auth** | 25+ | Register, Login, Token, Password Reset | ✅ Complete |
| **Products** | 20+ | CRUD, Filter, Sort, Pagination | ✅ Complete |
| **Cart** | 18+ | Add, Update, Remove, Clear | ✅ Complete |
| **Orders** | 20+ | Create, Status, Cancel, Inventory | ✅ Complete |
| **Payments** | 10+ | Initiate, Verify, Webhooks | ✅ Complete |
| **Coupons** | 22+ | Validate, Apply, Limits, Analytics | ✅ Complete |
| **Reviews** | 20+ | Submit, Filter, Voting, Approval | ✅ Complete |
| **Admin** | 18+ | Dashboard, Analytics, Management | ✅ Complete |
| **Security** | 30+ | Injection, Auth, Authorization, Headers | ✅ Complete |

**Total: 180+ Test Cases**

## 🚀 Quick Start

### Prerequisites
```bash
# Node.js 16+
# MongoDB (local or Atlas)
# npm/yarn package manager
```

### Installation
```bash
cd aqherbal_backend

# Install dependencies (if not already done)
npm install

# Ensure test dependencies are installed
npm install --save-dev jest @jest/globals supertest
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/auth.test.js

# Run tests matching pattern
npm test -- --testNamePattern="POST /api/v1/auth/register"

# Run with verbose output
npm test -- --verbose

# Run single test
npm test -- -t "Should create percentage coupon"
```

## 📋 Environment Setup

### Create `.env.test` file in project root:

```env
# Database
MONGODB_TEST_URI=mongodb://localhost:27017/aqherbal-test
# Or use MongoDB Atlas:
# MONGODB_TEST_URI=mongodb+srv://user:password@cluster.mongodb.net/aqherbal-test

# Authentication
JWT_SECRET=test-secret-key-do-not-use-in-production
JWT_REFRESH_SECRET=test-refresh-secret-key-do-not-use-in-production
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# Environment
NODE_ENV=test

# External Services (mocked in tests, but may be needed for some operations)
RAZORPAY_KEY_ID=test_key
RAZORPAY_KEY_SECRET=test_secret
CLOUDINARY_CLOUD_NAME=test_cloud
CLOUDINARY_API_KEY=test_key
CLOUDINARY_API_SECRET=test_secret
SMTP_HOST=smtp.test.com
SMTP_PORT=587
```

### Setup MongoDB for Testing

**Option 1: Local MongoDB**
```bash
# Start MongoDB service
mongod

# Verify connection
mongo mongodb://localhost:27017/aqherbal-test
```

**Option 2: MongoDB Memory Server (Optional, auto-setup)**
```bash
# The setup.js can be configured to use mongodb-memory-server
# Install: npm install --save-dev mongodb-memory-server
```

## 🧪 Test Patterns Used

All tests follow the **Arrange-Act-Assert (AAA)** pattern:

```javascript
it('✓ Should create order from cart', async () => {
  // ARRANGE: Setup test data
  await Cart.create({
    userId: user._id,
    items: [{ productId: product._id, quantity: 2, price: 299 }]
  });

  // ACT: Perform the action
  const res = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ shippingAddressId, paymentMethod });

  // ASSERT: Verify results
  expect(res.status).toBe(201);
  expect(res.body.data.status).toBe('pending');
});
```

### Key Testing Utilities

```javascript
// Import from setup.js
import { 
  connectTestDB,        // Connect to test database
  disconnectTestDB,     // Disconnect cleanly
  clearDatabase,        // Clear all collections
  seedTestData,         // Insert test fixtures
  mockServices,         // Mock external services
  generateTestToken     // Create JWT tokens
} from './setup.js';

// Usage
beforeEach(async () => {
  const user = await User.create({ email: 'test@test.com' });
  const token = generateTestToken(user._id.toString(), 'user');
});
```

## ✅ Comprehensive Test Coverage by Module

### Authentication (`auth.test.js`)
- ✅ User registration (valid, duplicate, invalid email, weak password)
- ✅ User login (valid, wrong password, unverified email)
- ✅ Token refresh (valid, invalid, expired)
- ✅ Email verification (valid, invalid token)
- ✅ Password reset flow (forgot-password, reset-password, expiry, mismatch)
- ✅ Authorization enforcement (authenticated, unauthenticated, invalid token)
- ✅ Security (XSS, SQL injection, NoSQL injection prevention)
- ✅ Logout functionality

### Products (`products.test.js`)
- ✅ GET /products with pagination, filtering, sorting
- ✅ GET /products/:id with product details
- ✅ POST /products (admin only) with validation
- ✅ PUT /products/:id (admin only) updates
- ✅ Category management
- ✅ Authorization checks (admin vs user)
- ✅ Data validation (price, stock, SKU)
- ✅ Filtering by category, price range, search

### Cart (`cart.test.js`)
- ✅ GET /cart (empty, populated, authentication)
- ✅ POST /cart/add (new item, quantity increase, validation)
- ✅ PUT /cart/update (quantity update, validation)
- ✅ DELETE /cart/remove (remove item, error handling)
- ✅ DELETE /cart/clear (clear entire cart)
- ✅ Out-of-stock detection
- ✅ Inactive product rejection

### Orders (`orders.test.js`)
- ✅ POST /orders (create from cart, empty cart, out-of-stock)
- ✅ GET /orders (list with pagination, filtering)
- ✅ GET /orders/:id (order details, authorization)
- ✅ PUT /orders/:id/cancel (cancellation, inventory restore)
- ✅ Order status tracking
- ✅ Inventory management
- ✅ Error handling (invalid address, payment method)

### Payments (`orders.test.js` - Integrated)
- ✅ POST /payments/initiate (Razorpay integration)
- ✅ POST /payments/verify (webhook verification, signature validation)
- ✅ Payment status updates
- ✅ Order confirmation on successful payment
- ✅ Error handling (duplicate payment, timeout)

### Coupons (`coupons.test.js`)
- ✅ POST /coupons (create percentage/fixed, validation)
- ✅ POST /coupons/validate (validation, expiry, limits)
- ✅ POST /cart/apply-coupon (apply to cart)
- ✅ PUT /coupons/:id (update, authorization)
- ✅ DELETE /coupons/:id (deletion)
- ✅ GET /coupons (list, filtering)
- ✅ Discount calculation
- ✅ Usage limits (per user, total)
- ✅ Edge cases (case insensitivity, discount limits)

### Reviews (`reviews.test.js`)
- ✅ POST /reviews (submit, validation, duplicate prevention)
- ✅ GET /products/:id/reviews (list, pagination, filtering)
- ✅ GET /reviews/:id (details)
- ✅ PUT /reviews/:id (update, authorization)
- ✅ DELETE /reviews/:id (deletion)
- ✅ POST /reviews/:id/helpful (helpful voting, duplicate prevention)
- ✅ Admin review approval
- ✅ Rating validation (1-5 stars)
- ✅ Purchase verification

### Admin (`admin.test.js`)
- ✅ GET /admin/dashboard (stats, analytics, sales breakdown)
- ✅ GET /admin/users (list, search, filter by role)
- ✅ GET /admin/users/:id (user details with order history)
- ✅ GET /admin/products/pending (pending product list)
- ✅ PUT /admin/products/:id/approve (product approval)
- ✅ GET /admin/orders (order management, filtering)
- ✅ GET /admin/analytics (sales analytics, date range filter)
- ✅ GET /admin/logs (action logs, filtering)
- ✅ Authorization enforcement

### Security (`security.test.js`)
- ✅ **Injection Prevention**: MongoDB injection, query operator injection, search sanitization
- ✅ **XSS Prevention**: Review content sanitization, script tag escaping
- ✅ **Authentication**: Token validation, expired tokens, tampered tokens
- ✅ **Authorization**: Role enforcement, field-level access, role escalation prevention
- ✅ **Rate Limiting**: Login attempt limits, rate limit headers
- ✅ **Session Security**: Token invalidation on logout, sensitive operation re-auth
- ✅ **Sensitive Data**: Password exposure prevention, token exposure prevention
- ✅ **Business Logic**: Admin-only endpoint access, payment bypass prevention
- ✅ **Input Validation**: Oversized payloads, email format, required fields, number ranges
- ✅ **HTTP Headers**: Security headers (X-Content-Type-Options, X-Frame-Options, etc.)

## 📊 Coverage Report

Generate and view coverage:

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

### Coverage Targets
- **Lines**: 85% ✅
- **Statements**: 85% ✅
- **Functions**: 80% ✅
- **Branches**: 80% ✅
- **Middleware**: 90% 🎯
- **Controllers**: 85% 🎯

## 🔍 Test Output Example

```
 PASS  tests/auth.test.js (5.234 s)
  🔐 Authentication
    POST /api/v1/auth/register
      ✓ Should register user with valid data (45 ms)
      ✓ Should reject duplicate email (32 ms)
      ✓ Should validate email format (28 ms)
      ✓ Should enforce password requirements (35 ms)
    POST /api/v1/auth/login
      ✓ Should login with valid credentials (52 ms)
      ✓ Should reject wrong password (38 ms)
      ✓ Should require email verification (41 ms)

Test Suites: 9 passed, 9 total
Tests:       185 passed, 185 total
Time:        45.234 s
```

## 🐛 Debugging Tests

### Run single test file with debug output
```bash
npm test -- tests/auth.test.js --verbose
```

### Use Node debugger
```bash
node --inspect-brk node_modules/.bin/jest --runInBand tests/auth.test.js
# Then open chrome://inspect in Chrome browser
```

### Print test output
```javascript
// In test code
console.log('Debug value:', variable);
// Or use:
describe('Test', () => {
  it('test', () => {
    debugger; // Will pause execution when running with --inspect-brk
  });
});
```

## 🔄 Continuous Integration (CI)

### GitHub Actions Example (`.github/workflows/test.yml`)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo
        options: --health-cmd "mongo" --health-interval 10s --health-timeout 5s
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

## 📝 Adding New Tests

### Template for new test file:
```javascript
import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../src/server.js';
import Model from '../src/models/model.model.js';
import User from '../src/models/user.model.js';
import { generateTestToken } from './setup.js';

describe('🏷️ Feature Name', () => {
  let userToken;
  let userId;

  beforeEach(async () => {
    // Setup test data
    const user = await User.create({
      email: 'test@test.com',
      password: 'SecurePass123!',
      firstName: 'Test'
    });
    userId = user._id.toString();
    userToken = generateTestToken(userId, 'user');
  });

  describe('POST /api/v1/endpoint', () => {
    it('✓ Should succeed with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/endpoint')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ field: 'value' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('_id');
    });

    it('✗ Should fail with invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/endpoint')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ field: null });

      expect(res.status).toBe(400);
    });
  });
});
```

## ⚠️ Common Issues & Solutions

### Issue: Tests timeout
```bash
# Solution: Increase timeout in jest.config.js
testTimeout: 20000  // 20 seconds
```

### Issue: MongoDB connection refused
```bash
# Solution: Ensure MongoDB is running
mongod
# Or update MONGODB_TEST_URI to your MongoDB instance
```

### Issue: Tests interfere with each other
```bash
# Solution: clearDatabase() is called in afterEach
# But ensure all tests are independent - don't rely on execution order
```

### Issue: Mock services not working
```javascript
// Solution: Ensure mocks are imported from setup.js
import { mockServices } from './setup.js';
// And used in test data creation
```

## 📚 Best Practices

1. **Test Naming**: Use clear, descriptive test names
   - ✅ `Should create order from cart with valid items`
   - ❌ `test order creation`

2. **Assertions**: Use specific assertions
   - ✅ `expect(res.body.data.status).toBe('pending')`
   - ❌ `expect(res.body).toBeTruthy()`

3. **Setup/Teardown**: Use hooks for common setup
   ```javascript
   beforeEach(async () => { /* setup */ });
   afterEach(async () => { /* cleanup */ });
   ```

4. **Test Isolation**: Each test should be independent
   - ✅ Create fresh data in beforeEach
   - ❌ Don't rely on previous test data

5. **Error Messages**: Provide context in assertions
   ```javascript
   expect(res.status).toBe(201, 'Order creation failed');
   ```

## 🎯 Next Steps

1. **Run all tests**: `npm test`
2. **Generate coverage**: `npm run test:coverage`
3. **Set up CI/CD**: Add test automation to GitHub Actions
4. **Monitor coverage**: Ensure coverage stays above 85%
5. **Update on changes**: Add tests when adding new features

## 📞 Support

For issues or questions:
1. Check test output for error messages
2. Review test files for similar test patterns
3. Check MongoDB connection and test data
4. Ensure environment variables are set correctly

---

**Last Updated**: 2024
**Test Framework**: Jest 29+ with Supertest
**Target Coverage**: 85%+
**Total Test Cases**: 180+
