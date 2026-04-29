# API End-to-End Test Report

Generated: 2026-04-21T05:41:44.907Z

## Jest Summary

- Test suites: 6 passed / 4 failed / 10 total
- Tests: 168 passed / 39 failed / 207 total
- Overall result: FAIL

## Endpoint Summary

- Implemented endpoints discovered: 109
- Passing endpoints: 7
- Partially passing endpoints: 0
- Failing endpoints: 0
- Untested endpoints: 102
- Test targets with no matching route: 37

## Failing Endpoints

- None
## Passing Endpoints

- POST /api/v1/auth/forgot-password (2/2 assertions passed)
- POST /api/v1/auth/login (5/5 assertions passed)
- POST /api/v1/auth/logout (2/2 assertions passed)
- POST /api/v1/auth/refresh-token (3/3 assertions passed)
- POST /api/v1/auth/register (6/6 assertions passed)
- POST /api/v1/auth/reset-password (3/3 assertions passed)
- POST /api/v1/auth/verify-email (2/2 assertions passed)

## Partially Passing Endpoints

- None

## Untested Implemented Endpoints

- DELETE /
- DELETE /:id
- DELETE /:id/cancel
- DELETE /api/v1/auth/user/:id
- DELETE /categories/:id
- DELETE /clear
- DELETE /delete/:id
- DELETE /invoices/:id
- DELETE /items/:productId
- DELETE /products/:id
- DELETE /remove/:productId
- DELETE /users/:id
- GET /
- GET /:id
- GET /:id/stats
- GET /:productId/reviews
- GET /admin/pending
- GET /admin/recent
- GET /admin/shipments
- GET /admin/shipments/:id
- GET /analytics
- GET /api/v1/auth/profile
- GET /api/v1/auth/user/:id
- GET /api/v1/auth/users
- GET /api/v1/auth/verify-email
- GET /api/v1/auth/verify-email/:token
- GET /api/v1/cart/admin/failed
- GET /api/v1/cart/history
- GET /dashboard
- GET /dashboard/revenue
- GET /dashboard/sales-report
- GET /dashboard/stats
- GET /dashboard/top-products
- GET /history/:productId
- GET /invoices
- GET /invoices/:id
- GET /invoices/:id/download
- GET /invoices/:id/view
- GET /invoices/orders/:orderId
- GET /logs
- GET /low-stock
- GET /my-orders
- GET /my-reviews
- GET /orders
- GET /orders/:orderId/tracking
- GET /product/:productId
- GET /products/pending
- GET /profile/:id
- GET /status/:status
- GET /summary
- GET /summary/:productId
- GET /track/:trackingNumber
- GET /unread-count
- GET /users
- GET /users/:id
- GET /view/:id
- POST /
- POST /:id/helpful
- POST /add
- POST /adjust-stock
- POST /admin/orders/:orderId/assign-shipment
- POST /admin/shipments/:id/cancel
- POST /admin/shipments/:id/refresh
- POST /admin/shipments/bulk-refresh
- POST /api/v1/auth/change-password
- POST /api/v1/auth/resend-verification-email
- POST /api/v1/auth/send-verification-email
- POST /api/v1/cart/initiate
- POST /api/v1/cart/retry/:id
- POST /api/v1/cart/verify
- POST /api/v1/cart/webhook/razorpay
- POST /api/v1/cart/webhook/stripe
- POST /categories
- POST /invoices/:id/cancel
- POST /invoices/:id/payment
- POST /invoices/orders/:orderId/generate
- POST /items
- POST /products
- POST /send
- POST /set-threshold
- POST /validate
- PUT /:id
- PUT /:id/approve
- PUT /:id/cancel
- PUT /:id/read
- PUT /:id/status
- PUT /admin/:id/approve
- PUT /admin/:id/reject
- PUT /admin/shipments/:id
- PUT /api/v1/auth/profile
- PUT /api/v1/auth/user/:id
- PUT /categories/:id
- PUT /invoices/:id/status
- PUT /items/:productId
- PUT /products/:id
- PUT /products/:id/approve
- PUT /read-all
- PUT /update
- PUT /update/:id
- PUT /users/:id
- PUT /users/:id/ban
- PUT /users/:id/unban

## Test Targets Without Matching Routes

- DELETE /api/v1/cart/clear (from tests\cart.test.js)
- DELETE /api/v1/cart/remove/:productId (from tests\cart.test.js)
- DELETE /api/v1/coupons/:id (from tests\coupons.test.js)
- DELETE /api/v1/reviews/:id (from tests\reviews.test.js)
- GET /api/v1/admin/analytics (from tests\admin.test.js)
- GET /api/v1/admin/dashboard (from tests\admin.test.js)
- GET /api/v1/admin/logs (from tests\admin.test.js)
- GET /api/v1/admin/orders (from tests\admin.test.js)
- GET /api/v1/admin/products/pending (from tests\admin.test.js)
- GET /api/v1/admin/users (from tests\admin.test.js)
- GET /api/v1/admin/users/:id (from tests\admin.test.js)
- GET /api/v1/cart (from tests\cart.test.js)
- GET /api/v1/categories (from tests\products.test.js)
- GET /api/v1/coupons (from tests\coupons.test.js)
- GET /api/v1/orders (from tests\orders.test.js)
- GET /api/v1/orders/:id (from tests\orders.test.js)
- GET /api/v1/products (from tests\products.test.js)
- GET /api/v1/products/:id (from tests\products.test.js)
- GET /api/v1/products/:id/reviews (from tests\reviews.test.js)
- GET /api/v1/reviews/:id (from tests\reviews.test.js)
- POST /api/v1/cart/add (from tests\cart.test.js)
- POST /api/v1/cart/apply-coupon (from tests\coupons.test.js)
- POST /api/v1/coupons (from tests\coupons.test.js)
- POST /api/v1/coupons/validate (from tests\coupons.test.js)
- POST /api/v1/orders (from tests\orders.test.js)
- POST /api/v1/payments/initiate (from tests\orders.test.js)
- POST /api/v1/payments/verify (from tests\orders.test.js)
- POST /api/v1/products (from tests\products.test.js)
- POST /api/v1/reviews (from tests\reviews.test.js)
- POST /api/v1/reviews/:id/helpful (from tests\reviews.test.js)
- PUT /api/v1/admin/products/:id/approve (from tests\admin.test.js)
- PUT /api/v1/cart/update (from tests\cart.test.js)
- PUT /api/v1/coupons/:id (from tests\coupons.test.js)
- PUT /api/v1/orders/:id/cancel (from tests\orders.test.js)
- PUT /api/v1/products/:id (from tests\products.test.js)
- PUT /api/v1/reviews/:id (from tests\reviews.test.js)
- PUT /api/v1/reviews/:id/approve (from tests\reviews.test.js)
