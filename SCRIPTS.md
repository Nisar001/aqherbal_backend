# Build & Development Scripts

Comprehensive scripts for development, testing, validation, and building the AQHerbal backend.

---

## Available Scripts

### Development

#### `npm run dev`
Start the development server with hot-reload using Nodemon.
```bash
npm run dev
```
- Watches for file changes
- Auto-restarts server
- Loads environment from `.env`

#### `npm start`
Start the production server (requires build first).
```bash
npm start
```

---

### Testing

#### `npm test`
Run all tests using Jest.
```bash
npm test
```
- Runs all `.test.js` and `.test.mjs` files
- Uses experimental VM modules for ES Modules support
- Exits with code 1 on failure

#### `npm run test:watch`
Run tests in watch mode (auto-rerun on changes).
```bash
npm run test:watch
```
- Great for TDD workflow
- Reruns affected tests automatically

#### `npm run test:coverage`
Generate test coverage report.
```bash
npm run test:coverage
```
- Shows coverage percentages
- Creates coverage reports
- Useful for identifying untested code

---

### Code Quality

#### `npm run lint`
Check code for errors and style issues using ESLint.
```bash
npm run lint
```
- Validates JavaScript syntax
- Enforces coding standards
- Reports all issues

#### `npm run lint:fix`
Auto-fix linting issues where possible.
```bash
npm run lint:fix
```
- Fixes formatting issues
- Corrects simple errors
- Manual fixes needed for complex issues

#### `npm run format`
Format code using Prettier.
```bash
npm run format
```
- Applies consistent code style
- Single quotes, 2-space indent
- Line length: 100 characters

#### `npm run validate`
Run all validations (lint + test).
```bash
npm run validate
```
- Runs ESLint
- Runs Jest tests
- Fails if any check fails
- Must pass before building

---

### Building

#### `npm run build`
Full build process: validate, test, and create build artifacts.
```bash
npm run build
```

**Build pipeline:**
1. Cleans previous build artifacts
2. Validates project structure
3. Checks Node.js version (18+)
4. Verifies all dependencies
5. Validates entry point
6. Creates build information
7. Ready for deployment

**What happens:**
- Runs `npm run validate` first
- Runs `npm run bundle` for build
- Generates `build-info.json` with metadata
- Creates build summary

#### `npm run bundle`
Create build artifacts (called by `npm run build`).
```bash
npm run bundle
```
- Validates all aspects
- Creates build information
- Prepares for production

#### `npm run clean`
Remove build artifacts and temporary files.
```bash
npm run clean
```
- Removes: `build-info.json`, `.eslintcache`, `coverage/`
- Cleans: `logs/` directory
- Keeps source code intact

#### `npm run check`
Run health check without building.
```bash
npm run check
```
- Validates system health
- Checks critical dependencies
- Returns health score (0-100)
- Green: 90+, Yellow: 70-89, Red: <70

---

## Build Process Flow

```
npm run build
    ↓
npm run clean (prebuild hook)
    ↓
npm run validate
    ├─ npm run lint
    └─ npm run test
    ↓
npm run bundle
    ├─ Check Node.js version (18+)
    ├─ Validate project structure
    ├─ Check critical dependencies
    ├─ Verify entry point
    ├─ Check environment setup
    └─ Generate build-info.json
    ↓
✅ Ready for npm start
```

---

## Configuration Files

### `.eslintrc.json`
ESLint configuration for code quality checks.
- Environment: Node.js, ES2021, Jest
- Extends: eslint:recommended
- Custom rules for consistency

### `.prettierrc.json`
Prettier configuration for code formatting.
- Single quotes
- 2-space indent
- 100-character line width
- Trailing commas: none

### `.eslintignore`
Files/folders ignored by ESLint.
- node_modules/
- dist/, coverage/
- Build artifacts

### `.prettierignore`
Files/folders ignored by Prettier.
- Dependency and config files
- Build outputs
- Environment files

---

## Environment Variables

Create a `.env` file with:

```env
# Database
DB_URL=mongodb://localhost:27017/aqherbal

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=secret_key

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Server
PORT=5000
NODE_ENV=development
```

---

## Scripts Details

### Bundle Script (`scripts/bundle.js`)

Comprehensive build validation:

1. **Node.js Version Check** - Ensures Node 18+
2. **Project Structure Validation** - Checks all required directories
3. **Entry Point Verification** - Confirms `src/server.js` exists
4. **Dependency Check** - Validates critical packages installed
5. **Environment Configuration** - Checks `.env` setup
6. **Package.json Validation** - Ensures correct structure
7. **Key Files Verification** - Checks essential files
8. **Build Information** - Creates build metadata

**Exit codes:**
- `0`: Build successful
- `1`: Build failed (critical issue)

### Clean Script (`scripts/clean.js`)

Removes build artifacts:
- `build-info.json`
- `.eslintcache`
- `coverage/` directory
- Logs in `logs/` folder

Keeps source code intact.

### Health Check Script (`scripts/health-check.js`)

System health validation with scoring:

**Checks performed:**
1. Node.js version (10 points)
2. Project structure (15 points)
3. Dependencies (15 points)
4. Configuration files (15 points)
5. Entry point (10 points)
6. Build info (10 points)
7. Middleware files (10 points)
8. Helper utilities (10 points)

**Health scores:**
- ✅ 90-100: HEALTHY
- 🟡 70-89: ACCEPTABLE
- 🔴 <70: UNHEALTHY

---

## Common Tasks

### Check for lint errors
```bash
npm run lint
```

### Fix lint errors automatically
```bash
npm run lint:fix
```

### Format all code
```bash
npm run format
```

### Run tests
```bash
npm test
```

### Watch tests while developing
```bash
npm run test:watch
```

### Check test coverage
```bash
npm run test:coverage
```

### Prepare for production
```bash
npm run build
```

### Check system health
```bash
npm run check
```

### Development with hot-reload
```bash
npm run dev
```

### Start production server
```bash
npm start
```

---

## Pre-commit Hook Recommendation

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
npm run lint:fix
npm run test
```

This ensures code is formatted and tested before commits.

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Build & Test
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

---

## Troubleshooting

### "Node.js 18+ required"
```bash
# Check your Node version
node --version

# Update Node.js if needed
# Download from https://nodejs.org/
```

### "node_modules not found"
```bash
# Install dependencies
npm install
```

### "Linting errors"
```bash
# Auto-fix errors
npm run lint:fix

# Review remaining errors
npm run lint
```

### "Tests failing"
```bash
# Run tests with more details
npm run test -- --verbose

# Run specific test file
npm test -- path/to/test.js
```

### Build fails
```bash
# Check health
npm run check

# Clean and rebuild
npm run clean
npm run build
```

---

## Performance Tips

1. **Use `npm run dev`** during development (auto-reload is faster)
2. **Use `npm run test:watch`** for TDD workflow
3. **Run `npm run lint:fix`** regularly to catch issues early
4. **Run `npm run check`** before committing
5. **Keep Node.js updated** (18+ recommended)

---

## Support

- ESLint: https://eslint.org/
- Prettier: https://prettier.io/
- Jest: https://jestjs.io/
- Nodemon: https://nodemon.io/

---

**Last Updated**: January 22, 2026
