import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const reportsDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const jestArgs = [
  '--experimental-vm-modules',
  './node_modules/jest/bin/jest.js',
  '--runInBand',
  '--json',
  '--outputFile=reports/jest-results.json',
];

const jestRun = spawnSync(process.execPath, jestArgs, {
  stdio: 'inherit',
  shell: false,
});

const reportRun = spawnSync(process.execPath, ['scripts/generateApiTestReport.js'], {
  stdio: 'inherit',
  shell: false,
});

const exitCode = jestRun.status || reportRun.status || 0;
process.exit(exitCode);
