# AQ Herbal — NestJS Backend

Shared backend for the AQ Herbal storefront (`aqherbal_frontend`) and admin panel (`aqherbal_admin`), built to the
`AQ Herbal — NestJS Backend Build Plan`.

**Status: Phase 2 complete — Module 1 (Auth & User Management) + Module 2 (Product Catalog & Inventory).**

➡️ **Full build status (done vs. pending): [PROGRESS.md](PROGRESS.md)** — update it at the end of every work session.

> Note: this repo now contains **only** the NestJS backend. The original Express + MongoDB backend was removed
> from the working tree — it remains available in git history (all pre-migration commits on `dev`) and on GitHub.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | NestJS 11 (TypeScript) |
| Database | PostgreSQL + Prisma 7 (driver adapter: `@prisma/adapter-pg`) |
| Cache | Redis via `ioredis` — in-memory fallback when `REDIS_DISABLED=true` (dev) |
| Auth | JWT access (15m) + rotating refresh tokens (7d), bcrypt |
| Validation | class-validator DTOs + Joi env schema (app fails to boot if a var is missing) |
| Docs | Swagger at `/api/docs` |
| Files | AWS S3 (product images) — 503 until `AWS_*` env vars are set |
| Rate limiting | `@nestjs/throttler` (tighter buckets on `/auth/*`, `/auth/otp/*`) |

## Getting started

```bash
cp .env.example .env          # fill in DATABASE_URL + JWT secrets
npm install
npx prisma migrate dev        # apply schema
npm run start                 # or: npm run start:dev
```

- API base: `http://localhost:5000/api/v1`
- Swagger: `http://localhost:5000/api/docs`

Without SMTP/MSG91 configured, emails and OTP codes are **logged to the console** (dev mode).
Without `AWS_S3_BUCKET` + credentials configured, image upload returns **503** (everything else works).

## Endpoints (Module 2 — Catalog)

**Public** (no JWT)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/categories` | Full category tree with per-category product counts |
| GET | `/categories/:slug` | One category + its subcategories |
| GET | `/products` | `?page&limit&search&category=<slug>&brand&minPrice&maxPrice&sort=newest\|price_asc\|price_desc\|rating` |
| GET | `/products/:slug` | Detail: images, variants with stock + inventory status, category |
| GET | `/products/:id/reviews` | Approved reviews only, paginated |

**Admin** (`admin` role only; every write is audit-logged)

| Method | Path | Notes |
| --- | --- | --- |
| GET/POST | `/admin/categories` | List with counts / create (slug auto-generated) |
| PATCH/DELETE | `/admin/categories/:id` | Delete blocked while subcategories/products exist |
| GET/POST | `/admin/products` | `?page&limit&search&status&categoryId&includeDeleted` |
| GET/PATCH/DELETE | `/admin/products/:id` | DELETE = soft delete (`isDeleted`/`deletedAt`) |
| POST | `/admin/products/:id/variants` | Pack sizes; seeds `Inventory` (quantity + threshold) |
| PATCH/DELETE | `/admin/variants/:id` | DELETE blocked once the variant has order history |
| POST | `/admin/products/:id/images` | `multipart/form-data` field `image` → S3, max 5MB, 10/product |
| DELETE | `/admin/products/:id/images/:imageId` | Also removes the S3 object |
| PATCH | `/admin/inventory/:variantId` | Sets quantity/threshold, recomputes in/low/out-of-stock |
| GET | `/admin/inventory/low-stock` | Variants at or below their threshold |

## Endpoints (Module 1)

**Auth** (rate-limited)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/register` | email/phone + password |
| POST | `/auth/login` | email + password |
| POST | `/auth/otp/send` | mobile OTP login step 1 (60s cooldown) |
| POST | `/auth/otp/verify` | step 2 — creates an account on first use of a phone |
| POST | `/auth/refresh-token` | single-use rotation; reuse → 401 |
| POST | `/auth/logout` | revokes the supplied refresh token |
| POST | `/auth/forgot-password` | 30-min reset link, emailed |
| POST | `/auth/reset-password` | resets password + invalidates all sessions |

## Endpoints (Module 3 — Cart, Wishlist & Coupons)

**Public**

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/cart` | Current user cart — line items, variant stock, applied coupon code |
| POST | `/cart/items` | Add variant (quantity capped at stock; merged into existing line) |
| PATCH | `/cart/items/:id` | Update quantity (cannot set 0; remove instead) |
| DELETE | `/cart/items/:id` | Remove a line |
| POST | `/cart/apply-coupon` | Validate + apply coupon |
| DELETE | `/cart/remove-coupon` | Remove coupon from cart |
| GET | `/wishlist` | Favourites list (name, price, image, category) |

## Endpoints (Module 4 — Orders & Razorpay)

**Public**

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/orders` | Create an order from a cart (idempotent via client key) |
| GET | `/orders` | List the current user's orders |
| GET | `/orders/:id` | Full order detail (items, payment, shipping address, status history) |
| PATCH | `/orders/:id/cancel` | Cancel an order, raise inventory back |
| POST | `/orders/:id/return-request` | Submit a post-purchase return request |

**Webhooks (Razorpay)**

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/webhooks/razorpay` | Raw-body route; source of truth for payment.captured / payment.failed / refund.processed |

**Admin (`admin` role)**

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/orders` | List with pagination + filters |
| GET | `/admin/orders/:id` | Full admin order detail |
| PATCH | `/admin/orders/:id/status` | Update order status |
| POST | `/admin/orders/:id/refund` | Process a refund for a captured payment |
| GET | `/admin/payments` | List all payments |

**Shipping**

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/orders/:orderId/ship` | Create a shipment with a service + AWB |
| GET | `/admin/shipments` | List all shipments |
| GET | `/admin/shipments/:id` | Full shipment detail |
| GET | `/shipping/tracking/:awbNumber` | Fetch tracking status by AWB number |

**Webhooks**

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/webhooks/india-post` | Raw-body route; shipment status updates (picked up / transit / delivered / RTO) |

**Data contracts**

- `OrderItem` captures `priceAtPurchase`, `taxPercentAtPurchase`, `hsnCodeAtPurchase` at purchase time — never recomputed from the live product price.
- Cancel raises inventory back; return-request marks the order as returned.
- Webhook signature verification is deferred until `RAZORPAY_WEBHOOK_SECRET` is configured (dev: logs raw body for manual review).| POST | `/wishlist` | Add product (upsert — no-op if already present) |
| DELETE | `/wishlist/:productId` | Remove from favourites |

**Admin (`admin` role; audit-logged)**

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/coupons` | List with pagination + filters (search, discountType, hasUsage) |
| GET | `/admin/coupons/me` | Coupons visible to current user |
| POST | `/admin/coupons` | Create (code, percentage/fixed value, minOrderValue, expiry, usageLimit, maxPerUser, userIds, description) |
| PATCH | `/admin/coupons/:id` | Update any field or deactivate |
| DELETE | `/admin/coupons/:id` | Deactivate (soft delete) |

**Users**

| Method | Path |
| --- | --- |
| GET/PATCH | `/users/me` |
| GET/POST | `/users/me/addresses` |
| PATCH/DELETE | `/users/me/addresses/:id` |

**Admin** (`admin` role only; every write is audit-logged to `AdminActivityLog`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/users` | `?page&limit&search&role` |
| GET | `/admin/users/:id` | |
| PATCH | `/admin/users/:id/status` | block / unblock |
| GET/POST | `/admin/staff` | sub-admin accounts |
| PATCH | `/admin/staff/:id/roles` | role assignment |

## Response envelope

Both frontends expect `{ success, message, data, errors? }`. Auth endpoints additionally expose top-level
`token` / `refreshToken` / `user` (admin panel) alongside `data.accessToken` / `data.refreshToken` / `data.user`
(storefront), so one backend serves both clients.

## Scripts

```bash
npm run start          # build + serve
npm run start:dev      # watch mode
npm test               # jest unit tests
npm run test:cov       # coverage
npx tsc --noEmit       # typecheck
docker compose up --build   # app + postgres + redis
```

## Phase roadmap (from the build plan)

1. ✅ Project setup, Postgres + Prisma schema, Auth module, User module, Swagger, Docker
2. ✅ Category & Product modules, image upload, admin CRUD
3. ⬜ Cart, Wishlist, Coupon modules
4. ⬜ Orders + Razorpay + webhook handling (highest risk — test in Razorpay test mode)
5. ⬜ Shiprocket integration, tracking
6. ⬜ Admin dashboard, reports, activity logs
7. ⬜ Notifications, Reviews, GST invoice PDF
8. ⬜ Security hardening, rate-limit tuning, e2e coverage, deployment

## Local dev database

The test setup uses a project-local Postgres cluster on **port 5433** (`.pgdata/`, git-ignored):

```bash
/usr/lib/postgresql/18/bin/pg_ctl -D .pgdata -o "-p 5433 -k /tmp/aqherbal-pgsock -h 127.0.0.1" start
```

Point `DATABASE_URL` at your own instance in any other environment.
