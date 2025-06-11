#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Survey Server Backend
 * 
 * This script orchestrates the execution of all test suites:
 * - Unit tests for services and utilities
 * - Integration tests for API endpoints
 * - Middleware tests
 * - Mock service validation
 * - Coverage reporting
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  coverageThreshold: 70,
  testEnvironment: 'test',
  maxWorkers: 4,
  verbose: process.env.VERBOSE_TESTS === 'true',
  bail: process.env.BAIL_ON_FAILURE === 'true'
};

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Print colored console output
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print test section header
 */
function printHeader(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(` ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

/**
 * Print test results summary
 */
function printSummary(results) {
  log('\n' + '='.repeat(60), 'green');
  log(' TEST RESULTS SUMMARY', 'bright');
  log('='.repeat(60), 'green');
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${status} ${result.name}`, color);
    
    if (result.coverage && result.coverage.total) {
      const coverageColor = result.coverage.total >= TEST_CONFIG.coverageThreshold ? 'green' : 'yellow';
      log(`   Coverage: ${result.coverage.total}%`, coverageColor);
    }
    
    if (!result.success && result.error) {
      log(`   Error: ${result.error}`, 'red');
    }
  });
  
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  const overallStatus = passedTests === totalTests ? 'PASSED' : 'FAILED';
  const overallColor = passedTests === totalTests ? 'green' : 'red';
  
  log(`\nOverall Status: ${overallStatus} (${passedTests}/${totalTests})`, overallColor);
}

/**
 * Execute Jest command with specific configuration
 */
function runJestCommand(command, options = {}) {
  const baseCommand = 'npx jest';
  const configFile = path.join(__dirname, '..', 'jest.config.js');
  
  let fullCommand = `${baseCommand} --config="${configFile}"`;
  
  if (options.testMatch) {
    fullCommand += ` --testMatch="${options.testMatch}"`;
  }
  
  if (options.coverage) {
    fullCommand += ' --coverage';
  }
  
  if (options.verbose || TEST_CONFIG.verbose) {
    fullCommand += ' --verbose';
  }
  
  if (options.bail || TEST_CONFIG.bail) {
    fullCommand += ' --bail';
  }
  
  if (options.maxWorkers) {
    fullCommand += ` --maxWorkers=${options.maxWorkers}`;
  }
  
  if (command) {
    fullCommand += ` ${command}`;
  }
  
  return fullCommand;
}

/**
 * Parse Jest output to extract coverage information
 */
function parseCoverage(output) {
  try {
    const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Run a specific test suite
 */
async function runTestSuite(name, command, options = {}) {
  log(`\nRunning ${name}...`, 'blue');
  
  try {
    const startTime = Date.now();
    const output = execSync(command, {
      encoding: 'utf8',
      timeout: TEST_CONFIG.timeout * 1000,
      stdio: 'pipe'
    });
    const duration = Date.now() - startTime;
    
    const coverage = options.coverage ? parseCoverage(output) : null;
    
    log(`✅ ${name} completed in ${duration}ms`, 'green');
    
    if (coverage !== null) {
      const coverageColor = coverage >= TEST_CONFIG.coverageThreshold ? 'green' : 'yellow';
      log(`   Coverage: ${coverage}%`, coverageColor);
    }
    
    return {
      name,
      success: true,
      duration,
      coverage: coverage ? { total: coverage } : null,
      output
    };
    
  } catch (error) {
    log(`❌ ${name} failed`, 'red');
    log(`   Error: ${error.message}`, 'red');
    
    return {
      name,
      success: false,
      error: error.message,
      output: error.stdout || error.stderr || ''
    };
  }
}

/**
 * Check test environment setup
 */
function checkEnvironment() {
  printHeader('Checking Test Environment');
  
  // Check required files
  const requiredFiles = [
    'jest.config.js',
    'tests/setup.js',
    'tests/env.setup.js',
    'tests/mocks/llmService.mock.js',
    'tests/utils/testHelpers.js'
  ];
  
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    log('❌ Missing required test files:', 'red');
    missingFiles.forEach(file => log(`   - ${file}`, 'red'));
    return false;
  }
  
  // Check environment variables
  const requiredEnvVars = ['NODE_ENV', 'USE_MOCK_LLM'];
  const missingEnvVars = [];
  
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      missingEnvVars.push(envVar);
    }
  });
  
  if (missingEnvVars.length > 0) {
    log('⚠️  Missing environment variables:', 'yellow');
    missingEnvVars.forEach(envVar => log(`   - ${envVar}`, 'yellow'));
  }
  
  log('✅ Test environment setup is ready', 'green');
  log(`   Node Environment: ${process.env.NODE_ENV || 'not set'}`, 'blue');
  log(`   Mock LLM: ${process.env.USE_MOCK_LLM || 'not set'}`, 'blue');
  log(`   Test Timeout: ${TEST_CONFIG.timeout}ms`, 'blue');
  log(`   Coverage Threshold: ${TEST_CONFIG.coverageThreshold}%`, 'blue');
  
  return true;
}

/**
 * Run all test suites
 */
async function runAllTests() {
  const testResults = [];
  
  // Environment check
  if (!checkEnvironment()) {
    log('❌ Environment check failed. Aborting tests.', 'red');
    process.exit(1);
  }
  
  // Test suites configuration
  const testSuites = [
    {
      name: 'Authentication Tests',
      command: runJestCommand('tests/auth.test.js', { coverage: false }),
      critical: true
    },
    {
      name: 'Survey API Tests',
      command: runJestCommand('tests/survey.test.js', { coverage: false }),
      critical: true
    },
    {
      name: 'AI Service Tests',
      command: runJestCommand('tests/ai.test.js', { coverage: false }),
      critical: true
    },
    {
      name: 'User Service Unit Tests',
      command: runJestCommand('tests/services/userService.test.js', { coverage: false }),
      critical: false
    },
    {
      name: 'Survey Service Unit Tests',
      command: runJestCommand('tests/services/surveyService.test.js', { coverage: false }),
      critical: false
    },
    {
      name: 'Auth Middleware Tests',
      command: runJestCommand('tests/middleware/auth.test.js', { coverage: false }),
      critical: true
    },
    {
      name: 'LLM Integration Tests',
      command: runJestCommand('tests/integration/llmService.test.js', { coverage: false }),
      critical: false
    }
  ];
  
  // Run individual test suites
  for (const suite of testSuites) {
    const result = await runTestSuite(suite.name, suite.command, {
      coverage: false
    });
    
    testResults.push({
      ...result,
      critical: suite.critical
    });
    
    // Bail early if critical test fails and bail is enabled
    if (!result.success && suite.critical && TEST_CONFIG.bail) {
      log(`❌ Critical test suite "${suite.name}" failed. Stopping execution.`, 'red');
      break;
    }
  }
  
  // Run full coverage test
  printHeader('Running Full Test Suite with Coverage');
  const coverageResult = await runTestSuite(
    'Full Coverage Analysis',
    runJestCommand('', { 
      coverage: true,
      testMatch: '**/tests/**/*.test.js',
      maxWorkers: TEST_CONFIG.maxWorkers
    }),
    { coverage: true }
  );
  
  testResults.push(coverageResult);
  
  return testResults;
}

/**
 * Generate coverage report
 */
function generateCoverageReport(results) {
  const coverageResult = results.find(r => r.name === 'Full Coverage Analysis');
  
  if (!coverageResult || !coverageResult.coverage) {
    log('\n⚠️  No coverage data available', 'yellow');
    return;
  }
  
  printHeader('Coverage Report');
  
  const coverage = coverageResult.coverage.total;
  const coverageColor = coverage >= TEST_CONFIG.coverageThreshold ? 'green' : 'red';
  const status = coverage >= TEST_CONFIG.coverageThreshold ? 'PASSED' : 'FAILED';
  
  log(`Overall Coverage: ${coverage}%`, coverageColor);
  log(`Coverage Threshold: ${TEST_CONFIG.coverageThreshold}%`, 'blue');
  log(`Status: ${status}`, coverageColor);
  
  // Check if HTML coverage report exists
  const htmlReportPath = path.join(__dirname, '..', 'coverage', 'lcov-report', 'index.html');
  if (fs.existsSync(htmlReportPath)) {
    log(`\n📊 Detailed HTML report available at: ${htmlReportPath}`, 'cyan');
  }
}

/**
 * Main execution function
 */
async function main() {
  log('Survey Server Backend Test Runner', 'bright');
  log('=====================================', 'bright');
  
  const startTime = Date.now();
  
  try {
    const results = await runAllTests();
    const totalDuration = Date.now() - startTime;
    
    // Print results
    printSummary(results);
    generateCoverageReport(results);
    
    log(`\n⏱️  Total execution time: ${totalDuration}ms`, 'blue');
    
    // Determine exit code
    const criticalFailures = results.filter(r => r.critical && !r.success).length;
    const coverageFailure = results.some(r => 
      r.coverage && r.coverage.total < TEST_CONFIG.coverageThreshold
    );
    
    if (criticalFailures > 0) {
      log(`\n❌ ${criticalFailures} critical test suite(s) failed`, 'red');
      process.exit(1);
    }
    
    if (coverageFailure) {
      log(`\n⚠️  Coverage below threshold (${TEST_CONFIG.coverageThreshold}%)`, 'yellow');
      if (process.env.STRICT_COVERAGE === 'true') {
        process.exit(1);
      }
    }
    
    log('\n✅ All tests completed successfully!', 'green');
    process.exit(0);
    
  } catch (error) {
    log(`\n❌ Test runner failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n\n⚠️  Test execution interrupted by user', 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n\n⚠️  Test execution terminated', 'yellow');
  process.exit(143);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runAllTests,
  runTestSuite,
  checkEnvironment,
  TEST_CONFIG
}; 