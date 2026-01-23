# AQHerbal Backend - Complete API Reference

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
All endpoints except webhooks require JWT in header:
```
Authorization: Bearer <token>
```

---

## 📦 PHASE 1: Core Features (COMPLETED)

### Auth Module

#### Register
```
POST /auth/register
Body: {
  name: string,
  email: string,
  password: string,
  countryCode: string,
  phone: string
}
Response: { user, tokens: { accessToken, refreshToken } }
```

#### Login
```
POST /auth/login
Body: { email, password }
Response: { user, tokens: { accessToken, refreshToken } }
```

#### Refresh Token
```
POST /auth/refresh-token
Body: { refreshToken }
Response: { accessToken, refreshToken }
```

#### Forgot Password
```
POST /auth/forgot-password
Body: { email }
Response: { message: "Password reset link sent" }
```

#### Reset Password
```
POST /auth/reset-password
Body: { token, password }
Response: { message: "Password reset successful" }
```

#### Get Profile
```
GET /auth/profile
Response: { user: {...} }
```

#### Update Profile
```
PUT /auth/profile
Body: { name?, email?, phone?, countryCode?, address? }
Response: { user: {...} }
```

### Product Catalog

#### List Products (Paginated + Filtered)
```
GET /products?page=1&limit=10&categoryId=xxx&minPrice=100&maxPrice=5000&search=ashwagandha&tags=immune
Response: {
  items: [{ id, name, price, discount, images, rating, reviewCount }],
  pagination: { page, limit, total, pages }
}
```

#### Get Product Details
```
GET /products/view/:productId
Response: { 
  id, name, description, price, discount, stock, images, 
  categoryId, rating, reviewCount, rating_distribution 
}
```

### Category Catalog

#### List Categories (Paginated)
```
GET /categories?page=1&limit=20
Response: {
  items: [{ id, name, description, image }],
  pagination: { page, limit, total, pages }
}
```

#### Get Category Details
```
GET /categories/view/:categoryId
Response: { id, name, description, image, parentId? }
```

### Cart Management

#### Get User Cart
```
GET /cart
Response: {
  items: [{ productId, quantity, discountedPrice }],
  subtotal: 150,
  tax: 15,
  total: 165
}
```

#### Add to Cart
```
POST /cart/items
Body: { productId, quantity }
Response: { items, subtotal, tax, total, message: "Added to cart" }
Error: { status: 400, message: "Insufficient stock. Available: 5" }
```

#### Update Cart Item Quantity
```
PUT /cart/items/:productId
Body: { quantity }
Response: { items, subtotal, tax, total }
```

#### Remove from Cart
```
DELETE /cart/items/:productId
Response: { items, subtotal, tax, total }
```

#### Clear Cart
```
DELETE /cart
Response: { items: [], subtotal: 0, tax: 0, total: 0 }
```

---

## 💳 PHASE 2: Commerce (Orders + Payments + Reviews)

### Orders

#### Create Order from Cart
```
POST /orders
Body: {
  shippingAddress: {
    street: string,
    city: string,
    state: string,
    zip: string,
    country: string
  },
  couponCode?: string
}
Response: {
  orderNumber: "ORD-123456-7890",
  items: [...],
  subtotal, tax, totalAmount,
  status: "pending",
  shippingAddress,
  placedAt,
  statusHistory: [{ status: "pending", changedAt, notes: "Order created" }]
}
```

#### Get User Orders
```
GET /orders/my-orders?page=1&limit=10
Response: {
  orders: [{ orderNumber, totalAmount, status, placedAt }],
  pagination: { page, limit, total, pages }
}
```

#### Get Order Details
```
GET /orders/view/:orderId
Response: { full order object with items, payment status, tracking }
```

#### Cancel Order
```
DELETE /orders/:orderId/cancel
Body: { reason?: string }
Response: { 
  orderNumber, 
  status: "cancelled",
  message: "Order cancelled, stock released"
}
```

#### [Admin] Update Order Status
```
PUT /orders/:orderId/status
Body: {
  status: "pending|confirmed|processing|shipped|delivered|cancelled|refunded",
  notes?: "Admin notes"
}
Response: { order with updated status and history }
```

#### [Admin] List Orders by Status
```
GET /orders/status/:status?page=1&limit=20
Response: {
  orders: [...],
  pagination: { page, limit, total, pages }
}
```

#### [Admin] Recent Orders
```
GET /orders/admin/recent?limit=10
Response: [ { orderNumber, user: { name, email }, items, totalAmount, placedAt } ]
```

### Payments

#### Initiate Payment
```
POST /payments/initiate
Body: {
  orderId: string,
  method: "card|bank_transfer|wallet"
}
Response: {
  paymentId,
  clientSecret,    // For Stripe
  amount,
  orderId
}
```

#### Get Payment History
```
GET /payments/history?page=1&limit=10
Response: {
  payments: [{ paymentId, amount, status, method, createdAt }],
  pagination: { page, limit, total, pages }
}
```

#### Retry Failed Payment
```
POST /payments/retry/:paymentId
Response: { paymentId, clientSecret, ... }
```

#### [Webhook] Stripe Payment Success/Failure
```
POST /payments/webhook/stripe
Headers: { stripe-signature: <signature> }
Body: Stripe event JSON
Response: { received: true }
```

#### [Admin] Failed Payments
```
GET /payments/admin/failed?hours=24
Response: [{ paymentId, orderId, amount, reason, createdAt }]
```

### Reviews

#### Submit Product Review
```
POST /reviews
Body: {
  productId: string,
  orderId?: string,      // For verification
  rating: 1-5,
  title: string,
  comment?: string,
  media?: [urls]
}
Response: {
  id, productId, rating, title, comment,
  status: "pending",     // Awaiting moderation
  isVerified: true|false
}
```

#### Get Product Reviews (Public)
```
GET /reviews/product/:productId?page=1&limit=10
Response: {
  reviews: [{ userId: { name, avatar }, rating, title, comment, createdAt }],
  rating: { average: 4.5, count: 128 },
  pagination: { page, limit, total, pages }
}
```

#### Get Product Rating Summary
```
GET /reviews/summary/:productId
Response: {
  average: 4.5,
  total: 128,
  distribution: { 5: 80, 4: 30, 3: 10, 2: 5, 1: 3 },
  verified: 120
}
```

#### Get My Reviews
```
GET /reviews/my-reviews
Response: [{ id, productId, rating, title, status, createdAt }]
```

#### Update My Review
```
PUT /reviews/:reviewId
Body: { rating?, title?, comment?, media? }
Response: { updated review (status reset to pending) }
Error: Cannot update approved reviews
```

#### Delete My Review
```
DELETE /reviews/:reviewId
Response: { message: "Review deleted" }
```

#### [Admin] Pending Reviews Queue
```
GET /reviews/admin/pending?limit=20
Response: [{ id, productId: { name }, userId: { name, email }, rating, title }]
```

#### [Admin] Approve Review
```
PUT /reviews/admin/:reviewId/approve
Response: { 
  review: { status: "approved" },
  product: { rating: 4.5, reviewCount: 129 }  // Updated aggregates
}
```

#### [Admin] Reject Review
```
PUT /reviews/admin/:reviewId/reject
Body: { rejectionReason: string }
Response: { review: { status: "rejected", rejectionReason } }
```

---

## 🏗️ PHASE 3: Advanced Features (TODO)

### Coupons (Planned)
- POST /coupons/apply - Apply coupon to order
- GET /coupons - List active coupons
- [Admin] POST /coupons - Create coupon
- [Admin] PUT /coupons/:id - Edit coupon

### Inventory (Planned)
- GET /inventory/low-stock - Low stock alerts
- GET /inventory/history - Stock movement history
- [Admin] POST /inventory/adjust - Adjust stock

### Notifications (Planned)
- GET /notifications - Get user notifications
- PUT /notifications/:id/read - Mark as read
- [Admin] POST /notifications/send - Send notification

### Admin Dashboard (Planned)
- [Admin] GET /admin/users - User management
- [Admin] POST /admin/products - Create product
- [Admin] PUT /admin/products/:id - Edit product
- [Admin] DELETE /admin/products/:id - Delete product
- [Admin] GET /admin/analytics - Dashboard stats
- [Admin] GET /admin/orders - All orders management
- [Admin] PUT /admin/categories/:id - Edit category

---

## Error Response Format

All errors follow this format:
```json
{
  "status": 400,
  "message": "Validation error",
  "data": null,
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

Common status codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Server Error

---

## Success Response Format

```json
{
  "status": 200,
  "message": "Products fetched",
  "data": { ... },
  "pagination": { "page": 1, "limit": 10, "total": 100, "pages": 10 }
}
```

---

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=production

# Database
DB_URL=mongodb+srv://user:password@cluster.mongodb.net/aqherbal

# Auth
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW=60000       # 1 minute
RATE_LIMIT_MAX=200           # requests per window
RATE_LIMIT_WINDOW_AUTH=60000
RATE_LIMIT_MAX_AUTH=20

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Payment (Stripe)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=app_password

# Admin
BLACKLISTED_IPS=192.168.1.1,10.0.0.1
```

---

## Quick Test Workflow

### 1. Register & Login
```bash
POST /auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "countryCode": "+1",
  "phone": "5551234567"
}

→ Copy accessToken from response
```

### 2. Browse Products
```bash
GET /products?categoryId=ashwagandha&minPrice=100&maxPrice=500
GET /products/view/product-id-123
```

### 3. Add to Cart
```bash
POST /cart/items
{ "productId": "60d5ec49c1234567", "quantity": 2 }
```

### 4. Create Order
```bash
POST /orders
{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "USA"
  }
}

→ Copy orderNumber and orderId
```

### 5. Initiate Payment
```bash
POST /payments/initiate
{ "orderId": "order-id-123", "method": "card" }

→ Use clientSecret for Stripe payment on frontend
```

### 6. Check Order Status
```bash
GET /orders/view/order-id-123
```

### 7. Leave Review
```bash
POST /reviews
{
  "productId": "60d5ec49c1234567",
  "orderId": "order-id-123",
  "rating": 5,
  "title": "Excellent product!",
  "comment": "Works as advertised"
}
```

---

**API Version**: 1.0  
**Last Updated**: 2026-01-22  
**Status**: Phase 2 Complete, Phase 3 In Development
