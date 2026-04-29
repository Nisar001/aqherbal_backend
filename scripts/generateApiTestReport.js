import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const reportsDir = path.join(projectRoot, 'reports');
const jestResultsPath = path.join(reportsDir, 'jest-results.json');
const reportJsonPath = path.join(reportsDir, 'api-test-report.json');
const reportMdPath = path.join(reportsDir, 'api-test-report.md');
const srcDir = path.join(projectRoot, 'src');
const testsDir = path.join(projectRoot, 'tests');

const ensureReportsDir = () => {
  fs.mkdirSync(reportsDir, { recursive: true });
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const normalizePath = (endpointPath) =>
  endpointPath
    .replace(/\/+/g, '/')
    .replace(/\/$/, '') || '/';

const listFiles = (dirPath, matcher) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(fullPath, matcher));
      continue;
    }

    if (matcher(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
};

const loadRoutePrefixes = () => {
  const appRoutesPath = path.join(srcDir, 'app.routes.js');
  const source = fs.readFileSync(appRoutesPath, 'utf8');
  const prefixes = {};
  const prefixRegex = /app\.use\('([^']+)',\s*(?:[^,]+,\s*)?([A-Za-z0-9_]+)\);/g;
  let match;

  while ((match = prefixRegex.exec(source)) !== null) {
    prefixes[match[2]] = normalizePath(match[1]);
  }

  return prefixes;
};

const loadRouteInventory = () => {
  const prefixes = loadRoutePrefixes();
  const routeFiles = listFiles(path.join(srcDir, 'modules'), (filePath) =>
    filePath.endsWith(path.join('routes', 'index.js'))
  );
  const endpoints = [];
  const routeRegex = /router\.(get|post|put|delete|patch)\(\s*'([^']+)'/g;

  for (const routeFile of routeFiles) {
    const source = fs.readFileSync(routeFile, 'utf8');
    const moduleName = routeFile.split(path.sep).slice(-3)[0];
    const prefix = prefixes[`${moduleName}Routes`] || prefixes[`${moduleName}Route`] || '';
    let match;

    while ((match = routeRegex.exec(source)) !== null) {
      endpoints.push({
        module: moduleName,
        method: match[1].toUpperCase(),
        path: normalizePath(`${prefix}${match[2]}`),
        sourceFile: path.relative(projectRoot, routeFile),
      });
    }
  }

  return endpoints.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
};

const loadTestEndpointIndex = () => {
  const testFiles = listFiles(testsDir, (filePath) => filePath.endsWith('.js') || filePath.endsWith('.mjs'));
  const endpointRegex = /describe\('([A-Z]+)\s+(\/api\/v1\/[^']+)'/g;
  const coverage = new Map();

  for (const testFile of testFiles) {
    const source = fs.readFileSync(testFile, 'utf8');
    let match;

    while ((match = endpointRegex.exec(source)) !== null) {
      const key = `${match[1]} ${normalizePath(match[2])}`;
      if (!coverage.has(key)) {
        coverage.set(key, { files: new Set(), occurrences: 0 });
      }
      coverage.get(key).files.add(path.relative(projectRoot, testFile));
      coverage.get(key).occurrences += 1;
    }
  }

  return coverage;
};

const getEndpointFromAssertion = (assertion) => {
  const titles = [...(assertion.ancestorTitles || []), assertion.title];
  const endpointTitle = titles.find((title) => /^[A-Z]+\s+\/api\/v1\//.test(title));
  if (!endpointTitle) {
    return null;
  }

  const [, method, endpointPath] = endpointTitle.match(/^([A-Z]+)\s+(\/api\/v1\/.*)$/) || [];
  if (!method || !endpointPath) {
    return null;
  }

  return `${method} ${normalizePath(endpointPath)}`;
};

const buildAssertionSummary = (jestResults) => {
  const summary = new Map();

  for (const suite of jestResults.testResults || []) {
    for (const assertion of suite.assertionResults || []) {
      const endpointKey = getEndpointFromAssertion(assertion);
      if (!endpointKey) {
        continue;
      }

      if (!summary.has(endpointKey)) {
        summary.set(endpointKey, {
          total: 0,
          passed: 0,
          failed: 0,
          pending: 0,
          suites: new Set(),
          failures: [],
        });
      }

      const item = summary.get(endpointKey);
      item.total += 1;
      item.suites.add(path.relative(projectRoot, suite.name));

      if (assertion.status === 'passed') {
        item.passed += 1;
      } else if (assertion.status === 'failed') {
        item.failed += 1;
        item.failures.push({
          title: assertion.title,
          message: (assertion.failureMessages || []).join('\n').slice(0, 1200),
        });
      } else {
        item.pending += 1;
      }
    }
  }

  return summary;
};

const buildEndpointReport = () => {
  ensureReportsDir();

  if (!fs.existsSync(jestResultsPath)) {
    throw new Error(`Missing Jest results file at ${jestResultsPath}`);
  }

  const jestResults = readJson(jestResultsPath);
  const routeInventory = loadRouteInventory();
  const endpointCoverage = loadTestEndpointIndex();
  const assertionSummary = buildAssertionSummary(jestResults);

  const routeKeys = new Set(routeInventory.map((endpoint) => `${endpoint.method} ${endpoint.path}`));
  const allKeys = new Set([
    ...routeKeys,
    ...endpointCoverage.keys(),
    ...assertionSummary.keys(),
  ]);

  const endpointResults = [...allKeys]
    .sort()
    .map((key) => {
      const [method, ...pathParts] = key.split(' ');
      const endpointPath = pathParts.join(' ');
      const routeMatches = routeInventory.filter((endpoint) => endpoint.method === method && endpoint.path === endpointPath);
      const tests = endpointCoverage.get(key);
      const assertions = assertionSummary.get(key);

      return {
        key,
        method,
        path: endpointPath,
        implemented: routeMatches.length > 0,
        modules: [...new Set(routeMatches.map((route) => route.module))],
        testFiles: tests ? [...tests.files] : [],
        describedTestBlocks: tests?.occurrences || 0,
        assertions: assertions
          ? {
              total: assertions.total,
              passed: assertions.passed,
              failed: assertions.failed,
              pending: assertions.pending,
              suiteFiles: [...assertions.suites],
              failures: assertions.failures,
            }
          : null,
        status: routeMatches.length === 0 && (tests || assertions)
          ? 'test-target-missing-route'
          : !assertions
            ? routeMatches.length > 0
              ? 'untested'
              : 'not-run-or-undetected'
            : assertions.failed > 0 && assertions.passed > 0
              ? 'partial'
              : assertions.failed > 0
                ? 'failing'
                : assertions.passed > 0
                  ? 'passing'
                  : 'no-passing-assertions',
      };
    });

  const summary = {
    generatedAt: new Date().toISOString(),
    jest: {
      totalSuites: jestResults.numTotalTestSuites,
      passedSuites: jestResults.numPassedTestSuites,
      failedSuites: jestResults.numFailedTestSuites,
      totalTests: jestResults.numTotalTests,
      passedTests: jestResults.numPassedTests,
      failedTests: jestResults.numFailedTests,
      pendingTests: jestResults.numPendingTests,
      runtimeMs: jestResults.testResults.reduce((sum, suite) => sum + (suite.endTime - suite.startTime), 0),
      success: jestResults.success,
    },
    endpoints: {
      implemented: endpointResults.filter((item) => item.implemented).length,
      passing: endpointResults.filter((item) => item.status === 'passing').length,
      partial: endpointResults.filter((item) => item.status === 'partial').length,
      failing: endpointResults.filter((item) => item.status === 'failing').length,
      untested: endpointResults.filter((item) => item.status === 'untested').length,
      missingRouteTargets: endpointResults.filter((item) => item.status === 'test-target-missing-route').length,
    },
  };

  const payload = { summary, endpointResults };
  fs.writeFileSync(reportJsonPath, JSON.stringify(payload, null, 2));

  const mdLines = [
    '# API End-to-End Test Report',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    '## Jest Summary',
    '',
    `- Test suites: ${summary.jest.passedSuites} passed / ${summary.jest.failedSuites} failed / ${summary.jest.totalSuites} total`,
    `- Tests: ${summary.jest.passedTests} passed / ${summary.jest.failedTests} failed / ${summary.jest.totalTests} total`,
    `- Overall result: ${summary.jest.success ? 'PASS' : 'FAIL'}`,
    '',
    '## Endpoint Summary',
    '',
    `- Implemented endpoints discovered: ${summary.endpoints.implemented}`,
    `- Passing endpoints: ${summary.endpoints.passing}`,
    `- Partially passing endpoints: ${summary.endpoints.partial}`,
    `- Failing endpoints: ${summary.endpoints.failing}`,
    `- Untested endpoints: ${summary.endpoints.untested}`,
    `- Test targets with no matching route: ${summary.endpoints.missingRouteTargets}`,
    '',
    '## Failing Endpoints',
    '',
  ];

  const failingEndpoints = endpointResults.filter((item) => item.status === 'failing');
  if (failingEndpoints.length === 0) {
    mdLines.push('- None');
  } else {
    for (const endpoint of failingEndpoints) {
      mdLines.push(`### ${endpoint.key}`);
      mdLines.push(`- Modules: ${endpoint.modules.join(', ') || 'unknown'}`);
      mdLines.push(`- Test files: ${endpoint.testFiles.join(', ') || 'none'}`);
      mdLines.push(
        `- Assertions: ${endpoint.assertions.passed} passed / ${endpoint.assertions.failed} failed / ${endpoint.assertions.total} total`
      );
      for (const failure of endpoint.assertions.failures.slice(0, 3)) {
        const compactMessage = failure.message.split('\n').slice(0, 8).join(' ').trim();
        mdLines.push(`- Failure: ${failure.title} :: ${compactMessage}`);
      }
      mdLines.push('');
    }
  }

  mdLines.push('## Passing Endpoints', '');
  const passingEndpoints = endpointResults.filter((item) => item.status === 'passing');
  if (passingEndpoints.length === 0) {
    mdLines.push('- None');
  } else {
    for (const endpoint of passingEndpoints) {
      mdLines.push(
        `- ${endpoint.key} (${endpoint.assertions.passed}/${endpoint.assertions.total} assertions passed)`
      );
    }
  }

  mdLines.push('', '## Partially Passing Endpoints', '');
  const partialEndpoints = endpointResults.filter((item) => item.status === 'partial');
  if (partialEndpoints.length === 0) {
    mdLines.push('- None');
  } else {
    for (const endpoint of partialEndpoints) {
      mdLines.push(
        `- ${endpoint.key} (${endpoint.assertions.passed}/${endpoint.assertions.total} assertions passed, ${endpoint.assertions.failed} failed)`
      );
    }
  }

  mdLines.push('', '## Untested Implemented Endpoints', '');
  const untestedEndpoints = endpointResults.filter((item) => item.status === 'untested');
  if (untestedEndpoints.length === 0) {
    mdLines.push('- None');
  } else {
    for (const endpoint of untestedEndpoints) {
      mdLines.push(`- ${endpoint.key}`);
    }
  }

  mdLines.push('', '## Test Targets Without Matching Routes', '');
  const missingRouteTargets = endpointResults.filter((item) => item.status === 'test-target-missing-route');
  if (missingRouteTargets.length === 0) {
    mdLines.push('- None');
  } else {
    for (const endpoint of missingRouteTargets) {
      mdLines.push(`- ${endpoint.key} (from ${endpoint.testFiles.join(', ') || 'test suite'})`);
    }
  }

  fs.writeFileSync(reportMdPath, `${mdLines.join('\n')}\n`);

  console.log(`API test report written to ${reportMdPath}`);
};

buildEndpointReport();
