/**
 * Test Suite for Qodo-Integrated Memory Orchestrator
 * Tests all functionality including Qodo integration
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import MemoryOrchestrator from './index-improved.js';
import QodoIntegration from './qodo-integration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_MEMORY_DIR = join(__dirname, '.test-memory');

describe('Memory Orchestrator with Qodo Integration', () => {
  let orchestrator;

  before(async () => {
    // Clean up any existing test directory
    try {
      await fs.rm(TEST_MEMORY_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore if doesn't exist
    }

    orchestrator = new MemoryOrchestrator({
      memoryDir: TEST_MEMORY_DIR,
      platform: 'claude',
      qodoEnabled: true,
      qodoAutoFix: true,
      testCommand: 'echo "Tests passed"'
    });

    await orchestrator.initialize();
  });

  after(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_MEMORY_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  describe('Initialization', () => {
    it('should initialize memory directory', async () => {
      const stats = await fs.stat(TEST_MEMORY_DIR);
      assert.ok(stats.isDirectory(), 'Memory directory should exist');
    });

    it('should create phase tracking file', async () => {
      const trackingFile = join(TEST_MEMORY_DIR, 'phase-tracking.json');
      const exists = await fs.access(trackingFile).then(() => true).catch(() => false);
      assert.ok(exists, 'Phase tracking file should exist');
    });
  });

  describe('Phase Management', () => {
    it('should start a new phase', async () => {
      const phase = await orchestrator.startPhase('Test Phase', 'Testing phase management');
      assert.strictEqual(phase.name, 'Test Phase');
      assert.strictEqual(phase.status, 'in-progress');
      assert.ok(phase.startTime);
    });

    it('should prevent starting phase when one is active', async () => {
      await assert.rejects(
        async () => await orchestrator.startPhase('Another Phase'),
        { code: 'PHASE_CONFLICT' }
      );
    });

    it('should track file modifications', () => {
      orchestrator.trackFileModification('test-file.js');
      orchestrator.trackFileModification('another-file.js');
      const modified = orchestrator.getModifiedFiles();
      assert.strictEqual(modified.length, 2);
      assert.ok(modified.includes('test-file.js'));
    });

    it('should complete phase with quality checks', async () => {
      const completed = await orchestrator.completePhase('Phase completed successfully');
      assert.strictEqual(completed.status, 'completed');
      assert.ok(completed.endTime);
      assert.ok(completed.qualityCheck);
    });

    it('should allow starting new phase after completion', async () => {
      const phase = await orchestrator.startPhase('Second Phase');
      assert.strictEqual(phase.name, 'Second Phase');
      await orchestrator.completePhase('Done');
    });
  });

  describe('Memory Operations', () => {
    it('should write memory entry', async () => {
      await orchestrator.startPhase('Memory Test');
      const entry = await orchestrator.writeMemory('test-event', {
        data: 'test data',
        value: 123
      });

      assert.strictEqual(entry.type, 'test-event');
      assert.strictEqual(entry.data.data, 'test data');
      assert.ok(entry.timestamp);
    });

    it('should read memory entries', async () => {
      const memories = await orchestrator.readMemory();
      assert.ok(memories.length > 0);
    });

    it('should filter memory by type', async () => {
      const memories = await orchestrator.readMemory({ type: 'test-event' });
      assert.ok(memories.length > 0);
      assert.strictEqual(memories[0].type, 'test-event');
    });

    it('should filter memory by phase', async () => {
      const memories = await orchestrator.readMemory({ phase: 'Memory Test' });
      assert.ok(memories.length > 0);
    });

    await orchestrator.completePhase('Memory test done');
  });

  describe('Sub-Agent Management', () => {
    it('should create sub-agent', async () => {
      await orchestrator.startPhase('Agent Test');
      const agent = await orchestrator.createSubAgent('test-agent', {
        role: 'tester'
      });

      assert.strictEqual(agent.name, 'test-agent');
      assert.strictEqual(agent.status, 'active');
    });

    it('should prevent duplicate sub-agent', async () => {
      await assert.rejects(
        async () => await orchestrator.createSubAgent('test-agent'),
        { code: 'DUPLICATE_AGENT' }
      );
    });

    it('should complete sub-agent', async () => {
      const completed = await orchestrator.completeSubAgent('test-agent', {
        tasksCompleted: 5
      });

      assert.strictEqual(completed.status, 'completed');
      assert.ok(completed.endTime);
    });

    await orchestrator.completePhase('Agent test done');
  });

  describe('Scaffolding Management', () => {
    it('should create scaffolding', async () => {
      await orchestrator.startPhase('Scaffold Test');
      await orchestrator.createScaffolding('test-scaffold', {
        structure: 'test'
      });

      assert.ok(orchestrator.scaffolding.has('test-scaffold'));
    });

    it('should prevent duplicate scaffolding', async () => {
      await assert.rejects(
        async () => await orchestrator.createScaffolding('test-scaffold', {}),
        { code: 'DUPLICATE_SCAFFOLDING' }
      );
    });

    it('should tear down scaffolding', async () => {
      await orchestrator.tearDownScaffolding('test-scaffold');
      assert.ok(!orchestrator.scaffolding.has('test-scaffold'));
    });

    await orchestrator.completePhase('Scaffold test done');
  });

  describe('Validation', () => {
    it('should reject invalid phase name', async () => {
      await assert.rejects(
        async () => await orchestrator.startPhase(''),
        { name: 'ValidationError' }
      );
    });

    it('should reject invalid memory type', async () => {
      await orchestrator.startPhase('Validation Test');
      await assert.rejects(
        async () => await orchestrator.writeMemory('invalid type!', {}),
        { name: 'ValidationError' }
      );
      await orchestrator.completePhase('Done');
    });

    it('should reject invalid platform', () => {
      assert.throws(
        () => new MemoryOrchestrator({ platform: 'invalid' }),
        { name: 'ValidationError' }
      );
    });
  });

  describe('Qodo Integration', () => {
    let qodo;

    before(() => {
      qodo = new QodoIntegration({
        enabled: true,
        qodoCommand: 'echo',
        testCommand: 'echo "test passed"'
      });
    });

    it('should check Qodo availability', async () => {
      const available = await qodo.isQodoAvailable();
      assert.strictEqual(typeof available, 'boolean');
    });

    it('should run quality check', async () => {
      const results = await qodo.runQualityCheck([]);
      assert.ok(results);
      assert.ok(results.review);
      assert.ok(results.tests);
      assert.strictEqual(typeof results.passed, 'boolean');
    });

    it('should generate quality report', async () => {
      const results = {
        passed: true,
        timestamp: new Date().toISOString(),
        review: { skipped: true },
        tests: { skipped: true }
      };

      const reportPath = join(TEST_MEMORY_DIR, 'test-quality-report.json');
      await qodo.generateQualityReport(results, reportPath);

      const exists = await fs.access(reportPath).then(() => true).catch(() => false);
      assert.ok(exists, 'Quality report should be created');
    });
  });

  describe('Complete Workflow', () => {
    it('should run complete workflow with quality checks', async () => {
      // Phase 1: Setup
      await orchestrator.startPhase('Setup', 'Initialize project');
      await orchestrator.createScaffolding('project', { dirs: ['src', 'tests'] });
      orchestrator.trackFileModifications(['src/index.js', 'tests/test.js']);
      await orchestrator.completePhase('Setup complete');

      // Phase 2: Development
      await orchestrator.startPhase('Development', 'Implement features');
      await orchestrator.createSubAgent('developer', { role: 'dev' });
      await orchestrator.writeMemory('code-written', { files: 2 });
      orchestrator.trackFileModification('src/feature.js');
      await orchestrator.completeSubAgent('developer', { linesWritten: 100 });
      await orchestrator.completePhase('Development complete');

      // Phase 3: Testing
      await orchestrator.startPhase('Testing', 'Run tests');
      const testResults = await orchestrator.qodo.runTests();
      await orchestrator.writeMemory('test-results', testResults);
      await orchestrator.completePhase('Testing complete');

      // Verify workflow
      const checklist = orchestrator.generateChecklist();
      assert.strictEqual(checklist.length, 3);
      assert.ok(checklist.every(item => item.completed));

      // Generate report
      const report = await orchestrator.generateReport();
      assert.strictEqual(report.summary.totalPhases, 3);
      assert.strictEqual(report.summary.completedPhases, 3);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', async () => {
      const report = await orchestrator.generateReport();

      assert.ok(report.summary);
      assert.ok(report.phases);
      assert.ok(report.checklist);
      assert.ok(report.memory);
      assert.ok(report.summary.totalPhases > 0);
    });

    it('should save report to file', async () => {
      const reportFile = join(TEST_MEMORY_DIR, 'final-report.json');
      const exists = await fs.access(reportFile).then(() => true).catch(() => false);
      assert.ok(exists, 'Report file should exist');
    });
  });
});

console.log('Running Memory Orchestrator tests with Qodo integration...\n');
