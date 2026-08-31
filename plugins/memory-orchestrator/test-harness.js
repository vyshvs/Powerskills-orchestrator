import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { writeFile, readFile, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Test Harness for comprehensive testing with fixtures and utilities
 */
class TestHarness {
  constructor(config = {}) {
    this.config = {
      testDir: config.testDir || '.memory/test-harness',
      fixturesDir: config.fixturesDir || 'test/fixtures',
      timeout: config.timeout || 30000,
      coverage: config.coverage !== false,
      parallel: config.parallel || false,
      ...config
    };

    this.fixtures = new Map();
    this.mocks = new Map();
    this.teardownCallbacks = [];
  }

  /**
   * Initialize test harness
   */
  async initialize() {
    await this.ensureDirectory(this.config.testDir);
    await this.ensureDirectory(this.config.fixturesDir);
  }

  /**
   * Clean up test environment
   */
  async cleanup() {
    // Run all teardown callbacks
    for (const callback of this.teardownCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('Teardown error:', error);
      }
    }

    // Clean test directory
    if (existsSync(this.config.testDir)) {
      await rm(this.config.testDir, { recursive: true, force: true });
    }

    // Clear mocks
    this.mocks.clear();
    this.fixtures.clear();
    this.teardownCallbacks = [];
  }

  /**
   * Register a teardown callback
   */
  onTeardown(callback) {
    this.teardownCallbacks.push(callback);
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectory(dirPath) {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Create a test fixture
   */
  async createFixture(name, data) {
    const fixturePath = path.join(this.config.fixturesDir, `${name}.json`);
    await writeFile(fixturePath, JSON.stringify(data, null, 2), 'utf8');
    this.fixtures.set(name, fixturePath);
    return fixturePath;
  }

  /**
   * Load a test fixture
   */
  async loadFixture(name) {
    const fixturePath = this.fixtures.get(name) ||
                       path.join(this.config.fixturesDir, `${name}.json`);

    if (!existsSync(fixturePath)) {
      throw new Error(`Fixture not found: ${name}`);
    }

    const content = await readFile(fixturePath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Create a temporary file
   */
  async createTempFile(name, content) {
    const tempPath = path.join(this.config.testDir, name);
    await writeFile(tempPath, content, 'utf8');
    return tempPath;
  }

  /**
   * Create a temporary directory
   */
  async createTempDir(name) {
    const tempPath = path.join(this.config.testDir, name);
    await this.ensureDirectory(tempPath);
    return tempPath;
  }

  /**
   * Mock a function
   */
  mockFunction(name, implementation) {
    const mockFn = mock.fn(implementation);
    this.mocks.set(name, mockFn);
    return mockFn;
  }

  /**
   * Get mock call count
   */
  getMockCallCount(name) {
    const mockFn = this.mocks.get(name);
    return mockFn ? mockFn.mock.calls.length : 0;
  }

  /**
   * Get mock calls
   */
  getMockCalls(name) {
    const mockFn = this.mocks.get(name);
    return mockFn ? mockFn.mock.calls : [];
  }

  /**
   * Assert mock was called
   */
  assertMockCalled(name, times = null) {
    const callCount = this.getMockCallCount(name);

    if (times !== null) {
      assert.strictEqual(callCount, times,
        `Expected ${name} to be called ${times} times, but was called ${callCount} times`);
    } else {
      assert(callCount > 0, `Expected ${name} to be called at least once`);
    }
  }

  /**
   * Assert mock was called with specific arguments
   */
  assertMockCalledWith(name, expectedArgs) {
    const calls = this.getMockCalls(name);
    const found = calls.some(call =>
      JSON.stringify(call.arguments) === JSON.stringify(expectedArgs)
    );

    assert(found, `Expected ${name} to be called with ${JSON.stringify(expectedArgs)}`);
  }

  /**
   * Run a command and capture output
   */
  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        shell: true,
        cwd: options.cwd || process.cwd(),
        env: options.env || process.env
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      proc.on('error', (error) => {
        reject(error);
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          proc.kill();
          reject(new Error(`Command timeout after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  /**
   * Assert command succeeds
   */
  async assertCommandSucceeds(command, args = [], options = {}) {
    const result = await this.runCommand(command, args, options);

    assert.strictEqual(result.code, 0,
      `Expected command to succeed but got exit code ${result.code}\n${result.stderr}`);

    return result;
  }

  /**
   * Assert command fails
   */
  async assertCommandFails(command, args = [], options = {}) {
    const result = await this.runCommand(command, args, options);

    assert.notStrictEqual(result.code, 0,
      `Expected command to fail but it succeeded`);

    return result;
  }

  /**
   * Assert file exists
   */
  assertFileExists(filePath) {
    assert(existsSync(filePath), `Expected file to exist: ${filePath}`);
  }

  /**
   * Assert file does not exist
   */
  assertFileNotExists(filePath) {
    assert(!existsSync(filePath), `Expected file to not exist: ${filePath}`);
  }

  /**
   * Assert file contains text
   */
  async assertFileContains(filePath, text) {
    this.assertFileExists(filePath);
    const content = await readFile(filePath, 'utf8');
    assert(content.includes(text),
      `Expected file ${filePath} to contain "${text}"`);
  }

  /**
   * Assert directory exists
   */
  assertDirectoryExists(dirPath) {
    assert(existsSync(dirPath), `Expected directory to exist: ${dirPath}`);
  }

  /**
   * Measure execution time
   */
  async measureTime(fn) {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  }

  /**
   * Assert execution time is within range
   */
  async assertExecutionTime(fn, maxMs) {
    const { result, duration } = await this.measureTime(fn);

    assert(duration <= maxMs,
      `Execution took ${duration}ms, expected <= ${maxMs}ms`);

    return result;
  }

  /**
   * Run tests in parallel
   */
  async runParallel(tests) {
    const results = await Promise.allSettled(
      tests.map(test => test())
    );

    const failures = results.filter(r => r.status === 'rejected');

    if (failures.length > 0) {
      const errors = failures.map(f => f.reason.message).join('\n');
      throw new Error(`${failures.length} test(s) failed:\n${errors}`);
    }

    return results.map(r => r.value);
  }

  /**
   * Generate test report
   */
  generateReport(results) {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const skipped = results.filter(r => r.skipped).length;

    const passRate = total > 0 ? (passed / total * 100).toFixed(2) : 0;

    return {
      total,
      passed,
      failed,
      skipped,
      passRate: `${passRate}%`,
      duration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
    };
  }

  /**
   * Create a test spy
   */
  createSpy(name = 'spy') {
    const calls = [];

    const spy = (...args) => {
      calls.push({
        arguments: args,
        timestamp: Date.now()
      });
    };

    spy.calls = calls;
    spy.callCount = () => calls.length;
    spy.calledWith = (...expectedArgs) => {
      return calls.some(call =>
        JSON.stringify(call.arguments) === JSON.stringify(expectedArgs)
      );
    };
    spy.reset = () => {
      calls.length = 0;
    };

    this.mocks.set(name, spy);
    return spy;
  }

  /**
   * Wait for condition
   */
  async waitFor(condition, options = {}) {
    const timeout = options.timeout || 5000;
    const interval = options.interval || 100;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Condition not met within timeout');
  }

  /**
   * Snapshot testing
   */
  async snapshot(name, data) {
    const snapshotPath = path.join(this.config.testDir, 'snapshots', `${name}.json`);
    await this.ensureDirectory(path.dirname(snapshotPath));

    if (existsSync(snapshotPath)) {
      // Compare with existing snapshot
      const existing = JSON.parse(await readFile(snapshotPath, 'utf8'));
      assert.deepStrictEqual(data, existing,
        `Snapshot mismatch for ${name}. Run with UPDATE_SNAPSHOTS=1 to update.`);
    } else {
      // Create new snapshot
      await writeFile(snapshotPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`📸 Created snapshot: ${name}`);
    }
  }
}

/**
 * Coverage tracker
 */
class CoverageTracker {
  constructor() {
    this.coverage = {
      files: new Map(),
      lines: new Map(),
      functions: new Map(),
      branches: new Map()
    };
  }

  /**
   * Track file coverage
   */
  trackFile(filePath, lines, functions, branches) {
    this.coverage.files.set(filePath, {
      lines: { covered: 0, total: lines },
      functions: { covered: 0, total: functions },
      branches: { covered: 0, total: branches }
    });
  }

  /**
   * Mark line as covered
   */
  markLineCovered(filePath, lineNumber) {
    const file = this.coverage.files.get(filePath);
    if (file) {
      file.lines.covered++;
    }
  }

  /**
   * Get coverage report
   */
  getReport() {
    let totalLines = 0;
    let coveredLines = 0;

    for (const [filePath, data] of this.coverage.files) {
      totalLines += data.lines.total;
      coveredLines += data.lines.covered;
    }

    const percentage = totalLines > 0 ? (coveredLines / totalLines * 100).toFixed(2) : 0;

    return {
      lines: { covered: coveredLines, total: totalLines },
      percentage: `${percentage}%`,
      files: Array.from(this.coverage.files.entries()).map(([file, data]) => ({
        file,
        coverage: ((data.lines.covered / data.lines.total) * 100).toFixed(2) + '%'
      }))
    };
  }
}

export { TestHarness, CoverageTracker };
