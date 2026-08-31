import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import {
  ScaffoldingTree,
  ScaffoldingNode,
  Validator,
  PhaseGate,
  GateCriterion,
  NodeState
} from './scaffolding-engine.js';

const TEST_MEMORY_DIR = '.memory/test-scaffolding';

describe('ScaffoldingNode', () => {
  it('should create a node with basic config', () => {
    const node = new ScaffoldingNode({
      id: 'test-1',
      type: 'phase',
      name: 'Test Phase',
      description: 'A test phase'
    });

    assert.strictEqual(node.id, 'test-1');
    assert.strictEqual(node.type, 'phase');
    assert.strictEqual(node.name, 'Test Phase');
    assert.strictEqual(node.state, NodeState.PENDING);
    assert.strictEqual(node.children.length, 0);
  });

  it('should add children correctly', () => {
    const parent = new ScaffoldingNode({
      id: 'parent',
      type: 'phase',
      name: 'Parent'
    });

    const child = new ScaffoldingNode({
      id: 'child',
      type: 'step',
      name: 'Child'
    });

    parent.addChild(child);

    assert.strictEqual(parent.children.length, 1);
    assert.strictEqual(child.parent, parent);
  });

  it('should check dependencies correctly', () => {
    const dep1 = new ScaffoldingNode({
      id: 'dep-1',
      type: 'step',
      name: 'Dependency 1'
    });
    dep1.state = NodeState.COMPLETED;

    const dep2 = new ScaffoldingNode({
      id: 'dep-2',
      type: 'step',
      name: 'Dependency 2'
    });
    dep2.state = NodeState.PENDING;

    const node = new ScaffoldingNode({
      id: 'node',
      type: 'step',
      name: 'Node',
      dependencies: ['dep-1', 'dep-2']
    });

    const nodeMap = new Map([
      ['dep-1', dep1],
      ['dep-2', dep2]
    ]);

    assert.strictEqual(node.areDependenciesMet(nodeMap), false);

    dep2.state = NodeState.COMPLETED;
    assert.strictEqual(node.areDependenciesMet(nodeMap), true);
  });

  it('should generate correct path', () => {
    const phase = new ScaffoldingNode({
      id: 'phase-1',
      type: 'phase',
      name: 'Phase 1'
    });

    const step = new ScaffoldingNode({
      id: 'step-1',
      type: 'step',
      name: 'Step 1.1'
    });

    const substep = new ScaffoldingNode({
      id: 'substep-1',
      type: 'substep',
      name: 'Sub-step 1.1.1'
    });

    phase.addChild(step);
    step.addChild(substep);

    assert.strictEqual(substep.getPath(), 'Phase 1 → Step 1.1 → Sub-step 1.1.1');
  });

  it('should serialize to JSON correctly', () => {
    const node = new ScaffoldingNode({
      id: 'test',
      type: 'phase',
      name: 'Test',
      metadata: { key: 'value' }
    });

    node.state = NodeState.COMPLETED;
    node.startTime = new Date('2024-01-01T00:00:00Z');
    node.endTime = new Date('2024-01-01T00:01:00Z');
    node.duration = 60000;

    const json = node.toJSON();

    assert.strictEqual(json.id, 'test');
    assert.strictEqual(json.state, NodeState.COMPLETED);
    assert.strictEqual(json.duration, 60000);
    assert.deepStrictEqual(json.metadata, { key: 'value' });
  });
});

describe('Validator', () => {
  it('should execute successfully', async () => {
    const validator = new Validator(
      'test-validator',
      'test',
      async (node) => ({
        passed: true,
        message: 'Test passed'
      })
    );

    const node = new ScaffoldingNode({
      id: 'test',
      type: 'step',
      name: 'Test'
    });

    const result = await validator.execute(node);

    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.validator, 'test-validator');
    assert.strictEqual(result.message, 'Test passed');
  });

  it('should handle validator errors gracefully', async () => {
    const validator = new Validator(
      'failing-validator',
      'test',
      async () => {
        throw new Error('Validator crashed');
      }
    );

    const node = new ScaffoldingNode({
      id: 'test',
      type: 'step',
      name: 'Test'
    });

    const result = await validator.execute(node);

    assert.strictEqual(result.passed, false);
    assert(result.message.includes('Validator error'));
  });

  it('should auto-fix when configured', async () => {
    let fixCalled = false;

    const validator = new Validator(
      'auto-fix-validator',
      'test',
      async () => ({
        passed: false,
        message: 'Needs fix'
      }),
      {
        canAutoFix: true,
        fixFn: async () => {
          fixCalled = true;
        }
      }
    );

    const node = new ScaffoldingNode({
      id: 'test',
      type: 'step',
      name: 'Test'
    });

    const result = await validator.execute(node);
    await validator.fix(node, result);

    assert.strictEqual(fixCalled, true);
  });
});

describe('PhaseGate', () => {
  it('should pass when all criteria met', async () => {
    const phase = new ScaffoldingNode({
      id: 'phase',
      type: 'phase',
      name: 'Test Phase'
    });

    const criteria = [
      new GateCriterion('Criterion 1', async () => true),
      new GateCriterion('Criterion 2', async () => true)
    ];

    const gate = new PhaseGate(phase, criteria);
    const result = await gate.canPassGate();

    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.blockers.length, 0);
  });

  it('should fail when criteria not met', async () => {
    const phase = new ScaffoldingNode({
      id: 'phase',
      type: 'phase',
      name: 'Test Phase'
    });

    const criteria = [
      new GateCriterion('Passing Criterion', async () => true),
      new GateCriterion('Failing Criterion', async () => false)
    ];

    const gate = new PhaseGate(phase, criteria);
    const result = await gate.canPassGate();

    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.blockers.length, 1);
    assert.strictEqual(result.blockers[0].criterion, 'Failing Criterion');
  });
});

describe('ScaffoldingTree', () => {
  beforeEach(async () => {
    // Clean up test memory directory
    if (existsSync(TEST_MEMORY_DIR)) {
      await rm(TEST_MEMORY_DIR, { recursive: true, force: true });
    }
    await mkdir(TEST_MEMORY_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up after tests
    if (existsSync(TEST_MEMORY_DIR)) {
      await rm(TEST_MEMORY_DIR, { recursive: true, force: true });
    }
  });

  it('should create tree and build node map', () => {
    const root = new ScaffoldingNode({
      id: 'root',
      type: 'phase',
      name: 'Root'
    });

    const child1 = new ScaffoldingNode({
      id: 'child-1',
      type: 'step',
      name: 'Child 1'
    });

    const child2 = new ScaffoldingNode({
      id: 'child-2',
      type: 'step',
      name: 'Child 2'
    });

    root.addChild(child1);
    root.addChild(child2);

    const tree = new ScaffoldingTree(root, { memoryDir: TEST_MEMORY_DIR });

    assert.strictEqual(tree.nodes.size, 3);
    assert.strictEqual(tree.getNode('root'), root);
    assert.strictEqual(tree.getNode('child-1'), child1);
  });

  it('should execute simple node successfully', async () => {
    let executed = false;

    const node = new ScaffoldingNode({
      id: 'test',
      type: 'step',
      name: 'Test Step',
      executeHandler: async () => {
        executed = true;
      }
    });

    const tree = new ScaffoldingTree(node, { memoryDir: TEST_MEMORY_DIR });

    await tree.start('test');

    assert.strictEqual(executed, true);
    assert.strictEqual(node.state, NodeState.COMPLETED);
    assert.strictEqual(node.startTime !== null, true);
    assert.strictEqual(node.endTime !== null, true);
  });

  it('should block node when dependencies not met', async () => {
    const dep = new ScaffoldingNode({
      id: 'dep',
      type: 'step',
      name: 'Dependency'
    });

    const node = new ScaffoldingNode({
      id: 'node',
      type: 'step',
      name: 'Node',
      dependencies: ['dep']
    });

    const root = new ScaffoldingNode({
      id: 'root',
      type: 'phase',
      name: 'Root'
    });

    root.addChild(dep);
    root.addChild(node);

    const tree = new ScaffoldingTree(root, { memoryDir: TEST_MEMORY_DIR });

    await tree.start('node');

    assert.strictEqual(node.state, NodeState.BLOCKED);
  });

  it('should execute node after dependencies complete', async () => {
    let depExecuted = false;
    let nodeExecuted = false;

    const dep = new ScaffoldingNode({
      id: 'dep',
      type: 'step',
      name: 'Dependency',
      executeHandler: async () => {
        depExecuted = true;
      }
    });

    const node = new ScaffoldingNode({
      id: 'node',
      type: 'step',
      name: 'Node',
      dependencies: ['dep'],
      executeHandler: async () => {
        nodeExecuted = true;
      }
    });

    const root = new ScaffoldingNode({
      id: 'root',
      type: 'phase',
      name: 'Root'
    });

    root.addChild(dep);
    root.addChild(node);

    const tree = new ScaffoldingTree(root, { memoryDir: TEST_MEMORY_DIR });

    await tree.start('dep');
    assert.strictEqual(depExecuted, true);
    assert.strictEqual(dep.state, NodeState.COMPLETED);

    await tree.start('node');
    assert.strictEqual(nodeExecuted, true);
    assert.strictEqual(node.state, NodeState.COMPLETED);
  });

  it('should validate node with validators', async () => {
    const validator = new Validator(
      'test-validator',
      'test',
      async () => ({
        passed: true,
        message: 'Validation passed'
      })
    );

    const node = new ScaffoldingNode({
      id: 'test',
      type: 'step',
      name: 'Test',
      validators: [validator]
    });

    const tree = new ScaffoldingTree(node, { memoryDir: TEST_MEMORY_DIR });

    await tree.start('test');

    assert.strictEqual(node.state, NodeState.COMPLETED);
    assert.strictEqual(node.validationResults.length, 1);
    assert.strictEqual(node.validationResults[0].passed, true);
  });

  it('should retry on validation failure', async () => {
    let attempts = 0;

    const validator = new Validator(
      'flaky-validator',
      'test',
      async () => {
        attempts++;
        return {
          passed: attempts >= 2,
          message: attempts >= 2 ? 'Passed' : 'Failed'
        };
      }
    );

    const node = new ScaffoldingNode({
      id: 'test',
      type: 'step',
      name: 'Test',
      validators: [validator],
      maxRetries: 3
    });

    const tree = new ScaffoldingTree(node, { memoryDir: TEST_MEMORY_DIR });

    await tree.start('test');

    assert.strictEqual(node.state, NodeState.COMPLETED);
    assert(attempts >= 2);
    assert.strictEqual(node.retryCount, 1);
  });

  it('should fail after max retries', async () => {
    const validator = new Validator(
      'always-fail-validator',
      'test',
      async () => ({
        passed: false,
        message: 'Always fails'
      })
    );

    const node = new ScaffoldingNode({
      id: 'test',
      type: 'step',
      name: 'Test',
      validators: [validator],
      maxRetries: 2
    });

    const tree = new ScaffoldingTree(node, { memoryDir: TEST_MEMORY_DIR });

    await tree.start('test');

    assert.strictEqual(node.state, NodeState.FAILED);
    assert.strictEqual(node.retryCount, 2);
  });

  it('should execute children sequentially', async () => {
    const executionOrder = [];

    const parent = new ScaffoldingNode({
      id: 'parent',
      type: 'phase',
      name: 'Parent'
    });

    const child1 = new ScaffoldingNode({
      id: 'child-1',
      type: 'step',
      name: 'Child 1',
      executeHandler: async () => {
        executionOrder.push('child-1');
      }
    });

    const child2 = new ScaffoldingNode({
      id: 'child-2',
      type: 'step',
      name: 'Child 2',
      executeHandler: async () => {
        executionOrder.push('child-2');
      }
    });

    parent.addChild(child1);
    parent.addChild(child2);

    const tree = new ScaffoldingTree(parent, { memoryDir: TEST_MEMORY_DIR });

    await tree.start('parent');

    assert.deepStrictEqual(executionOrder, ['child-1', 'child-2']);
    assert.strictEqual(parent.state, NodeState.COMPLETED);
  });

  it('should handle execution errors', async () => {
    const node = new ScaffoldingNode({
      id: 'test',
      type: 'step',
      name: 'Test',
      executeHandler: async () => {
        throw new Error('Execution failed');
      },
      maxRetries: 1
    });

    const tree = new ScaffoldingTree(node, { memoryDir: TEST_MEMORY_DIR });

    await tree.start('test');

    assert.strictEqual(node.state, NodeState.FAILED);
    assert.strictEqual(node.errors.length, 1);
    assert.strictEqual(node.errors[0].message, 'Execution failed');
  });

  it('should calculate progress correctly', () => {
    const root = new ScaffoldingNode({
      id: 'root',
      type: 'phase',
      name: 'Root'
    });

    const child1 = new ScaffoldingNode({
      id: 'child-1',
      type: 'step',
      name: 'Child 1'
    });
    child1.state = NodeState.COMPLETED;

    const child2 = new ScaffoldingNode({
      id: 'child-2',
      type: 'step',
      name: 'Child 2'
    });
    child2.state = NodeState.IN_PROGRESS;

    const child3 = new ScaffoldingNode({
      id: 'child-3',
      type: 'step',
      name: 'Child 3'
    });
    child3.state = NodeState.PENDING;

    root.addChild(child1);
    root.addChild(child2);
    root.addChild(child3);

    const tree = new ScaffoldingTree(root, { memoryDir: TEST_MEMORY_DIR });

    const progress = tree.getProgress();

    assert.strictEqual(progress.total, 4);
    assert.strictEqual(progress.completed, 1);
    assert.strictEqual(progress.inProgress, 1);
    assert.strictEqual(progress.pending, 2);
    assert.strictEqual(progress.percentComplete, 25);
  });

  it('should save and load state', async () => {
    const node = new ScaffoldingNode({
      id: 'test',
      type: 'phase',
      name: 'Test Phase',
      metadata: { key: 'value' }
    });

    node.state = NodeState.COMPLETED;

    const tree = new ScaffoldingTree(node, { memoryDir: TEST_MEMORY_DIR });
    tree.currentNode = node;

    await tree.saveState();

    const loadedTree = await ScaffoldingTree.loadState(TEST_MEMORY_DIR);

    assert.strictEqual(loadedTree.root.id, 'test');
    assert.strictEqual(loadedTree.root.state, NodeState.COMPLETED);
    assert.strictEqual(loadedTree.currentNode.id, 'test');
    assert.deepStrictEqual(loadedTree.root.metadata, { key: 'value' });
  });

  it('should emit events during execution', async () => {
    const events = [];

    const node = new ScaffoldingNode({
      id: 'test',
      type: 'step',
      name: 'Test'
    });

    const tree = new ScaffoldingTree(node, { memoryDir: TEST_MEMORY_DIR });

    tree.on('node:start', (n) => events.push({ type: 'start', node: n.id }));
    tree.on('node:validating', (n) => events.push({ type: 'validating', node: n.id }));
    tree.on('node:complete', (n) => events.push({ type: 'complete', node: n.id }));

    await tree.start('test');

    assert.strictEqual(events.length, 3);
    assert.strictEqual(events[0].type, 'start');
    assert.strictEqual(events[1].type, 'validating');
    assert.strictEqual(events[2].type, 'complete');
  });

  it('should get blocked and failed nodes', () => {
    const root = new ScaffoldingNode({
      id: 'root',
      type: 'phase',
      name: 'Root'
    });

    const blocked = new ScaffoldingNode({
      id: 'blocked',
      type: 'step',
      name: 'Blocked'
    });
    blocked.state = NodeState.BLOCKED;

    const failed = new ScaffoldingNode({
      id: 'failed',
      type: 'step',
      name: 'Failed'
    });
    failed.state = NodeState.FAILED;

    root.addChild(blocked);
    root.addChild(failed);

    const tree = new ScaffoldingTree(root, { memoryDir: TEST_MEMORY_DIR });

    const blockedNodes = tree.getBlockedNodes();
    const failedNodes = tree.getFailedNodes();

    assert.strictEqual(blockedNodes.length, 1);
    assert.strictEqual(blockedNodes[0].id, 'blocked');
    assert.strictEqual(failedNodes.length, 1);
    assert.strictEqual(failedNodes[0].id, 'failed');
  });
});

// Run tests
console.log('🧪 Running scaffolding engine tests...\n');
