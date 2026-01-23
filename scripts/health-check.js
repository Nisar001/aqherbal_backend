#!/usr/bin/env node

/**
 * Health Check Script
 * Validates the application is in a healthy state
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('🏥 Running health checks...\n');

let healthScore = 0;
const checks = [];

// Check 1: Node.js version
console.log('Check 1: Node.js version');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].slice(1));
if (majorVersion >= 18) {
  console.log(`  ✅ Node.js ${nodeVersion}\n`);
  healthScore += 10;
  checks.push({ name: 'Node.js version', status: 'OK' });
} else {
  console.log(`  ❌ Node.js 18+ required. Current: ${nodeVersion}\n`);
  checks.push({ name: 'Node.js version', status: 'FAIL' });
}

// Check 2: Project structure
console.log('Check 2: Project structure');
const requiredDirs = ['src', 'src/services', 'src/modules', 'src/middlewares'];
let dirMissing = 0;
for (const dir of requiredDirs) {
  const fullPath = path.join(projectRoot, dir);
  if (!fs.existsSync(fullPath)) {
    dirMissing++;
  }
}

if (dirMissing === 0) {
  console.log(`  ✅ All ${requiredDirs.length} directories present\n`);
  healthScore += 15;
  checks.push({ name: 'Project structure', status: 'OK' });
} else {
  console.log(`  ❌ ${dirMissing} directories missing\n`);
  checks.push({ name: 'Project structure', status: 'FAIL' });
}

// Check 3: Dependencies
console.log('Check 3: Dependencies');
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const criticalDeps = ['express', 'mongoose', 'razorpay', 'joi', 'jsonwebtoken'];
let missingDeps = 0;

for (const dep of criticalDeps) {
  const depPath = path.join(nodeModulesPath, dep);
  if (!fs.existsSync(depPath)) {
    missingDeps++;
  }
}

if (missingDeps === 0) {
  console.log(`  ✅ All ${criticalDeps.length} critical dependencies installed\n`);
  healthScore += 15;
  checks.push({ name: 'Dependencies', status: 'OK' });
} else {
  console.log(`  ❌ ${missingDeps} dependencies missing\n`);
  checks.push({ name: 'Dependencies', status: 'FAIL' });
}

// Check 4: Configuration files
console.log('Check 4: Configuration files');
const configFiles = ['package.json', 'src/config/config.js'];
let configMissing = 0;

for (const file of configFiles) {
  const fullPath = path.join(projectRoot, file);
  if (!fs.existsSync(fullPath)) {
    configMissing++;
  }
}

if (configMissing === 0) {
  console.log(`  ✅ All ${configFiles.length} config files present\n`);
  healthScore += 15;
  checks.push({ name: 'Configuration', status: 'OK' });
} else {
  console.log(`  ❌ ${configMissing} config files missing\n`);
  checks.push({ name: 'Configuration', status: 'FAIL' });
}

// Check 5: Entry point
console.log('Check 5: Entry point (src/server.js)');
const serverPath = path.join(projectRoot, 'src', 'server.js');
if (fs.existsSync(serverPath)) {
  console.log('  ✅ Server entry point exists\n');
  healthScore += 10;
  checks.push({ name: 'Entry point', status: 'OK' });
} else {
  console.log('  ❌ Server entry point missing\n');
  checks.push({ name: 'Entry point', status: 'FAIL' });
}

// Check 6: Build info
console.log('Check 6: Build information');
const buildInfoPath = path.join(projectRoot, 'build-info.json');
if (fs.existsSync(buildInfoPath)) {
  try {
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    console.log(`  ✅ Build info found (built: ${buildInfo.builtAt})\n`);
    healthScore += 10;
    checks.push({ name: 'Build info', status: 'OK' });
  } catch (err) {
    console.log(`  ⚠️  Build info corrupted\n`);
    checks.push({ name: 'Build info', status: 'WARN' });
  }
} else {
  console.log('  ⚠️  Build info not found (run npm run build)\n');
  checks.push({ name: 'Build info', status: 'WARN' });
}

// Check 7: Middleware files
console.log('Check 7: Critical middleware');
const middlewareFiles = [
  'src/middlewares/error.middleware.js',
  'src/middlewares/auth.middleware.js',
  'src/middlewares/security.middleware.js'
];

let middlewareMissing = 0;
for (const file of middlewareFiles) {
  const fullPath = path.join(projectRoot, file);
  if (!fs.existsSync(fullPath)) {
    middlewareMissing++;
  }
}

if (middlewareMissing === 0) {
  console.log(`  ✅ All ${middlewareFiles.length} middleware files present\n`);
  healthScore += 10;
  checks.push({ name: 'Middleware', status: 'OK' });
} else {
  console.log(`  ⚠️  ${middlewareMissing} middleware files missing\n`);
  checks.push({ name: 'Middleware', status: 'WARN' });
}

// Check 8: Helper files
console.log('Check 8: Helper utilities');
const helperFiles = [
  'src/helpers/response.helper.js',
  'src/helpers/pagination.helper.js',
  'src/helpers/sanitize.helper.js'
];

let helperMissing = 0;
for (const file of helperFiles) {
  const fullPath = path.join(projectRoot, file);
  if (!fs.existsSync(fullPath)) {
    helperMissing++;
  }
}

if (helperMissing === 0) {
  console.log(`  ✅ All ${helperFiles.length} helper files present\n`);
  healthScore += 10;
  checks.push({ name: 'Helpers', status: 'OK' });
} else {
  console.log(`  ⚠️  ${helperMissing} helper files missing\n`);
  checks.push({ name: 'Helpers', status: 'WARN' });
}

// Summary
console.log('═'.repeat(50));
console.log('📊 Health Check Summary');
console.log('═'.repeat(50));

for (const check of checks) {
  const icon = check.status === 'OK' ? '✅' : check.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`  ${icon} ${check.name}: ${check.status}`);
}

console.log('\n' + '═'.repeat(50));
console.log(`🏥 Health Score: ${healthScore}/100`);
console.log('═'.repeat(50));

if (healthScore >= 90) {
  console.log('\n🟢 System Status: HEALTHY\n');
  process.exit(0);
} else if (healthScore >= 70) {
  console.log('\n🟡 System Status: ACCEPTABLE (Minor issues detected)\n');
  process.exit(0);
} else {
  console.log('\n🔴 System Status: UNHEALTHY (Critical issues detected)\n');
  process.exit(1);
}
