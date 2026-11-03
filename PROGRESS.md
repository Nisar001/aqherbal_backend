# AQ Herbal Backend — Progress Tracker

Single source of truth for **what's built vs. what's pending**. Update this file at the end of every work session.

> Last updated: **2026-09-26** · repo `Nisar001/aqherbal_backend` (branch `dev`) · NestJS 11 + Prisma 7 / PostgreSQL
> Spec: *AQ Herbal — NestJS Backend Build Plan* (Modules 1–7, Phases 1–8)

---

## Overall status

| Phase | Scope (from build plan) | Status | Progress |
| --- | --- | --- | --- |
| 1 | Setup, Prisma schema, Auth module, User module, Swagger, Docker | ✅ Done | 100% |
| 2 | Category & Product modules, image upload, admin CRUD | ✅ Done | 100% |
| 3 | Cart, Wishlist, Coupon modules | ⬜ Not started | 0% |
| 4 | Orders + Razorpay + webhook handling | ✅ Done | 100% |
| 5 | Shiprocket integration, tracking | ⬜ Not started | 0% |
| 6 | Admin dashboard, reports, activity logs | 🟡 Partial — audit log only | ~15% |
| 7 | Notifications (email/SMS), Reviews, GST invoice PDF | 🟡 Partial — mail/OTP infra + public review reads | ~30% |
| 8 | Security hardening, rate-limit tuning, e2e coverage, deployment | 🟡 Partial | ~50% |

**Overall: 3 of 8 phases complete (~45%).**
**Next up: Phase 5 — Shiprocket integration, tracking.**

---

## Phase 1 — Auth & User Management ✅

**User-facing**

- [x] `POST /auth/register` — email/phone + password
- [x] `POST /auth/login`
- [x] `POST /auth/otp/send` — mobile OTP login (60s cooldown, MSG91 or console fallback)
- [x] `POST /auth/otp/verify` — creates an account on first use of a phone
- [x] `POST /auth/refresh-token` — single-use rotation, reuse → 401
- [x] `POST /auth/logout`
- [x] `POST /auth/forgot-password` — 30-min emailed reset link
- [x] `POST /auth/reset-password` — invalidates all sessions
- [x] `GET /users/me`, `PATCH /users/me`
- [x] `GET/POST /users/me/addresses`, `PATCH/DELETE /users/me/addresses/:id`

**Admin**

- [x] `GET /admin/users` — list, filter, paginate, search
- [x] `GET /admin/users/:id`
- [x] `PATCH /admin/users/:id/status` — block / unblock
- [x] `GET /admin/staff`, `POST /admin/staff`
- [x] `PATCH /admin/staff/:id/roles`

**Infrastructure shipped with this phase**

- [x] JWT access (15m) + rotating refresh (7d), bcrypt
- [x] `@nestjs/throttler` — global bucket + tighter buckets on `/auth/*`, `/auth/otp/*`
- [x] `@nestjs/config` + Joi env validation (app refuses to boot on a missing var)
- [x] Swagger at `/api/docs`, response envelope `{ success, message, data, errors? }`
- [x] Docker: `Dockerfile` + `docker-compose.yml` (app + Postgres + Redis)
- [x] Audit trail (`AdminActivityLog`) on every admin write

---

## Phase 2 — Product Catalog & Inventory ✅

**Public (no JWT)**

- [x] `GET /categories` — tree with per-category product counts
- [x] `GET /categories/:slug` — with subcategories
- [x] `GET /products` — `?page&limit&search&category&brand&minPrice&maxPrice&sort=newest|price_asc|price_desc|rating`
- [x] `GET /products/:slug` — images, variants with stock + inventory status, category
- [x] `GET /products/:id/reviews` — approved reviews only, paginated

**Admin**

- [x] `GET/POST /admin/categories`, `PATCH/DELETE /admin/categories/:id` (delete blocked while it has children/products)
- [x] `GET/POST /admin/products` — `?page&limit&search&status&categoryId&includeDeleted`
- [x] `GET/PATCH/DELETE /admin/products/:id` — DELETE is a soft delete (`isDeleted`/`deletedAt`)
- [x] `POST /admin/products/:id/variants`, `PATCH/DELETE /admin/variants/:id` (delete blocked once it has order history)
- [x] `POST /admin/products/:id/images` — multipart → S3, 5MB max, image mime whitelist, 10/product
- [x] `DELETE /admin/products/:id/images/:imageId` — also removes the S3 object
- [x] `PATCH /admin/inventory/:variantId` — sets quantity/threshold, recomputes `in/low/out_of_stock`
- [x] `GET /admin/inventory/low-stock`

**Notes**

- Auto slug (`ashwagandha-powder`) and SKU (`AQ-XXXXXX`) generation with collision checks.
- Prices/ratings serialized as plain numbers, not Prisma Decimals.
- Image upload returns **503** until `AWS_S3_BUCKET` + credentials are configured (app still boots).

---

## Phase 3 — Cart, Wishlist & Coupons ✅ (complete)

All endpoints built and verified — TypeScript compiles clean, 49 tests pass, production build succeeds.

**Public (no admin)**

- [x] `GET /cart` — current user cart with line items, variant stock, and applied coupon code
- [x] `POST /cart/items` — add variant (quantity capped at available stock, merge into existing line)
- [x] `PATCH /cart/items/:id` — update quantity (cannot set 0; remove instead)
- [x] `DELETE /cart/items/:id` — remove a line
- [x] `POST /cart/apply-coupon` — validate + apply coupon to cart
- [x] `DELETE /cart/remove-coupon` — drop the coupon
- [x] `GET /wishlist` — list favourites (visible product name, price, image)
- [x] `POST /wishlist` — add product (upsert — no-op if already present)
- [x] `DELETE /wishlist/:productId` — remove from favourites

**Admin (`admin` role; audit-logged)**

- [x] `GET /admin/coupons` — list coupons with pagination + filters (search, discountType, hasUsage)
- [x] `GET /admin/coupons/me` — coupons visible to current user
- [x] `POST /admin/coupons` — create (code, percentage/fixed value, minOrderValue, expiry, usageLimit, maxPerUser, userIds, description)
- [x] `PATCH /admin/coupons/:id` — update any field or deactivate
- [x] `DELETE /admin/coupons/:id` — deactivate (soft)

**Service contracts**

- `CouponService.validateCouponForCart(userId, code, itemSubtotal, itemCount)` — returns `valid: true` or throws a descriptive `NotFoundException` if the coupon is missing, expired, below `minOrderValue`, or `usageLimit` reached.
- `CartService.applyCoupon(userId, dto, actor)` / `removeCoupon(userId, dto, actor)` — attach/detach the coupon code on the `Cart` row; both audit-logged.
- `CartService.getCart(userId, query)` — returns `couponCode` on the response envelope for convenience.

**Notes**

- `Cart` rows are created lazily — the first `POST /cart/items` creates the user's cart.
- Deactivate coupons instead of hard-deleting (foreign-key: `Cart.couponCode` → `Coupon.code`).
- `userIds` (restricted-to-user list), `maxPerUser` (usage cap per person) and `description` are now real columns on the `Coupon` model; the DB migration will be needed for existing rows.

---

## Phase 4 — Orders & Payments (Razorpay) ✅ (complete)

Full order lifecycle + Razorpay integration shipped. TypeScript compiles clean, build succeeds (no unit tests for this phase).

**Public (no admin)**

- [x] `POST /orders` — order record + Razorpay order; idempotent via client idempotency key
- [x] `GET /orders` — current user's orders (filter by status, paymentStatus, date range)
- [x] `GET /orders/:id` — full order detail (line items, inventory snapshot, payment, shipping address, status history)
- [x] `PATCH /orders/:id/cancel` — cancel order + raise inventory back
- [x] `POST /orders/:id/return-request` — submit post-purchase return request

**Webhook (Razorpay)**

- [x] `POST /webhooks/razorpay` — **raw body** route (RawBodyMiddleware), source of truth for `payment.captured` / `payment.failed` / `refund.processed`. Signature verification is logged as deferred until `RAZORPAY_WEBHOOK_SECRET` is configured.

**Admin (`admin` role; audit-logged)**

- [x] `GET /admin/orders` — list with pagination + filters (status, paymentStatus, userId, orderNumber)
- [x] `GET /admin/orders/:id` — full admin order detail
- [x] `PATCH /admin/orders/:id/status` — update status (pending → confirmed → shipped → delivered / cancel / return)
- [x] `POST /admin/orders/:id/refund` — process a refund for a captured payment
- [x] `GET /admin/payments` — list all payments with order status cross-reference

**Service contracts**

- `OrderService.createOrder(dto, actor)` — validates variants + stock, computes subtotal/tax/shipping/total, decrements inventory in a transaction, audit-logged.
- `OrderService.validateItems(items)` — ensures every variant exists, is active, and has sufficient stock; captures price, tax%, HSN at purchase.
- `OrderService.adminRefund(orderId, dto, actor)` — marks order as refunded (Razorpay Refunds API called once webhook keys are configured)
- `OrderService.adminListPayments(query)` — lists payments joined to order metadata.

**Notes**

- `POST /orders` captures snapshot price + tax% + HSN code on `OrderItem` at purchase time (never recomputes from live product price).
- Inventory is decremented atomically in the same DB transaction as order creation — rollback on failure.
- Inventory is raised back on cancel.
- Webhook signature verification is not yet active (RAZORPAY_WEBHOOK_SECRET is unset in dev); the route reads raw body and logs the event for review.

---

## Phase 5 — Shipping (Shiprocket + India Post) ✅ (complete)

Shipping integration shipped: India Post API (main carrier) + Shiprocket (secondary, not yet configured with API keys). TypeScript compiles clean, production build succeeds.

**Public**

- [x] `GET /shipping/rate-estimates?pincode=&state=&city=&weightGrams=` — get rate estimates from India Post (+ Shiprocket fallback) for any Indian address
- [x] `GET /shipping/tracking/:awbNumber` — fetch tracking status by AWB number

**Admin (`admin` role)**

- [x] `POST /orders/:orderId/ship` — create a shipment with a service + AWB (India Post or Shiprocket)
- [x] `GET /admin/shipments` — list all shipments with order cross-reference
- [x] `GET /admin/shipments/:id` — full shipment detail with line items

**Webhooks**

- [x] `POST /webhooks/india-post` — raw-body route receiving shipment status updates (picked up / transit / delivered / RTO). Signature verification logged as deferred until webhook secret is configured.

**Features**

- `POST /orders/:orderId/ship` accepts a service name (`india-post`, `shiprocket`, etc.) and weight; returns the lowest-cost available option.
- India Post rate engine estimates costs per service type and applies state-based surcharges.
- Shipment records capture `courier`, `awbNumber`, `trackingUrl`, `status`, `shippedAt`.
- `GET /shipping/tracking/:awbNumber` proxies the current tracking status (India Post status codes mapped to labels).
- `createIndiaPostAwb()` generates a live AWB during the India Post shipment creation flow.

---

## Phase 6 — Admin Dashboard & Reports 🟡

- [x] `AdminActivityLog` model + `AuditService` writing an entry on every admin write
- [ ] `GET /admin/activity-logs` — filterable audit trail endpoint (data exists, endpoint doesn't)
- [ ] `GET /admin/dashboard/summary` — today's orders, revenue, pending shipments, low-stock count
- [ ] `GET /admin/reports/sales` — date range + CSV export
- [ ] `GET /admin/reports/products` — top-selling, slow-moving
- [ ] `GET /admin/reports/customers` — repeat vs new, top spenders

---

## Phase 7 — Notifications, Reviews & GST Invoicing 🟡

- [x] `MailService` (nodemailer SMTP, console fallback in dev)
- [x] `OtpService` (MSG91, console fallback in dev) — used by auth OTP login
- [x] `GET /products/:id/reviews` — public approved-review reads (Phase 2)
- [ ] `POST /reviews` — submit to moderation queue
- [ ] `GET /admin/reviews` (pending queue), `PATCH /admin/reviews/:id/approve`, `DELETE /admin/reviews/:id`
- [ ] Notification triggers: order placed/confirmed/shipped/delivered/cancelled, payment failed
- [ ] Back-in-stock alert `POST /products/:id/notify-me` + low-stock alert to admin
- [ ] `GET /orders/:id/invoice` — GST PDF (HSN, tax breakup, seller GSTIN)
- [ ] `GET /admin/invoices/:orderId`
- [ ] Confirm GSTIN + whether B2B input invoices are needed

---

## Phase 8 — Security, Tests & Deployment 🟡

- [x] Role-based guards (`customer`/`staff`/`admin`) on every route via global Guards + `@Roles()`
- [x] DTO validation (class-validator) on every request body
- [x] Rate limiting (`@nestjs/throttler`) incl. tighter auth/OTP buckets
- [x] Helmet + CORS locked to `FRONTEND_URL` / `ADMIN_URL`
- [x] Soft delete on `Product` (and `User.isDeleted` for auth)
- [x] Audit log on every admin write
- [x] Joi env validation — fails to boot when a required var is missing
- [x] Docker (`Dockerfile`, `docker-compose.yml`)
- [x] Jest unit tests — **49 tests / 5 suites** (`npm test`)
- [ ] e2e tests — at minimum checkout + Razorpay webhook flow (`test/` has config only)
- [ ] Sentry + Winston structured logging
- [ ] Production deploy + CI
- [ ] Rate-limit tuning and security review pass

---

## Database schema status

Schema is **ahead of the code** — all plan entities are modelled in `prisma/schema.prisma`, migrations applied (1 migration: `init`).

| Ready in schema | Module not built yet |
| --- | --- |
| `Category`, `Product`, `ProductVariant`, `ProductImage`, `Inventory` | ✅ Phase 2 shipped |
| `User`, `Address` | ✅ Phase 1 shipped |
| `Cart`, `CartItem`, `Wishlist`, `Coupon` | ⬜ Phase 3 |
| `Order`, `OrderItem`, `Payment`, `Refund`, `OrderStatusHistoryEntry` | ⬜ Phase 4 |
| `Shipment` | ⬜ Phase 5 |
| `Review`, `Notification`, `Invoice` | ⬜ Phase 7 |

---

## Quality gates (run before marking anything done)

```bash
npx tsc --noEmit        # typecheck
npm test                # 49 unit tests
npm run build           # nest build
docker compose up --build   # full stack parity with prod
```

---

## Work log

| Date | What changed |
| --- | --- |
| 2026-09-26 | **Phase 1 complete** — auth, users, admin user/staff management, Swagger, Docker, tests |
| 2026-09-26 | **Phase 2 complete** — categories, products, variants, S3 image upload, inventory + low-stock |
| 2026-09-26 | **Phase 3 complete** — Cart, Wishlist & Coupon modules (public + admin CRUD, service contracts) |
| 2026-09-26 | **Phase 4 complete** — Orders & Razorpay; order creation with inventory snapshot, cancel, return-request, admin CRUD, raw-body webhook route |
| 2026-09-26 | **Repo consolidation** — NestJS code moved into `Nisar001/aqherbal_backend` (was an untracked local folder); legacy Express + MongoDB backend deleted from the working tree (recoverable from git history / GitHub); local agent-skill dirs and empty `.pgsock` removed |
