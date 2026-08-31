import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'fs';
import { TestHarness, CoverageTracker } from './test-harness.js';

const TEST_DIR = '.memory/test-harness-tests';

describe('TestHarness', () => {
  let harness;

  beforeEach(async () => {
    harness = new TestHarness({ testDir: TEST_DIR });
    await harness.initialize();
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  it('should initialize test directories', async () => {
    assert.strictEqual(existsSync(TEST_DIR), true);
  });

  it('should create and load fixtures', async () => {
    const data = { test: 'data', value: 42 };
    await harness.createFixture('test-fixture', data);

    const loaded = await harness.loadFixture('test-fixture');

    assert.deepStrictEqual(loaded, data);
  });

  it('should create temporary files', async () => {
    const content = 'test content';
    const filePath = await harness.createTempFile('test.txt', content);

    harness.assertFileExists(filePath);
  });

  it('should create temporary directories', async () => {
    const dirPath = await harness.createTempDir('test-dir');

    harness.assertDirectoryExists(dirPath);
  });

  it('should mock functions', async () => {
    const mockFn = harness.mockFunction('testFn', (a, b) => a + b);

    const result = mockFn(2, 3);

    assert.strictEqual(result, 5);
    harness.assertMockCalled('testFn', 1);
  });

  it('should track mock calls', async () => {
    const mockFn = harness.mockFunction('testFn', () => 'result');

    mockFn('arg1', 'arg2');
    mockFn('arg3', 'arg4');

    assert.strictEqual(harness.getMockCallCount('testFn'), 2);
    harness.assertMockCalledWith('testFn', ['arg1', 'arg2']);
  });

  it('should run commands', async () => {
    const result = await harness.runCommand('echo', ['hello']);

    assert.strictEqual(result.success, true);
    assert(result.stdout.includes('hello'));
  });

  it('should assert command succeeds', async () => {
    const result = await harness.assertCommandSucceeds('echo', ['test']);

    assert(result.stdout.includes('test'));
  });

  it('should assert command fails', async () => {
    await harness.assertCommandFails('exit', ['1']);
  });

  it('should assert file contains text', async () => {
    const filePath = await harness.createTempFile('test.txt', 'hello world');

    await harness.assertFileContains(filePath, 'hello');
  });

  it('should measure execution time', async () => {
    const { result, duration } = await harness.measureTime(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'done';
    });

    assert.strictEqual(result, 'done');
    assert(duration >= 50);
  });

  it('should assert execution time', async () => {
    await harness.assertExecutionTime(async () => {
      return 'fast';
    }, 100);
  });

  it('should run tests in parallel', async () => {
    const results = await harness.runParallel([
      async () => ({ passed: true, name: 'test1' }),
      async () => ({ passed: true, name: 'test2' }),
      async () => ({ passed: true, name: 'test3' })
    ]);

    assert.strictEqual(results.length, 3);
    assert(results.every(r => r.passed));
  });

  it('should generate test report', () => {
    const results = [
      { passed: true, duration: 10 },
      { passed: true, duration: 20 },
      { passed: false, duration: 15 },
      { passed: true, skipped: true, duration: 0 }
    ];

    const report = harness.generateReport(results);

    assert.strictEqual(report.total, 4);
    assert.strictEqual(report.passed, 3);
    assert.strictEqual(report.failed, 1);
    assert.strictEqual(report.duration, 45);
  });

  it('should create spies', () => {
    const spy = harness.createSpy('mySpy');

    spy('arg1', 'arg2');
    spy('arg3', 'arg4');

    assert.strictEqual(spy.callCount(), 2);
    assert.strictEqual(spy.calledWith('arg1', 'arg2'), true);
    assert.strictEqual(spy.calledWith('arg5', 'arg6'), false);
  });

  it('should reset spies', () => {
    const spy = harness.createSpy('resetSpy');

    spy('test');
    assert.strictEqual(spy.callCount(), 1);

    spy.reset();
    assert.strictEqual(spy.callCount(), 0);
  });

  it('should wait for condition', async () => {
    let ready = false;
    setTimeout(() => { ready = true; }, 100);

    await harness.waitFor(() => ready, { timeout: 500, interval: 50 });

    assert.strictEqual(ready, true);
  });

  it('should register teardown callbacks', async () => {
    let cleaned = false;

    harness.onTeardown(async () => {
      cleaned = true;
    });

    await harness.cleanup();

    assert.strictEqual(cleaned, true);
  });
});

describe('CoverageTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new CoverageTracker();
  });

  it('should track file coverage', () => {
    tracker.trackFile('test.js', 100, 10, 20);

    const report = tracker.getReport();

    assert.strictEqual(report.files.length, 1);
    assert.strictEqual(report.lines.total, 100);
  });

  it('should mark lines as covered', () => {
    tracker.trackFile('test.js', 100, 10, 20);
    tracker.markLineCovered('test.js', 1);
    tracker.markLineCovered('test.js', 2);

    const report = tracker.getReport();

    assert.strictEqual(report.lines.covered, 2);
  });

  it('should calculate coverage percentage', () => {
    tracker.trackFile('test.js', 100, 10, 20);

    for (let i = 1; i <= 80; i++) {
      tracker.markLineCovered('test.js', i);
    }

    const report = tracker.getReport();

    assert.strictEqual(report.percentage, '80.00%');
  });

  it('should track multiple files', () => {
    tracker.trackFile('file1.js', 100, 10, 20);
    tracker.trackFile('file2.js', 50, 5, 10);

    const report = tracker.getReport();

    assert.strictEqual(report.files.length, 2);
    assert.strictEqual(report.lines.total, 150);
  });
});

console.log('🧪 Running test harness tests...\n');
