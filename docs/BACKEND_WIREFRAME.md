# AQHerbal Backend Wireframing Blueprint

**Date:** January 22, 2026  
**Status:** Architecture & Design Phase  
**Target:** Enterprise-grade Herbal Medicine E-commerce Platform

---

## 📋 Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Authentication & Authorization Wireframe](#authentication--authorization-wireframe)
3. [User & Profile Management Wireframe](#user--profile-management-wireframe)
4. [Product & Catalog Wireframe](#product--catalog-wireframe)
5. [Media Management Wireframe](#media-management-wireframe)
6. [Cart Wireframe](#cart-wireframe)
7. [Wishlist Wireframe](#wishlist-wireframe)
8. [Inventory & Stock Wireframe](#inventory--stock-wireframe)
9. [Order Lifecycle Wireframe](#order-lifecycle-wireframe)
10. [Payments Wireframe](#payments-wireframe)
11. [Coupons & Discounts Wireframe](#coupons--discounts-wireframe)
12. [Reviews & Ratings Wireframe](#reviews--ratings-wireframe)
13. [Notifications Wireframe](#notifications-wireframe)
14. [Admin Panel Backend Wireframe](#admin-panel-backend-wireframe)
15. [Logging & Audit Wireframe](#logging--audit-wireframe)
16. [Cross-Cutting Concerns](#cross-cutting-concerns)
17. [Non-Functional Requirements](#non-functional-requirements)
18. [Validation Checklist](#validation-checklist)

---

## System Architecture Overview

### Tech Stack
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js v4.18+
- **Database:** MongoDB (Mongoose ODM)
- **Cache:** Redis (future implementation)
- **Media:** Cloudinary
- **Auth:** JWT (access + refresh tokens)
- **Validation:** Joi/express-validator
- **Logging:** Winston
- **Background Jobs:** node-cron (future: BullMQ)
- **Email:** Nodemailer
- **API Docs:** Swagger/OpenAPI

### Architectural Layers
```
┌─────────────────────────────────────┐
│      API Layer (Express Router)     │
├─────────────────────────────────────┤
│    Middleware (Auth, Validation,    │
│    Rate Limit, Sanitize, Error)    │
├─────────────────────────────────────┤
│     Controllers (Thin Handlers)     │
├─────────────────────────────────────┤
│     Services (Business Logic)       │
├─────────────────────────────────────┤
│    Repositories (Data Access)       │
├─────────────────────────────────────┤
│  Database (MongoDB) | Cache (Redis) │
└─────────────────────────────────────┘
```

### Module Dependency Graph
```
Auth
 └─ User (Profile, Address)
    ├─ Product (Catalog, Herbal Details)
    │  ├─ Media (Cloudinary)
    │  ├─ Category (Hierarchy)
    │  └─ Review & Rating
    ├─ Cart (Session/Persistent)
    │  └─ Inventory (Stock Validation)
    ├─ Wishlist
    ├─ Order
    │  ├─ Payment (Gateway)
    │  ├─ Inventory (Reservation/Deduction)
    │  └─ Notification (Email/SMS)
    ├─ Coupon & Discount
    └─ Notification

Admin
 ├─ Product Moderation
 ├─ User Management
 ├─ Order Management
 ├─ Inventory Control
 └─ Analytics/Dashboard
```

---

## Authentication & Authorization Wireframe

### 1. User Registration Flow

**Endpoint:** `POST /api/v1/auth/register`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePass123",
  "phone": "+1234567890",
  "countryCode": "+1"
}
```

**Process Flow:**
```
1. Validate input (Joi schema)
2. Sanitize inputs (XSS prevention)
3. Check email uniqueness → return 409 Conflict if exists
4. Hash password (bcrypt, 10 rounds)
5. Create User document with role: "user"
6. Generate verification email token
7. Queue email service (async)
8. Return success (201) with user ID (password excluded)
9. ON FAILURE → return error with cause
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Verify your email.",
  "data": {
    "userId": "60d5ec49c1234567890abc12",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**Error Scenarios:**
- Email already registered → 409 Conflict
- Invalid email format → 400 Bad Request
- Weak password → 400 Bad Request
- Email service failure → 500 Internal Server Error (but user is created)

**Post-Registration Actions:**
- Send verification email with token (expires in 24h)
- Cache verification token in Redis (key: `verify_token:{token}:{userId}`)

---

### 2. Email Verification Flow

**Endpoint:** `POST /api/v1/auth/verify-email`

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Process Flow:**
```
1. Extract token from request
2. Verify token signature (JWT)
3. Decode and extract userId
4. Check token expiration
5. Find user by userId
6. Update user.isEmailVerified = true
7. Delete token from cache
8. Return success (200)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now login."
}
```

**Error Scenarios:**
- Token invalid/expired → 401 Unauthorized
- User not found → 404 Not Found
- Email already verified → 409 Conflict

---

### 3. Login Flow

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securePass123"
}
```

**Process Flow:**
```
1. Validate input (email + password required)
2. Find user by email (excludes soft-deleted)
3. Check if user exists → return 404 if not
4. Compare password hash (bcrypt)
5. ON MISMATCH → return 401 Unauthorized
6. Check if email is verified
7. Check if user is active (not blocked)
8. Generate JWT access token (expires: 1d)
9. Generate JWT refresh token (expires: 7d)
10. Store refresh token in Redis (key: `refresh_token:{userId}`)
11. Queue login alert email (async)
12. Return tokens + user data (200)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "userId": "60d5ec49c1234567890abc12",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

**Error Scenarios:**
- Email not verified → 403 Forbidden
- User blocked → 403 Forbidden
- Invalid credentials → 401 Unauthorized
- Rate limit exceeded → 429 Too Many Requests

---

### 4. Refresh Token Flow

**Endpoint:** `POST /api/v1/auth/refresh-token`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Process Flow:**
```
1. Verify refresh token signature (JWT)
2. Decode and extract userId
3. Check if token exists in Redis
4. ON MISMATCH → return 401 (token revoked/blacklisted)
5. Generate new access token
6. OPTIONAL: rotate refresh token (generate + store new, invalidate old)
7. Return new tokens (200)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 5. Password Reset Flow

**Step A: Forgot Password**

**Endpoint:** `POST /api/v1/auth/forgot-password`

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Process Flow:**
```
1. Find user by email
2. ON NOT FOUND → return 404 (for security, can also return 200)
3. Generate reset token (JWT, expires: 30min)
4. Store reset token hash in DB: user.resetToken + user.resetTokenExpires
5. Queue password reset email with link (async)
6. Return success (200)
```

**Step B: Reset Password**

**Endpoint:** `POST /api/v1/auth/reset-password`

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "newPassword": "newSecurePass456"
}
```

**Process Flow:**
```
1. Verify token signature
2. Find user where resetToken matches
3. Check if token is expired
4. Hash new password
5. Update user.password
6. Clear resetToken + resetTokenExpires
7. Invalidate all refresh tokens (revoke all sessions)
8. Return success (200)
```

---

### 6. Authorization (RBAC) Wireframe

**Roles:**
- `admin` → Full access to admin APIs
- `user` (default) → Customer access
- `seller` (future) → Seller access

**Middleware: `authorizeAdmin`**
```
1. Extract token from Authorization header
2. Verify token (JWT)
3. Extract role from decoded token
4. ON role !== 'admin' → return 403 Forbidden
5. Attach user to req.user
6. Call next()
```

**Middleware: `authorize([roles])`**
```
1. Extract token
2. Verify token
3. Check if user.role is in allowed roles
4. ON FAIL → 403 Forbidden
5. Call next()
```

**Permission Matrix:**
```
| Resource | User | Admin | Seller |
|----------|------|-------|--------|
| View Products | ✓ | ✓ | ✓ |
| Create Product | ✗ | ✓ | ✓ |
| Approve Product | ✗ | ✓ | ✗ |
| Delete User | ✗ | ✓ | ✗ |
| View Orders | ✓ (own) | ✓ (all) | ✓ (own) |
| Manage Users | ✗ | ✓ | ✗ |
```

---

## User & Profile Management Wireframe

### 1. Get User Profile

**Endpoint:** `GET /api/v1/users/profile`

**Auth:** Required (Bearer token)

**Process Flow:**
```
1. Extract userId from token
2. Find user by ID (exclude password)
3. Return user object (200)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "60d5ec49c1234567890abc12",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "countryCode": "+1",
    "role": "user",
    "addresses": [],
    "isActive": true,
    "createdAt": "2026-01-22T10:30:00Z",
    "updatedAt": "2026-01-22T10:30:00Z"
  }
}
```

---

### 2. Update User Profile

**Endpoint:** `PUT /api/v1/users/profile`

**Auth:** Required

**Request:**
```json
{
  "name": "Jane Doe",
  "phone": "+9876543210"
}
```

**Process Flow:**
```
1. Validate input
2. Update user fields (exclude email, role)
3. Set updatedAt = now()
4. Return updated user (200)
```

---

### 3. Address Management

**Endpoint A: Add Address**
`POST /api/v1/users/addresses`

**Request:**
```json
{
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "country": "USA",
  "isDefault": true
}
```

**Process Flow:**
```
1. Validate address fields
2. If isDefault = true, unset other addresses' isDefault
3. Append address to user.addresses array
4. Return addresses array (201)
```

**Endpoint B: Update Address**
`PUT /api/v1/users/addresses/:addressId`

**Endpoint C: Delete Address**
`DELETE /api/v1/users/addresses/:addressId`

**Process Flow:**
```
1. Find address in user.addresses array
2. Remove or update
3. Return updated addresses (200)
```

---

## Product & Catalog Wireframe

### 1. Product Data Model

**Fields (Herbal-Specific):**
```
Product {
  _id: ObjectId
  name: String (required, unique)
  description: String
  sku: String (unique)
  
  // Pricing
  price: Number (required, > 0)
  discount: Number (default: 0, 0-100%)
  discountedPrice: Number (computed: price * (1 - discount/100))
  
  // Inventory
  stock: Number (default: 0)
  inventoryStatus: Enum [in_stock, low_stock, out_of_stock]
  
  // Media
  images: [String] (Cloudinary URLs)
  thumbnail: String
  
  // Categorization
  categoryId: ObjectId (ref: Category)
  subCategoryId: ObjectId (ref: Category, optional)
  tags: [String]
  brand: String
  
  // Herbal Medicine Specifics
  herbalDetails: {
    dosage: String (e.g., "1-2 capsules daily")
    benefits: [String]
    warnings: [String]
    ingredients: [String]
    usageInstructions: String
    sideEffects: [String]
    contraindications: [String]
  }
  
  // Metadata
  rating: Number (0-5, avg of reviews)
  reviewCount: Number
  reviews: [ObjectId] (ref: Review)
  
  // Status
  isActive: Boolean (default: true)
  isApproved: Boolean (default: false, admin must approve)
  isDeleted: Boolean (soft delete)
  deletedAt: Date
  
  // Audit
  createdAt: Date
  updatedAt: Date
  createdBy: ObjectId (ref: User, seller/admin)
}
```

### 2. Create Product Flow (Admin/Seller)

**Endpoint:** `POST /api/v1/products` (Future)

**Auth:** Required (Role: admin or seller)

**Request:**
```json
{
  "name": "Turmeric Curcumin 500mg",
  "description": "High-potency turmeric extract",
  "sku": "TUM-500-100",
  "price": 29.99,
  "stock": 100,
  "categoryId": "60d5ec49c1234567890abc12",
  "images": ["url1", "url2"],
  "herbalDetails": {
    "dosage": "1-2 capsules daily",
    "benefits": ["Anti-inflammatory", "Antioxidant"],
    "warnings": ["Not for pregnant women"],
    "ingredients": ["Turmeric Extract", "Black Pepper"],
    "usageInstructions": "Take with food"
  }
}
```

**Process Flow:**
```
1. Authenticate user (must be admin or seller)
2. Validate input (Joi schema)
3. Sanitize inputs
4. Check SKU uniqueness
5. If seller: set isApproved = false (pending admin review)
6. If admin: set isApproved = true
7. Create Product document
8. Return product (201)
9. Queue notification: "New product submitted" (if seller)
```

### 3. Update Product Flow

**Endpoint:** `PUT /api/v1/products/:productId`

**Auth:** Required (Owner or admin)

**Process Flow:**
```
1. Check ownership (product.createdBy === userId OR user.role === admin)
2. ON FAIL → 403 Forbidden
3. Update fields (admin can update isApproved, others cannot)
4. Clear product cache (if cached)
5. Return updated product (200)
```

### 4. Get Product List

**Endpoint:** `GET /api/v1/products`

**Query Params:**
```
page=1&limit=20&sortBy=createdAt&order=desc
search=turmeric
categoryId=60d5ec49c1234567890abc12
minPrice=10&maxPrice=100
tags=herbal,natural
isApproved=true
```

**Process Flow:**
```
1. Build filter: { isDeleted: false, isApproved: true, ...categoryId, ...priceRange, ...tags }
2. Check cache (Redis key: `products:{filter_hash}:{page}:{limit}`)
3. ON CACHE HIT → return cached data (TTL: 1 hour)
4. Execute query: find(filter) → sort → skip → limit
5. Count total documents
6. Cache result
7. Return paginated data (200)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Products fetched",
  "data": [
    {
      "_id": "60d5ec49c1234567890abc12",
      "name": "Turmeric Curcumin",
      "price": 29.99,
      "discountedPrice": 26.99,
      "thumbnail": "url",
      "rating": 4.5,
      "reviewCount": 120
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 250
  }
}
```

### 5. Get Product by ID

**Endpoint:** `GET /api/v1/products/view/:productId`

**Process Flow:**
```
1. Check cache: `product:{productId}`
2. Find product by ID (must be isApproved = true, isDeleted = false)
3. Populate category details
4. Populate top reviews (limit: 5)
5. Cache result (TTL: 2 hours)
6. Return product (200)
```

---

## Media Management Wireframe

### 1. Media Upload Strategy

**Process:**
- All uploads go to Cloudinary (no local storage)
- Media metadata stored in DB
- Support: images (JPEG, PNG), videos (MP4, WebM)
- Auto-optimization & transformation by Cloudinary

### 2. Product Image Upload

**Endpoint:** `POST /api/v1/products/:productId/media` (Future)

**Auth:** Required (Owner or admin)

**Request:** Multipart form-data
```
file: <binary>
type: "image"
```

**Process Flow:**
```
1. Authenticate
2. Check file size (max: 10MB)
3. Validate MIME type
4. Upload to Cloudinary (folder: products/{productId}/)
5. ON SUCCESS:
   - Store Cloudinary URL + public_id in Product.images array
   - Return media metadata (201)
6. ON FAILURE:
   - Return error (500)
```

### 3. Media Delete

**Endpoint:** `DELETE /api/v1/products/:productId/media/:mediaId` (Future)

**Auth:** Required (Owner or admin)

**Process Flow:**
```
1. Authenticate
2. Find media in Product.images
3. Delete from Cloudinary (using public_id)
4. Remove from Product.images array
5. ON FAILURE → queue retry (async)
6. Return success (200)
```

### 4. Rollback on Product Delete

**On Product Soft Delete:**
```
1. Get all media public_ids from product.images
2. Queue async task: deleteMediaBatch(public_ids)
3. After all media deleted → soft delete product
```

---

## Cart Wireframe

### 1. Cart Data Model

**In-Memory (Redis/Session):**
```
Cart {
  cartId: String (unique per user/session)
  userId: ObjectId | null (null for guests)
  items: [
    {
      productId: ObjectId
      quantity: Number
      addedAt: Date
    }
  ]
  expiresAt: Date (TTL for guest carts: 7 days)
}
```

### 2. Add Item to Cart

**Endpoint:** `POST /api/v1/cart/items`

**Auth:** Optional (works for guest + authenticated)

**Request:**
```json
{
  "productId": "60d5ec49c1234567890abc12",
  "quantity": 2
}
```

**Process Flow:**
```
1. Validate productId + quantity
2. Find product (must be isActive = true, isApproved = true)
3. Check stock: product.stock >= quantity
   ON FAIL → return 400 Insufficient Stock
4. If authenticated:
   - Fetch cart from DB (Cart model for persistence)
5. If guest:
   - Use session/localStorage cart (client-side)
   - Or store in Redis temporarily
6. Find item in cart.items by productId
7. IF EXISTS: update quantity
8. ELSE: add new item
9. Save cart
10. Return cart (200)
```

### 3. Get Cart

**Endpoint:** `GET /api/v1/cart`

**Process Flow:**
```
1. If authenticated: fetch from DB/Redis
2. If guest: return from session (client-side managed)
3. Populate product details for each item
4. Calculate:
   - Subtotal: sum(product.discountedPrice * quantity)
   - Discount Total: sum((product.price - product.discountedPrice) * quantity)
   - Tax: subtotal * TAX_RATE
   - Total: subtotal + tax
5. Return cart with summary (200)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "productId": "60d5ec49c1234567890abc12",
        "name": "Turmeric",
        "price": 29.99,
        "discountedPrice": 26.99,
        "quantity": 2,
        "itemTotal": 53.98
      }
    ],
    "summary": {
      "subtotal": 53.98,
      "discountTotal": 4.00,
      "tax": 5.40,
      "total": 59.38
    }
  }
}
```

### 4. Update Cart Item Quantity

**Endpoint:** `PUT /api/v1/cart/items/:productId`

**Request:**
```json
{
  "quantity": 5
}
```

**Process Flow:**
```
1. Find item in cart
2. Validate new quantity
3. Check stock availability
4. Update quantity
5. Return updated cart (200)
```

### 5. Remove Item from Cart

**Endpoint:** `DELETE /api/v1/cart/items/:productId`

**Process Flow:**
```
1. Remove item from cart.items
2. Save cart
3. Return updated cart (200)
```

### 6. Checkout (Cart → Order)

Covered in Order Lifecycle section.

---

## Wishlist Wireframe

### 1. Wishlist Data Model

```
Wishlist {
  _id: ObjectId
  userId: ObjectId (ref: User)
  items: [ObjectId] (ref: Product)
  createdAt: Date
  updatedAt: Date
}
```

### 2. Add to Wishlist

**Endpoint:** `POST /api/v1/wishlist/items`

**Auth:** Required

**Request:**
```json
{
  "productId": "60d5ec49c1234567890abc12"
}
```

**Process Flow:**
```
1. Find user's wishlist (or create if not exists)
2. Check if productId already in wishlist
3. IF YES → return 409 Conflict
4. Add productId to wishlist.items
5. Return success (201)
```

### 3. Remove from Wishlist

**Endpoint:** `DELETE /api/v1/wishlist/items/:productId`

**Process Flow:**
```
1. Find user's wishlist
2. Remove productId from wishlist.items
3. Return success (200)
```

### 4. Get Wishlist

**Endpoint:** `GET /api/v1/wishlist`

**Process Flow:**
```
1. Find user's wishlist
2. Populate product details
3. Return wishlist items (200)
```

### 5. Move Wishlist Item to Cart

**Endpoint:** `POST /api/v1/wishlist/items/:productId/move-to-cart`

**Process Flow:**
```
1. Verify product exists in wishlist
2. Add to cart (same logic as Add to Cart)
3. Remove from wishlist
4. Return success (200)
```

---

## Inventory & Stock Wireframe

### 1. Inventory Tracking

**States:**
- `in_stock`: stock > 20
- `low_stock`: stock between 1-20
- `out_of_stock`: stock = 0

**Automatic Status Update:**
- When product.stock is updated, recalculate inventoryStatus

### 2. Stock Reservation on Order

**When Order is Created:**
```
1. For each item in order.items:
   - Find product
   - Check if product.stock >= quantity
   - IF NO → fail order creation (409 Conflict)
   - RESERVE: product.reservedStock += quantity
2. Store reservation reference in Order.stockReservation = [{ productId, quantity, reservedAt }]
```

### 3. Stock Deduction on Payment Success

**When Payment is Confirmed:**
```
1. Find order
2. For each reserved item:
   - Find product
   - product.stock -= quantity
   - product.reservedStock -= quantity
   - Update inventoryStatus
3. Return success
```

### 4. Stock Release on Order Failure/Cancellation

**When Order is Cancelled:**
```
1. For each reserved item:
   - product.reservedStock -= quantity
   - IF order is refunded: product.stock += quantity (full refund)
2. Update product inventoryStatus
```

### 5. Low Stock Alert (Future)

**Daily Cron Job:**
```
1. Find products where stock <= 10
2. Queue notification: "Low stock alert" to admin
```

---

## Order Lifecycle Wireframe

### 1. Order Data Model

```
Order {
  _id: ObjectId
  userId: ObjectId (ref: User)
  orderNumber: String (unique, auto-generated)
  items: [
    {
      productId: ObjectId
      quantity: Number
      priceAtPurchase: Number
    }
  ]
  
  // Calculations
  subtotal: Number
  tax: Number
  shippingCost: Number
  discountAmount: Number
  couponCode: String (optional)
  totalAmount: Number
  
  // Delivery
  shippingAddress: {
    street, city, state, zip, country
  }
  trackingNumber: String (assigned after shipping)
  
  // Payment
  paymentId: ObjectId (ref: Payment)
  paymentStatus: String (pending, authorized, captured, failed, refunded)
  
  // Status
  status: Enum [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
  statusHistory: [
    {
      status: String
      changedAt: Date
      changedBy: ObjectId (user or system)
      notes: String
    }
  ]
  
  // Stock
  stockReservation: [{ productId, quantity, reservedAt }]
  
  // Audit
  createdAt: Date
  updatedAt: Date
  isDeleted: Boolean
}
```

### 2. Order Creation Flow

**Endpoint:** `POST /api/v1/orders` (Future)

**Auth:** Required

**Request:**
```json
{
  "cartItems": [
    { "productId": "...", "quantity": 2 }
  ],
  "shippingAddressId": "60d5ec49c1234567890abc12",
  "couponCode": "SAVE10",
  "paymentMethodId": "..." // future: saved payment methods
}
```

**Process Flow:**
```
1. Authenticate user
2. Validate cart items:
   - For each item: find product, check isActive, isApproved
   - Check stock availability
3. Validate shipping address:
   - If null, use user's default address
4. Calculate order total:
   - subtotal = sum(product.discountedPrice * quantity)
   - Apply coupon (if valid): discountAmount = calculateDiscount(coupon, subtotal)
   - tax = (subtotal - discountAmount) * TAX_RATE
   - shippingCost = calculateShipping(address, weight)
   - totalAmount = subtotal - discountAmount + tax + shippingCost
5. Reserve stock:
   - For each item: product.reservedStock += quantity
6. Create Order document:
   - status = "pending"
   - paymentStatus = "pending"
   - statusHistory = [{ status: "pending", changedAt: now() }]
7. Create Payment record (see Payments section)
8. Trigger payment flow
9. Return order (201)
```

### 3. Order Status Transitions

**Valid Transitions:**
```
pending → confirmed (payment successful)
confirmed → processing (admin action)
processing → shipped (admin action + trackingNumber)
shipped → delivered (webhook from shipping provider OR time-based)
confirmed → cancelled (user/admin action)
shipped → cancelled (admin action only, may require refund)
{any} → refunded (admin action)
```

### 4. Update Order Status

**Endpoint:** `PUT /api/v1/orders/:orderId/status` (Future)

**Auth:** Required (Admin only)

**Request:**
```json
{
  "status": "shipped",
  "trackingNumber": "1Z999AA1234567890",
  "notes": "Dispatched from warehouse"
}
```

**Process Flow:**
```
1. Authenticate admin
2. Validate status transition
3. IF status === "shipped":
   - Validate trackingNumber
   - Queue shipping notification (async)
4. Update order.status
5. Add entry to statusHistory
6. Clear order cache
7. Return updated order (200)
```

### 5. Cancel Order

**Endpoint:** `POST /api/v1/orders/:orderId/cancel`

**Auth:** Required (Owner or admin)

**Conditions:**
- Order status must be: pending, confirmed, or processing
- Cannot cancel if shipped/delivered

**Process Flow:**
```
1. Authenticate user (owner or admin)
2. Find order
3. Check if cancellable
4. Release reserved stock
5. IF payment captured: initiate refund (see Payments section)
6. Update status = "cancelled"
7. Add statusHistory entry
8. Queue cancellation email (async)
9. Return success (200)
```

### 6. Get Order by ID

**Endpoint:** `GET /api/v1/orders/:orderId`

**Auth:** Required (Owner or admin)

**Process Flow:**
```
1. Authenticate
2. Check authorization (owner or admin)
3. Find order (include payment details, product names)
4. Return order (200)
```

### 7. Get User Orders

**Endpoint:** `GET /api/v1/orders`

**Query Params:**
```
page=1&limit=10&status=pending&sortBy=createdAt
```

**Process Flow:**
```
1. Authenticate
2. If admin: fetch all orders (filter by status if provided)
3. If user: fetch orders where userId === authenticated userId
4. Apply pagination + sorting
5. Return orders (200)
```

---

## Payments Wireframe

### 1. Payment Data Model

```
Payment {
  _id: ObjectId
  orderId: ObjectId (ref: Order)
  userId: ObjectId (ref: User)
  
  // Payment Details
  amount: Number
  currency: String (USD, default)
  status: Enum [pending, authorized, captured, failed, refunded]
  gateway: String (stripe, razorpay, etc.)
  
  // Transaction References
  gatewayTransactionId: String (from payment gateway)
  gatewayPaymentId: String
  reference: String
  
  // Metadata
  method: String (card, bank_transfer, etc.)
  metadata: Object (custom data)
  
  // Webhook
  webhookVerified: Boolean (default: false)
  webhookData: Object (raw webhook response)
  
  // Audit
  createdAt: Date
  capturedAt: Date
  failureReason: String (on failure)
  failureCode: String
}
```

### 2. Initiate Payment

**Part of Order Creation Flow**

**Endpoint:** `POST /api/v1/payments/initiate`

**Request:**
```json
{
  "orderId": "60d5ec49c1234567890abc12",
  "amount": 59.38,
  "paymentMethod": "card"
}
```

**Process Flow:**
```
1. Authenticate user
2. Find order (verify ownership)
3. Create Payment record:
   - status = "pending"
   - amount = order.totalAmount
4. Call payment gateway API (e.g., Stripe):
   - Create payment intent or charge
   - Pass orderId as reference
5. Return gateway response (200):
   - clientSecret (for client-side processing)
   - OR redirect URL (for hosted payment page)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "paymentId": "60d5ec49c1234567890abc12",
    "clientSecret": "pi_123_secret_xyz",
    "amount": 5938,
    "currency": "usd"
  }
}
```

### 3. Payment Confirmation (Client-Side)

After client-side payment processing:

**Endpoint:** `POST /api/v1/payments/:paymentId/confirm`

**Request:**
```json
{
  "paymentMethodId": "pm_123xyz"
}
```

**Process Flow:**
```
1. Verify payment with gateway
2. Update Payment.status = "captured"
3. Update Payment.capturedAt = now()
4. Update associated Order:
   - order.paymentStatus = "captured"
   - order.status = "confirmed"
5. Deduct stock (see Inventory section)
6. Clear order cache
7. Queue order confirmation email (async)
8. Return success (200)
```

### 4. Webhook Handler (Payment Gateway)

**Endpoint:** `POST /api/v1/webhooks/payment`

**Webhook Events:** `payment.succeeded`, `payment.failed`, `charge.refunded`

**Process Flow:**
```
1. Verify webhook signature (gateway-specific)
2. Extract gatewayTransactionId
3. Find Payment by gatewayTransactionId
4. ON NOT FOUND → log error + return 404
5. Switch on event type:
   - payment.succeeded:
     a. Update Payment.status = "captured"
     b. Deduct stock
     c. Update Order.status = "confirmed"
     d. Queue notification
   - payment.failed:
     a. Update Payment.status = "failed"
     b. Update Payment.failureReason
     c. Release stock reservation
     d. Update Order.status = "pending" (allow retry)
     e. Queue notification
   - charge.refunded:
     a. Update Payment.status = "refunded"
     b. Create Refund record
     c. Add stock back
     d. Update Order.status = "refunded"
6. Return success (200)
```

### 5. Refund Initiation

**Endpoint:** `POST /api/v1/orders/:orderId/refund` (Future)

**Auth:** Required (Admin only)

**Request:**
```json
{
  "reason": "Customer requested",
  "amount": 59.38
}
```

**Process Flow:**
```
1. Authenticate admin
2. Find order + payment
3. Validate refund eligibility:
   - Payment must be captured
   - Order must not already be refunded
4. Call payment gateway refund API
5. Create Refund record
6. ON SUCCESS:
   - Update Payment.status = "refunded"
   - Update Order.status = "refunded"
   - Release stock (add back to inventory)
   - Queue refund email (async)
7. ON FAILURE:
   - Log error
   - Queue admin alert
   - Return error (500)
```

### 6. Payment Retry on Failure

**When Payment Fails:**
```
1. Create Payment record with status = "failed"
2. Queue retry task (async):
   - Wait 5 minutes
   - Attempt automatic retry (e.g., tokenized card)
   - If success: process as normal
   - If fail again: mark as manual retry needed
3. Queue notification to customer:
   - Payment failed
   - Link to retry payment
```

---

## Coupons & Discounts Wireframe

### 1. Coupon Data Model

```
Coupon {
  _id: ObjectId
  code: String (unique, uppercase)
  discountType: Enum [percentage, fixed]
  discountValue: Number
  
  // Usage Limits
  maxUsageCount: Number | null (null = unlimited)
  currentUsageCount: Number (default: 0)
  maxUsagePerUser: Number (default: 1)
  
  // Validity
  validFrom: Date
  validUntil: Date
  isActive: Boolean
  
  // Conditions
  minOrderAmount: Number (minimum cart value to apply)
  applicableCategories: [ObjectId] (if empty, apply to all)
  applicableProducts: [ObjectId] (if empty, apply to all)
  excludedProducts: [ObjectId]
  
  // Audit
  createdAt: Date
  createdBy: ObjectId (ref: User, admin)
  description: String
}
```

### 2. Apply Coupon

**Endpoint:** `POST /api/v1/coupons/apply`

**Auth:** Required

**Request:**
```json
{
  "code": "SAVE10",
  "cartSubtotal": 100
}
```

**Process Flow:**
```
1. Find coupon by code (case-insensitive)
2. Validate coupon:
   - isActive = true
   - validFrom <= now() <= validUntil
   - currentUsageCount < maxUsageCount
   - User's usage count < maxUsagePerUser
   - cartSubtotal >= minOrderAmount
3. Check applicable categories/products:
   - If applicableCategories.length > 0:
     * At least one cart item must match
   - If applicableProducts.length > 0:
     * At least one cart item must match
   - Exclude items in excludedProducts
4. Calculate discount:
   - IF discountType = "percentage":
     * discount = cartSubtotal * (discountValue / 100)
   - IF discountType = "fixed":
     * discount = min(discountValue, cartSubtotal)
5. Return discount amount (200)
6. ON VALIDATION FAIL: return 400 Bad Request with reason
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "couponCode": "SAVE10",
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 10.00
  }
}
```

### 3. Apply Coupon to Order

**During Order Creation (Process Step):**
```
1. Validate coupon (as above)
2. Add coupon code to Order.couponCode
3. Increment Coupon.currentUsageCount
4. Record coupon usage in CouponUsage document (for audit)
5. Calculate order with discount applied
```

### 4. Validate Coupon Eligibility

**Endpoint:** `GET /api/v1/coupons/:code/validate`

**Request:**
```
?cartSubtotal=100&cartItems=[...]
```

**Response (200):**
```json
{
  "isValid": true,
  "discount": 10,
  "reason": null
}
```

---

## Reviews & Ratings Wireframe

### 1. Review Data Model

```
Review {
  _id: ObjectId
  productId: ObjectId (ref: Product)
  userId: ObjectId (ref: User)
  orderId: ObjectId (ref: Order, for verification)
  
  rating: Number (1-5, required)
  title: String
  comment: String
  
  // Media
  media: [String] (Cloudinary URLs, optional)
  
  // Status
  status: Enum [pending, approved, rejected]
  rejectionReason: String
  
  // Moderation
  isVerified: Boolean (user purchased product)
  helpfulCount: Number (default: 0)
  
  // Audit
  createdAt: Date
  updatedAt: Date
  isDeleted: Boolean
}
```

### 2. Submit Review

**Endpoint:** `POST /api/v1/reviews`

**Auth:** Required

**Request:**
```json
{
  "productId": "60d5ec49c1234567890abc12",
  "orderId": "60d5ec49c1234567890abc13",
  "rating": 4,
  "title": "Great quality product",
  "comment": "Effective and well-packaged",
  "media": ["url1", "url2"]
}
```

**Process Flow:**
```
1. Authenticate user
2. Verify user purchased product:
   - Find order where orderId === request.orderId
   - Check order.userId === authenticated userId
   - Check if order.items contains productId
   - Check order.status = "delivered"
3. Check if review already exists:
   - ON EXISTS → return 409 Conflict
4. Create Review document:
   - status = "pending" (requires admin approval)
   - isVerified = true
5. Queue moderation notification (async)
6. Return review (201)
```

### 3. Approve/Reject Review (Admin)

**Endpoint:** `PUT /api/v1/admin/reviews/:reviewId`

**Auth:** Required (Admin only)

**Request:**
```json
{
  "action": "approve"
}
```

**Process Flow:**
```
1. Authenticate admin
2. If action = "approve":
   - Review.status = "approved"
   - Update Product.rating (aggregate all approved reviews)
   - Clear product cache
3. If action = "reject":
   - Review.status = "rejected"
   - Review.rejectionReason = request.reason
4. Queue notification to reviewer (async)
5. Return success (200)
```

### 4. Calculate Product Rating

**Aggregation:**
```
1. Find all reviews where productId === target AND status === "approved"
2. Calculate avg(rating)
3. Update Product.rating
4. Store count in Product.reviewCount
5. Trigger on:
   - Review approved
   - Review deleted
```

### 5. Get Product Reviews

**Endpoint:** `GET /api/v1/products/:productId/reviews`

**Query Params:**
```
page=1&limit=10&rating=4&sortBy=helpfulCount
```

**Process Flow:**
```
1. Build filter: { productId, status: "approved", isDeleted: false }
2. Apply rating filter (if provided)
3. Sort (default: most helpful)
4. Paginate
5. Return reviews (200)
```

---

## Notifications Wireframe

### 1. Notification Data Model

```
Notification {
  _id: ObjectId
  userId: ObjectId (ref: User) | null
  type: Enum [order_placed, payment_confirmed, order_shipped, order_delivered, review_approved, refund_initiated, low_stock_alert]
  
  // Content
  title: String
  message: String
  metadata: Object (context-specific data)
  
  // Channels
  channels: {
    email: { sent: Boolean, sentAt: Date }
    sms: { sent: Boolean, sentAt: Date }
    inApp: { sent: Boolean, sentAt: Date, readAt: Date }
  }
  
  // Status
  isRead: Boolean (for in-app)
  status: Enum [pending, sent, failed]
  
  // Audit
  createdAt: Date
  expiresAt: Date (TTL: 30 days)
}
```

### 2. Notification Triggers

**Event-Driven:**
```
Order Placed:
  → Email: Order confirmation
  → In-App: Order placed notification

Payment Confirmed:
  → Email: Payment receipt
  → In-App: Payment confirmed

Order Shipped:
  → Email: Shipment notification + tracking number
  → SMS: Tracking number (if phone available)
  → In-App: Shipment notification

Order Delivered:
  → Email: Delivery confirmation
  → In-App: Delivery notification + review prompt

Review Approved:
  → Email: Review published notification (to reviewer)
  → In-App: Approval notification

Refund Initiated:
  → Email: Refund confirmation
  → In-App: Refund notification

Low Stock Alert (Daily Cron):
  → Email: Low stock alert (to admin)
```

### 3. Queue Notification

**Async Processing (node-cron / BullMQ):**

```
1. Create Notification record
2. Queue async task:
   - For each channel:
     a. Email: Use Nodemailer, send + update channels.email.sent
     b. SMS: Use Twilio, send + update channels.sms.sent (if phone available)
     c. In-App: Mark as sent, accessible via API
3. ON SEND SUCCESS: update channels[channel].sentAt
4. ON SEND FAILURE: retry with exponential backoff (3 retries)
5. After retries: mark as failed + log error
```

### 4. Get Notifications (User)

**Endpoint:** `GET /api/v1/notifications`

**Query Params:**
```
isRead=false&page=1&limit=20
```

**Process Flow:**
```
1. Authenticate user
2. Find notifications where userId === authenticated userId
3. Filter by isRead (if provided)
4. Sort by createdAt (descending)
5. Paginate
6. Return notifications (200)
```

### 5. Mark Notification as Read

**Endpoint:** `PUT /api/v1/notifications/:notificationId/read`

**Process Flow:**
```
1. Authenticate user
2. Find notification
3. Set isRead = true
4. Set channels.inApp.readAt = now()
5. Return success (200)
```

---

## Admin Panel Backend Wireframe

### 1. Dashboard Analytics

**Endpoint:** `GET /api/v1/admin/dashboard`

**Auth:** Required (Admin only)

**Process Flow:**
```
1. Authenticate admin
2. Fetch metrics (from cache if available, TTL: 1 hour):
   a. Total users (active, last 30 days)
   b. Total orders (today, this month, all-time)
   c. Revenue (today, this month, all-time)
   d. Average order value
   e. Top 5 products by revenue
   f. Top 5 products by orders
   g. Recent orders (last 10)
   h. Pending reviews count
   i. Low stock products count
3. Cache results
4. Return metrics (200)
```

### 2. User Management

**Endpoints:**
- `GET /api/v1/admin/users` - List all users (paginated, filterable)
- `GET /api/v1/admin/users/:userId` - User details
- `PUT /api/v1/admin/users/:userId` - Update user (role, status)
- `DELETE /api/v1/admin/users/:userId` - Soft delete user

**Features:**
- Filter by role, status, registration date
- Search by email/name
- Block/unblock user
- Soft delete (preserve data)

### 3. Product Moderation

**Endpoints:**
- `GET /api/v1/admin/products?isApproved=false` - Pending products
- `PUT /api/v1/admin/products/:productId/approve` - Approve product
- `PUT /api/v1/admin/products/:productId/reject` - Reject product
- `DELETE /api/v1/admin/products/:productId` - Delete product

**Process Flow (Approve):**
```
1. Find product
2. Update isApproved = true
3. Clear product cache
4. Queue notification to seller (async)
5. Return success (200)
```

### 4. Order Management

**Endpoints:**
- `GET /api/v1/admin/orders` - List all orders
- `PUT /api/v1/admin/orders/:orderId/status` - Update status (see Order Lifecycle)
- `POST /api/v1/admin/orders/:orderId/refund` - Initiate refund (see Payments)

### 5. Inventory Control

**Endpoints:**
- `GET /api/v1/admin/inventory?status=low_stock` - Filter by stock status
- `PUT /api/v1/admin/inventory/:productId` - Update stock manually

**Process Flow (Update Stock):**
```
1. Authenticate admin
2. Validate new stock value
3. Calculate difference
4. If stock released: queue restock notification
5. Update product.stock
6. Recalculate inventoryStatus
7. Clear product cache
8. Return success (200)
```

---

## Logging & Audit Wireframe

### 1. Audit Log Data Model

```
AuditLog {
  _id: ObjectId
  userId: ObjectId (ref: User, who performed action)
  action: String (created, updated, deleted, approved, etc.)
  entityType: String (User, Product, Order, Payment, etc.)
  entityId: ObjectId
  changes: {
    before: Object
    after: Object
  }
  ipAddress: String
  userAgent: String
  timestamp: Date
  status: Enum [success, failure]
  failureReason: String (if failure)
}
```

### 2. Sensitive Actions to Log

```
- User registration
- User login (success + failure)
- Password change
- User role upgrade
- User block/unblock
- Product creation/approval/deletion
- Order status change
- Payment processing
- Refund initiation
- Admin user management actions
- Coupon creation/modification
- Review approval/rejection
```

### 3. Audit Logging Middleware

**Execution:**
```
After every sensitive action:
1. Extract user info from req.user
2. Extract entity changes (before/after)
3. Create AuditLog record
4. Store in MongoDB
5. Index by userId + entityType + timestamp
```

### 4. Query Audit Logs (Admin)

**Endpoint:** `GET /api/v1/admin/audit-logs`

**Query Params:**
```
userId=...&action=updated&entityType=Product&page=1&limit=50
```

**Process Flow:**
```
1. Authenticate admin
2. Build filter from query params
3. Paginate + sort by timestamp (desc)
4. Return logs (200)
```

---

## Cross-Cutting Concerns

### 1. Middleware Execution Chain

**Order (per request):**
```
1. resolveIpMiddleware → Extract client IP
2. sanitizeRequestMiddleware → Sanitize inputs (XSS prevention)
3. express.json() → Parse JSON body
4. applySecurityMiddlewares → Helmet, CORS, xss-clean
5. rateLimitMiddleware → Rate limiting (env-driven)
6. ipBlacklistMiddleware → Check IP blacklist
7. requestLogger → Log request details
8. authenticate → Verify JWT token (if required by route)
9. authorizeAdmin → Check admin role (if required)
10. requestValidationMiddleware → Validate request body/query
11. Route handler (controller)
12. errorHandler → Centralized error handling
```

### 2. Error Propagation

**Pattern:**
```
Controller:
  try {
    const result = await service.action();
    return responseHelper.success(res, result);
  } catch (err) {
    next(err);  // Pass to error handler
  }

Global Error Handler:
  1. Log error (Winston)
  2. Determine HTTP status (from err.statusCode or default 500)
  3. Return standardized error response
  4. IN PRODUCTION: exclude stack trace
  5. IN DEVELOPMENT: include stack trace
```

### 3. Retry & Fallback Strategies

**Payment Processing:**
```
Retry Policy:
  - Initial attempt: immediate
  - Retry 1: 5 minutes later
  - Retry 2: 30 minutes later
  - Retry 3: 2 hours later
  - After 3 failures: mark as manual intervention needed
```

**Email Sending:**
```
Retry Policy:
  - Attempt 1: immediate
  - Attempt 2: 1 minute later
  - Attempt 3: 10 minutes later
  - After 3 failures: log + alert admin
```

**Webhook Delivery:**
```
Retry Policy:
  - Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s
  - Max 6 retries (total ~60 seconds)
  - After max retries: queue for manual review
```

### 4. Transaction Management

**When to Use:**
```
Order Creation:
  1. Validate all inputs
  2. Start transaction
  3. Create Order
  4. Reserve stock
  5. Create Payment record
  6. ON SUCCESS: commit + return
  7. ON FAILURE: rollback + return error
```

**Implementation (Future with TypeORM):**
```
const session = await mongoose.startSession();
session.startTransaction();
try {
  // Operations
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
}
```

### 5. Cache Strategy

**TTL Mapping:**
```
Product list: 1 hour
Product detail: 2 hours
Category list: 4 hours
User profile: 30 minutes
Cart: session-based (Redis)
```

**Cache Invalidation:**
```
On product update:
  - Clear: products:{hash}, product:{productId}
On category update:
  - Clear: categories:{hash}, category:{categoryId}
On order creation:
  - Clear: user-carts:{userId}
On review approval:
  - Clear: product:{productId}
```

---

## Non-Functional Requirements

### 1. Scalability

**Horizontal Scaling:**
- Stateless API servers (no server-side sessions)
- External state management (Redis)
- Database read replicas for analytics
- CDN for media delivery (Cloudinary)

**Vertical Scaling:**
- Connection pooling for DB
- Query optimization (indexing, lean queries)
- Pagination enforcement (never fetch all records)
- Lazy loading for nested data

### 2. High Availability

**Resilience:**
- Multiple app instances behind load balancer
- Database replication (MongoDB replica set)
- Redis cluster for cache
- Health check endpoints
- Graceful shutdown handling

**Failure Handling:**
- Circuit breaker for external APIs (Stripe, Cloudinary)
- Timeout configurations (default: 30s, max: 60s)
- Fallback endpoints where applicable

### 3. Performance Targets

```
API Response Times:
- List endpoint: <500ms
- Detail endpoint: <300ms
- Checkout: <1s
- Admin dashboards: <2s

Throughput:
- Minimum: 100 requests/second
- Target: 500 requests/second
- Peak: 1000 requests/second

Database:
- Query execution: <100ms (99th percentile)
- Indexes on: userId, productId, status, createdAt
```

### 4. Security

**Data Protection:**
- All passwords hashed (bcrypt, 10 rounds)
- JWT tokens signed (RS256 recommended for production)
- HTTPS enforced (via Nginx/reverse proxy)
- CORS configured (whitelist domains)
- Rate limiting (20 req/min for auth, 200 req/min for general)

**Sensitive Data:**
- No sensitive data in logs
- Secrets in environment variables (not in code)
- Payment data not stored (reference gateway IDs only)
- User passwords never logged

### 5. Observability

**Logging:**
- Request/response logging (Winston)
- Error logging with stack traces
- Audit logging for sensitive actions
- Performance metrics (response time, DB queries)

**Monitoring (Future):**
- Application Performance Monitoring (APM)
- Error tracking (Sentry)
- Log aggregation (ELK stack)
- Metrics collection (Prometheus)
- Uptime monitoring

---

## Validation Checklist

- [x] All modules have clear API endpoints
- [x] No circular dependencies between modules
- [x] All business rules are enforceable
- [x] All workflows include error scenarios
- [x] All sensitive actions are audited
- [x] All async operations are queued
- [x] Stock management is consistent
- [x] Payment workflow is secure
- [x] User data is validated before storage
- [x] Soft delete is applied consistently
- [x] Cache invalidation logic is clear
- [x] Rate limiting is configured
- [x] Authentication is required for protected endpoints
- [x] RBAC is defined per resource
- [x] No hardcoded business logic
- [x] All configurations are env-driven
- [x] All external API calls have retry logic
- [x] All responses follow standard format
- [x] All error codes are documented
- [x] All data is normalized in database

---

## Assumptions & Constraints

### Assumptions
1. MongoDB is always available (with connection pooling)
2. Cloudinary is the single source of truth for media
3. Email delivery is not guaranteed (best-effort)
4. Payment gateway handles PCI compliance
5. Single timezone for all timestamps (UTC)
6. Tax calculation is simplified (flat rate per region)
7. Shipping cost is calculated externally (future integration)

### Constraints
1. Single currency per deployment (USD, default)
2. No multi-seller marketplace (single seller/admin model)
3. No subscription/recurring payments
4. No saved payment methods (future enhancement)
5. No real-time inventory sync across instances (eventual consistency)
6. No split payments across multiple cards
7. No guest checkout (requires registration)

### Future Enhancements
1. Multi-seller marketplace with seller dashboard
2. Inventory real-time sync with distributed locks
3. Advanced filtering (AI-powered recommendations)
4. Real-time notifications (WebSockets)
5. Mobile app APIs with offline sync
6. Advanced analytics & BI dashboards
7. Subscription/recurring billing
8. Digital products & instant delivery
9. Video product demonstrations
10. Seller reviews & ratings

---

## Implementation Roadmap

### Phase 1: Core (Current)
- Auth & user management ✓
- Product catalog (read-only) ✓
- Cart (basic) - In Progress
- Orders (basic) - In Progress

### Phase 2: Commerce
- Complete order lifecycle
- Payment processing
- Stock management
- Notifications

### Phase 3: Features
- Reviews & ratings
- Wishlist
- Coupons & discounts
- Admin dashboard

### Phase 4: Scale
- Caching layer
- Background jobs
- Performance optimization
- Observability

---

**Document Version:** 1.0  
**Last Updated:** January 22, 2026  
**Next Review:** Upon feature completion
