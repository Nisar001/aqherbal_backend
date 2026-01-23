#!/usr/bin/env node

/**
 * Build & Bundle Script
 * Validates, tests, and prepares the application for production
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('🔨 Building AQHerbal Backend...\n');

// Step 1: Validate environment
console.log('✓ Step 1: Checking Node.js version');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].slice(1));
if (majorVersion < 18) {
  console.error(`❌ Node.js 18+ required. Current: ${nodeVersion}`);
  process.exit(1);
}
console.log(`  ✅ Node.js ${nodeVersion} (OK)\n`);

// Step 2: Validate project structure
console.log('✓ Step 2: Validating project structure');
const requiredDirs = [
  'src',
  'src/services',
  'src/modules',
  'src/config',
  'src/middlewares',
  'src/helpers',
  'src/utils'
];

for (const dir of requiredDirs) {
  const fullPath = path.join(projectRoot, dir);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing directory: ${dir}`);
    process.exit(1);
  }
}
console.log(`  ✅ All ${requiredDirs.length} required directories found\n`);

// Step 3: Validate entry point
console.log('✓ Step 3: Validating entry point');
const serverPath = path.join(projectRoot, 'src', 'server.js');
if (!fs.existsSync(serverPath)) {
  console.error('❌ Entry point not found: src/server.js');
  process.exit(1);
}
console.log('  ✅ Entry point src/server.js exists\n');

// Step 4: Check dependencies
console.log('✓ Step 4: Checking dependencies');
const nodeModulesPath = path.join(projectRoot, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ node_modules not found. Run "npm install" first');
  process.exit(1);
}

const criticalDeps = [
  'express',
  'mongoose',
  'dotenv',
  'jsonwebtoken',
  'joi',
  'razorpay'
];

for (const dep of criticalDeps) {
  const depPath = path.join(nodeModulesPath, dep);
  if (!fs.existsSync(depPath)) {
    console.error(`❌ Missing critical dependency: ${dep}`);
    process.exit(1);
  }
}
console.log(`  ✅ All ${criticalDeps.length} critical dependencies installed\n`);

// Step 5: Validate environment file
console.log('✓ Step 5: Checking environment configuration');
const envPath = path.join(projectRoot, '.env');
if (!fs.existsSync(envPath)) {
  console.warn('  ⚠️  .env file not found (optional for development)');
} else {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'DB_URL',
    'JWT_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET'
  ];
  
  let missingVars = [];
  for (const varName of requiredVars) {
    if (!envContent.includes(varName)) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.warn(`  ⚠️  Missing environment variables: ${missingVars.join(', ')}`);
  } else {
    console.log('  ✅ All required environment variables found\n');
  }
}

// Step 6: Validate package.json
console.log('✓ Step 6: Validating package.json');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.main || !packageJson.type) {
  console.error('❌ Invalid package.json configuration');
  process.exit(1);
}
console.log('  ✅ package.json is valid\n');

// Step 7: Check key files
console.log('✓ Step 7: Verifying key files');
const keyFiles = [
  'src/app.routes.js',
  'src/config/config.js',
  'src/middlewares/error.middleware.js',
  'src/helpers/response.helper.js'
];

for (const file of keyFiles) {
  const fullPath = path.join(projectRoot, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing key file: ${file}`);
    process.exit(1);
  }
}
console.log(`  ✅ All ${keyFiles.length} key files present\n`);

// Step 8: Create build info
console.log('✓ Step 8: Creating build information');
const buildInfo = {
  timestamp: new Date().toISOString(),
  version: packageJson.version,
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development',
  buildNumber: process.env.BUILD_NUMBER || 'local',
  builtAt: new Date().toLocaleString()
};

const buildInfoPath = path.join(projectRoot, 'build-info.json');
fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
console.log(`  ✅ Build info created\n`);

// Final summary
console.log('═'.repeat(50));
console.log('🎉 Build validation successful!');
console.log('═'.repeat(50));
console.log('\n📋 Build Summary:');
console.log(`   Version: ${packageJson.version}`);
console.log(`   Node.js: ${process.version}`);
console.log(`   Environment: ${buildInfo.environment}`);
console.log(`   Built at: ${buildInfo.builtAt}`);
console.log('\n✅ The application is ready to run with: npm start');
console.log('✅ For development, use: npm run dev\n');

process.exit(0);
