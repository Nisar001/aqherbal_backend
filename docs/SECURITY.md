# AQ Herbal Backend - Input Protection & Spam Mitigation

## Layers
1. **Rate limiting** (Redis-optional): per-surface limits (auth/reviews/coupons/admin/webhooks) plus global normal/suspicious limits.
2. **Validation**: `validate()` middleware wraps express-validator/Joi; returns user-safe messages.
3. **Sanitization**: `sanitizeRequestMiddleware` normalizes and strips scripts/HTML with depth and length guards.
4. **Spam detection**: `spamDetectionMiddleware` blocks oversized or spammy payloads using keyword/link/repetition heuristics.
5. **Business logic**: controllers execute only after upstream protection.

## Middlewares
- `sanitizeRequestMiddleware` → [src/middlewares/sanitize.middleware.js](../middlewares/sanitize.middleware.js)
- `spamDetectionMiddleware` → [src/middlewares/spamDetection.middleware.js](../middlewares/spamDetection.middleware.js)
- `validate()` / `validateRequest` → [src/middlewares/validation.middleware.js](../middlewares/validation.middleware.js)
- Rate limiters → [src/middlewares/rateLimit.middleware.js](../middlewares/rateLimit.middleware.js)

## Utilities
- Normalization → [src/utils/inputNormalizer.js](../utils/inputNormalizer.js)
- Sanitizers → [src/utils/sanitizers.js](../utils/sanitizers.js)
- Spam rules → [src/utils/spamRules.js](../utils/spamRules.js)
- Detection service → [src/services/spamDetection.service.js](../services/spamDetection.service.js)

## Configuration (.env)
```
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=200
SUSPICIOUS_RATE_LIMIT_MAX=20
RATE_LIMIT_SENSITIVE_WINDOW=5m
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_REVIEW_MAX=15
RATE_LIMIT_COUPON_MAX=30
RATE_LIMIT_CONTACT_MAX=10
RATE_LIMIT_WEBHOOK_MAX=50
INPUT_MAX_DEPTH=8
INPUT_MAX_STRING_LENGTH=5000
SPAM_MAX_LINKS=5
SPAM_MAX_KEYWORD_HITS=3
SPAM_MAX_PAYLOAD_BYTES=51200
SPAM_MAX_REPEAT_RUN=12
```

## Usage Examples
- **Apply validation**: `router.post('/login', validate(loginSchema), controller);`
- **Apply sanitizer + spam detector**: globally in `server.js` (already wired).
- **Rate limit sensitive routes**: already applied to auth/reviews/coupons in `app.routes.js`; create more via `buildRateLimiter` helpers.

## Tuning Thresholds
- Increase `RATE_LIMIT_*` values if users hit limits legitimately.
- Lower `SPAM_MAX_LINKS` or `SPAM_MAX_PAYLOAD_BYTES` to tighten spam gates.
- Adjust `INPUT_MAX_STRING_LENGTH` if legitimate fields need larger text.

## Logging & Privacy
- Spam detections log only hashed payloads + minimal context (route, IP, userId).
- Validation responses are generic to avoid leaking internals.

## Testing Guidance
- Malicious payloads: `<script>alert(1)</script>`, SQLi strings, repeated characters, link-heavy text.
- Flood tests: large JSON bodies (~60KB) should return `413`.
- Rate-limit tests: burst login or coupon validation requests should be blocked with 429.
