# AQHerbal Backend

Enterprise-grade Herbal Medicine e-commerce backend built with Node.js, Express, and MongoDB, following layered architecture with controllers, services, repositories, validators, and centralized configuration.

## Architecture
- controllers: thin request handlers
- services: business logic
- repositories: data access layer (Mongoose)
- middlewares: auth, admin, security, rate limit, sanitize, logging
- validations: Joi/express-validator schemas
- constants: roles, order/payment/inventory statuses
- config: environment validation + DB connection
- docs: Swagger UI (`/api/docs`)
- utils/helpers: reusable functions

## Getting Started
1. Copy `.env.example` to `.env` and fill required values.
2. Install dependencies:
```bash
npm install
```
3. Start server:
```bash
npm run start
```

## Environment Variables
See `.env.example`. Required:
- DB_URL: MongoDB connection string
- JWT_SECRET: secure random string
- CLOUDINARY_*: for media handling

## API Docs
Swagger UI available at `/api/docs`.

## Notes
- All hardcoded business values moved to `src/constants/*` or env-driven config.
- Centralized error handling with `AppError` and `errorHandler`.
- Input sanitization middleware prevents XSS injection.