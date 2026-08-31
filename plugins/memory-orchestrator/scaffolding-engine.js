import { EventEmitter } from 'events';
import { readFile, writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Node states in the scaffolding state machine
 */
const NodeState = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  VALIDATING: 'VALIDATING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
  ROLLING_BACK: 'ROLLING_BACK',
  ROLLED_BACK: 'ROLLED_BACK'
};

/**
 * Represents a node in the scaffolding tree (Phase, Step, or Sub-step)
 */
class ScaffoldingNode {
  constructor(config) {
    this.id = config.id;
    this.type = config.type; // 'phase', 'step', 'substep'
    this.name = config.name;
    this.description = config.description || '';
    this.state = NodeState.PENDING;
    this.parent = null;
    this.children = [];
    this.dependencies = config.dependencies || [];

    // Validation
    this.validators = config.validators || [];
    this.validationResults = [];

    // Execution
    this.startTime = null;
    this.endTime = null;
    this.duration = null;
    this.retryCount = 0;
    this.maxRetries = config.maxRetries || 3;

    // Artifacts
    this.outputs = new Map();
    this.errors = [];

    // Metadata
    this.metadata = config.metadata || {};
    this.tags = config.tags || [];

    // Handlers
    this.executeHandler = config.executeHandler || null;
    this.rollbackHandler = config.rollbackHandler || null;
  }

  /**
   * Add a child node
   */
  addChild(child) {
    child.parent = this;
    this.children.push(child);
  }

  /**
   * Check if all dependencies are met
   */
  areDependenciesMet(nodeMap) {
    return this.dependencies.every(depId => {
      const dep = nodeMap.get(depId);
      return dep && dep.state === NodeState.COMPLETED;
    });
  }

  /**
   * Get the full path from root to this node
   */
  getPath() {
    const path = [];
    let current = this;
    while (current) {
      path.unshift(current.name);
      current = current.parent;
    }
    return path.join(' → ');
  }

  /**
   * Serialize node to JSON
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      description: this.description,
      state: this.state,
      dependencies: this.dependencies,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      retryCount: this.retryCount,
      validationResults: this.validationResults,
      outputs: Array.from(this.outputs.entries()),
      errors: this.errors.map(e => ({ message: e.message, stack: e.stack })),
      metadata: this.metadata,
      tags: this.tags,
      children: this.children.map(c => c.toJSON())
    };
  }
}

/**
 * Validator interface for validating node completion
 */
class Validator {
  constructor(name, type, executeFn, config = {}) {
    this.name = name;
    this.type = type; // 'test', 'review', 'manual', 'custom'
    this.executeFn = executeFn;
    this.config = config;
    this.canAutoFix = config.canAutoFix || false;
    this.fixFn = config.fixFn || null;
  }

  async execute(node) {
    try {
      const result = await this.executeFn(node, this.config);
      return {
        passed: result.passed,
        validator: this.name,
        message: result.message,
        details: result.details || {},
        timestamp: new Date()
      };
    } catch (error) {
      return {
        passed: false,
        validator: this.name,
        message: `Validator error: ${error.message}`,
        details: { error: error.stack },
        timestamp: new Date()
      };
    }
  }

  async fix(node, validationResult) {
    if (this.canAutoFix && this.fixFn) {
      return await this.fixFn(node, validationResult, this.config);
    }
    throw new Error(`Validator ${this.name} cannot auto-fix`);
  }
}

/**
 * Phase gate for controlling advancement between phases
 */
class PhaseGate {
  constructor(phase, criteria = []) {
    this.phase = phase;
    this.criteria = criteria;
  }

  async canPassGate() {
    const results = [];

    for (const criterion of this.criteria) {
      const result = await criterion.check(this.phase);
      results.push(result);
    }

    const passed = results.every(r => r.passed);
    const blockers = results.filter(r => !r.passed);

    return {
      passed,
      results,
      blockers,
      timestamp: new Date()
    };
  }
}

/**
 * Gate criterion interface
 */
class GateCriterion {
  constructor(name, checkFn) {
    this.name = name;
    this.checkFn = checkFn;
  }

  async check(phase) {
    try {
      const passed = await this.checkFn(phase);
      return {
        criterion: this.name,
        passed,
        message: passed ? `✅ ${this.name}` : `❌ ${this.name}`,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        criterion: this.name,
        passed: false,
        message: `❌ ${this.name}: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Main scaffolding tree that manages the entire workflow
 */
class ScaffoldingTree extends EventEmitter {
  constructor(rootNode, config = {}) {
    super();
    this.root = rootNode;
    this.nodes = new Map();
    this.currentNode = null;
    this.config = config;

    // Build node map
    this._buildNodeMap(rootNode);

    // Memory directory
    this.memoryDir = config.memoryDir || '.memory/scaffolding';
  }

  /**
   * Build a map of all nodes for quick lookup
   */
  _buildNodeMap(node) {
    this.nodes.set(node.id, node);
    node.children.forEach(child => this._buildNodeMap(child));
  }

  /**
   * Get a node by ID
   */
  getNode(id) {
    return this.nodes.get(id) || null;
  }

  /**
   * Get a phase by name
   */
  getPhase(name) {
    for (const [id, node] of this.nodes) {
      if (node.type === 'phase' && node.name === name) {
        return node;
      }
    }
    return null;
  }

  /**
   * Get the current execution path
   */
  getCurrentPath() {
    if (!this.currentNode) return [];

    const path = [];
    let current = this.currentNode;
    while (current) {
      path.unshift(current);
      current = current.parent;
    }
    return path;
  }

  /**
   * Start executing a node
   */
  async start(nodeId) {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    await this.executeNode(node);
  }

  /**
   * Execute a single node
   */
  async executeNode(node) {
    // Check dependencies
    if (!node.areDependenciesMet(this.nodes)) {
      node.state = NodeState.BLOCKED;
      this.emit('node:blocked', node);
      console.log(`⏸️  Blocked: ${node.getPath()} (waiting on dependencies)`);
      return;
    }

    // Start execution
    node.state = NodeState.IN_PROGRESS;
    node.startTime = new Date();
    this.currentNode = node;
    this.emit('node:start', node);
    console.log(`\n🚀 Starting: ${node.getPath()}`);

    try {
      // Execute node logic
      if (node.executeHandler) {
        await node.executeHandler(node);
      }

      // Execute children if any
      if (node.children.length > 0) {
        await this.executeChildren(node);
      }

      // Validate
      node.state = NodeState.VALIDATING;
      this.emit('node:validating', node);
      console.log(`🔍 Validating: ${node.name}`);

      const validationPassed = await this.validate(node);

      if (validationPassed) {
        // Success
        await this.completeNode(node);
      } else {
        // Validation failed
        await this.handleValidationFailure(node);
      }
    } catch (error) {
      // Execution error
      await this.handleExecutionError(node, error);
    }
  }

  /**
   * Execute all children of a node
   */
  async executeChildren(node) {
    // Execute children sequentially (can be parallelized if no dependencies)
    for (const child of node.children) {
      if (child.state === NodeState.PENDING && child.areDependenciesMet(this.nodes)) {
        await this.executeNode(child);

        // If child failed and is critical, stop
        if (child.state === NodeState.FAILED && !child.metadata.optional) {
          throw new Error(`Critical child failed: ${child.name}`);
        }
      }
    }
  }

  /**
   * Validate a node
   */
  async validate(node) {
    if (node.validators.length === 0) {
      return true; // No validators = automatic pass
    }

    const results = [];

    for (const validator of node.validators) {
      let result;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        result = await validator.execute(node);

        if (result.passed) {
          break;
        }

        // Try auto-fix if possible
        if (validator.canAutoFix) {
          console.log(`  🔧 Auto-fixing: ${validator.name}`);
          try {
            await validator.fix(node, result);
            attempts++;
          } catch (fixError) {
            console.error(`  ❌ Auto-fix failed: ${fixError.message}`);
            break;
          }
        } else {
          break;
        }
      }

      results.push(result);
      node.validationResults.push(result);

      // Log result
      if (result.passed) {
        console.log(`  ✅ ${validator.name}: ${result.message}`);
      } else {
        console.error(`  ❌ ${validator.name}: ${result.message}`);
      }
    }

    return results.every(r => r.passed);
  }

  /**
   * Mark node as complete
   */
  async completeNode(node) {
    node.state = NodeState.COMPLETED;
    node.endTime = new Date();
    node.duration = node.endTime - node.startTime;
    this.emit('node:complete', node);

    console.log(`✅ Completed: ${node.name} (${node.duration}ms)`);

    // Save state
    await this.saveNodeHistory(node);

    // Check if this completes a phase
    if (node.type === 'phase') {
      await this.handlePhaseComplete(node);
    }

    // Advance to next
    await this.advanceToNext(node);
  }

  /**
   * Handle validation failure
   */
  async handleValidationFailure(node) {
    node.retryCount++;

    if (node.retryCount >= node.maxRetries) {
      // Max retries exceeded
      node.state = NodeState.FAILED;
      this.emit('node:failed', node);
      console.error(`❌ Failed: ${node.name} (max retries exceeded)`);

      // Save failure
      await this.saveNodeHistory(node);

      // Rollback only if explicitly configured, not by default
      if (node.metadata.rollbackOnFailure && this.shouldRollback(node)) {
        await this.rollback(node.parent || node);
      }
    } else {
      // Retry
      console.log(`🔄 Retrying: ${node.name} (attempt ${node.retryCount + 1}/${node.maxRetries})`);
      await this.executeNode(node);
    }
  }

  /**
   * Handle execution error
   */
  async handleExecutionError(node, error) {
    node.errors.push(error);
    console.error(`❌ Execution error in ${node.name}:`, error.message);

    await this.handleValidationFailure(node);
  }

  /**
   * Determine if rollback is needed
   */
  shouldRollback(node) {
    // Rollback if: node is critical and failed
    return node && !node.metadata.optional && node.state === NodeState.FAILED;
  }

  /**
   * Rollback a node and its children
   */
  async rollback(node) {
    if (!node) return;

    console.log(`🔙 Rolling back: ${node.name}`);
    node.state = NodeState.ROLLING_BACK;
    this.emit('node:rollback', node);

    // Execute rollback handler
    if (node.rollbackHandler) {
      try {
        await node.rollbackHandler(node);
      } catch (error) {
        console.error(`Rollback handler error: ${error.message}`);
      }
    }

    // Rollback all children
    for (const child of node.children) {
      if (child.state !== NodeState.PENDING) {
        await this.rollback(child);
      }
    }

    // Reset state
    node.state = NodeState.ROLLED_BACK;
    node.startTime = null;
    node.endTime = null;
    node.validationResults = [];
    node.errors = [];

    this.emit('node:rolled-back', node);
    await this.saveNodeHistory(node);
  }

  /**
   * Handle phase completion with gate checking
   */
  async handlePhaseComplete(phase) {
    console.log(`\n🏁 Phase complete: ${phase.name}`);

    // Create phase gate
    const gate = new PhaseGate(phase, this.getStandardGateCriteria());
    const gateResult = await gate.canPassGate();

    this.emit('phase:gate', { phase, result: gateResult });

    if (gateResult.passed) {
      console.log(`✅ Phase gate passed: ${phase.name}`);
    } else {
      console.error(`❌ Phase gate blocked: ${phase.name}`);
      gateResult.blockers.forEach(b => {
        console.error(`  - ${b.message}`);
      });
      throw new Error(`Phase gate blocked: ${phase.name}`);
    }
  }

  /**
   * Get standard phase gate criteria
   */
  getStandardGateCriteria() {
    return [
      new GateCriterion('All steps complete', (phase) => {
        return phase.children.every(c => c.state === NodeState.COMPLETED);
      }),
      new GateCriterion('No blocking issues', (phase) => {
        return phase.errors.length === 0;
      }),
      new GateCriterion('All validations passed', (phase) => {
        const allResults = this.getAllValidationResults(phase);
        return allResults.every(r => r.passed);
      })
    ];
  }

  /**
   * Get all validation results for a node and its children
   */
  getAllValidationResults(node) {
    const results = [...node.validationResults];
    node.children.forEach(child => {
      results.push(...this.getAllValidationResults(child));
    });
    return results;
  }

  /**
   * Advance to next node
   */
  async advanceToNext(node) {
    // Find next sibling or move up to parent
    if (node.parent) {
      const siblings = node.parent.children;
      const currentIndex = siblings.indexOf(node);

      if (currentIndex < siblings.length - 1) {
        // Execute next sibling
        const nextSibling = siblings[currentIndex + 1];
        if (nextSibling.areDependenciesMet(this.nodes)) {
          await this.executeNode(nextSibling);
        }
      } else {
        // All siblings complete - check if parent is complete
        const allSiblingsComplete = siblings.every(
          s => s.state === NodeState.COMPLETED || s.metadata.optional
        );

        if (allSiblingsComplete && node.parent.state === NodeState.IN_PROGRESS) {
          // Don't re-execute parent, just validate and complete it
          node.parent.state = NodeState.VALIDATING;
          const validationPassed = await this.validate(node.parent);

          if (validationPassed) {
            await this.completeNode(node.parent);
          }
        }
      }
    }

    // Check if tree is complete
    if (this.isComplete()) {
      this.emit('tree:complete', this.root);
      console.log('\n🎉 All phases complete!');
    }
  }

  /**
   * Check if entire tree is complete
   */
  isComplete() {
    return this.root.state === NodeState.COMPLETED;
  }

  /**
   * Get progress report
   */
  getProgress() {
    const stats = {
      total: 0,
      pending: 0,
      inProgress: 0,
      inprogress: 0, // Alias for consistency
      completed: 0,
      failed: 0,
      blocked: 0,
      validating: 0,
      rollingBack: 0,
      rolledBack: 0
    };

    for (const [id, node] of this.nodes) {
      stats.total++;
      const stateKey = node.state.toLowerCase().replace(/_/g, '');

      if (stats.hasOwnProperty(stateKey)) {
        stats[stateKey]++;
      }

      // Handle IN_PROGRESS state separately
      if (node.state === NodeState.IN_PROGRESS) {
        stats.inProgress++;
        stats.inprogress++;
      }
    }

    stats.percentComplete = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

    return stats;
  }

  /**
   * Get blocked nodes
   */
  getBlockedNodes() {
    return Array.from(this.nodes.values()).filter(
      n => n.state === NodeState.BLOCKED
    );
  }

  /**
   * Get failed nodes
   */
  getFailedNodes() {
    return Array.from(this.nodes.values()).filter(
      n => n.state === NodeState.FAILED
    );
  }

  /**
   * Save node history to memory
   */
  async saveNodeHistory(node) {
    const historyDir = path.join(this.memoryDir, 'history');

    // Ensure directory exists
    if (!existsSync(historyDir)) {
      await mkdir(historyDir, { recursive: true });
    }

    const history = {
      nodeId: node.id,
      name: node.name,
      type: node.type,
      state: node.state,
      duration: node.duration,
      validationResults: node.validationResults,
      errors: node.errors.map(e => ({ message: e.message })),
      timestamp: new Date()
    };

    const historyFile = path.join(historyDir, `${node.id}.jsonl`);
    await appendFile(historyFile, JSON.stringify(history) + '\n');
  }

  /**
   * Save entire tree state
   */
  async saveState() {
    if (!existsSync(this.memoryDir)) {
      await mkdir(this.memoryDir, { recursive: true });
    }

    const state = {
      timestamp: new Date(),
      tree: this.root.toJSON(),
      progress: this.getProgress(),
      currentNode: this.currentNode ? this.currentNode.id : null
    };

    await writeFile(
      path.join(this.memoryDir, 'state.json'),
      JSON.stringify(state, null, 2)
    );
  }

  /**
   * Load tree state from memory
   */
  static async loadState(memoryDir) {
    const stateFile = path.join(memoryDir, 'state.json');

    if (!existsSync(stateFile)) {
      throw new Error('No saved state found');
    }

    const state = JSON.parse(await readFile(stateFile, 'utf8'));

    // Reconstruct tree from JSON
    const root = ScaffoldingTree.nodeFromJSON(state.tree);
    const tree = new ScaffoldingTree(root, { memoryDir });

    if (state.currentNode) {
      tree.currentNode = tree.getNode(state.currentNode);
    }

    return tree;
  }

  /**
   * Reconstruct node from JSON
   */
  static nodeFromJSON(json) {
    const node = new ScaffoldingNode({
      id: json.id,
      type: json.type,
      name: json.name,
      description: json.description,
      dependencies: json.dependencies,
      metadata: json.metadata,
      tags: json.tags
    });

    node.state = json.state;
    node.startTime = json.startTime ? new Date(json.startTime) : null;
    node.endTime = json.endTime ? new Date(json.endTime) : null;
    node.duration = json.duration;
    node.retryCount = json.retryCount;
    node.validationResults = json.validationResults;
    node.outputs = new Map(json.outputs);
    node.errors = json.errors.map(e => new Error(e.message));

    // Reconstruct children
    json.children.forEach(childJson => {
      const child = ScaffoldingTree.nodeFromJSON(childJson);
      node.addChild(child);
    });

    return node;
  }
}

export {
  ScaffoldingTree,
  ScaffoldingNode,
  Validator,
  PhaseGate,
  GateCriterion,
  NodeState
};
