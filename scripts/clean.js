#!/usr/bin/env node

/**
 * Clean Script
 * Removes build artifacts and temporary files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('🧹 Cleaning build artifacts...\n');

const filesToRemove = [
  'build-info.json',
  '.eslintcache',
  'coverage',
  'dist'
];

const foldersToClean = [
  path.join(projectRoot, 'logs')
];

// Remove files
for (const file of filesToRemove) {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      console.log(`✅ Removed: ${file}`);
    } catch (err) {
      console.error(`❌ Failed to remove ${file}: ${err.message}`);
    }
  }
}

// Clean directories (keep them but remove contents)
for (const folder of foldersToClean) {
  if (fs.existsSync(folder)) {
    try {
      const files = fs.readdirSync(folder);
      for (const file of files) {
        const filePath = path.join(folder, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
      console.log(`✅ Cleaned: ${path.basename(folder)}/`);
    } catch (err) {
      console.error(`⚠️  Failed to clean ${folder}: ${err.message}`);
    }
  }
}

console.log('\n✅ Cleanup complete!\n');
process.exit(0);
