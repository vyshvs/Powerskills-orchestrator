# Scaffolding Engine Architecture

## Overview
The Scaffolding Engine is a hierarchical execution framework that manages complex workflows through multi-level decomposition: Phases → Steps → Sub-steps. Each level has validation gates, state tracking, and rollback capabilities.

## Core Concepts

### 1. Hierarchical Structure
```
Project
  └─ Phase (e.g., "Foundation & Architecture")
      ├─ Step 1.1 (e.g., "Scaffolding Engine Design")
      │   ├─ Sub-step 1.1.1 (e.g., "Design data structures")
      │   ├─ Sub-step 1.1.2 (e.g., "Define interfaces")
      │   └─ Sub-step 1.1.3 (e.g., "Create state machine")
      ├─ Step 1.2
      └─ Step 1.3
```

### 2. State Machine
Each level (Phase/Step/Sub-step) transitions through:
- `PENDING` → Initial state
- `IN_PROGRESS` → Currently executing
- `VALIDATING` → Running validation checks
- `COMPLETED` → Successfully finished
- `FAILED` → Validation failed
- `BLOCKED` → Waiting on dependencies
- `ROLLED_BACK` → Reverted due to failure

### 3. Phase Gates
Before advancing to next phase/step:
- All tests must pass
- Code review must approve
- All artifacts must be generated
- Memory/audit trail must be updated
- Manual approval (optional)

## Data Structures

### Scaffolding Node
```javascript
class ScaffoldingNode {
  id: string;              // Unique identifier
  type: 'phase' | 'step' | 'substep';
  name: string;
  description: string;
  state: NodeState;
  parent: ScaffoldingNode | null;
  children: ScaffoldingNode[];
  dependencies: string[];  // IDs of nodes that must complete first
  
  // Validation
  validators: Validator[];
  validationResults: ValidationResult[];
  
  // Execution
  startTime: Date | null;
  endTime: Date | null;
  duration: number | null;
  retryCount: number;
  maxRetries: number;
  
  // Artifacts
  outputs: Map<string, any>;
  errors: Error[];
  
  // Metadata
  metadata: Record<string, any>;
  tags: string[];
}
```

### Validator
```javascript
interface Validator {
  name: string;
  type: 'test' | 'review' | 'manual' | 'custom';
  execute: (node: ScaffoldingNode) => Promise<ValidationResult>;
  config: Record<string, any>;
}

interface ValidationResult {
  passed: boolean;
  validator: string;
  message: string;
  details: any;
  timestamp: Date;
}
```

### Scaffolding Tree
```javascript
class ScaffoldingTree {
  root: ScaffoldingNode;
  nodes: Map<string, ScaffoldingNode>;
  currentNode: ScaffoldingNode | null;
  
  // Navigation
  getNode(id: string): ScaffoldingNode | null;
  getPhase(name: string): ScaffoldingNode | null;
  getCurrentPath(): ScaffoldingNode[];
  
  // Execution
  start(nodeId: string): Promise<void>;
  complete(nodeId: string): Promise<void>;
  fail(nodeId: string, error: Error): Promise<void>;
  rollback(nodeId: string): Promise<void>;
  
  // Validation
  validate(nodeId: string): Promise<boolean>;
  canAdvance(nodeId: string): boolean;
  
  // Query
  getProgress(): ProgressReport;
  getBlockedNodes(): ScaffoldingNode[];
  getFailedNodes(): ScaffoldingNode[];
}
```

## Execution Flow

### 1. Initialization
```javascript
// Create scaffolding tree from plan
const tree = ScaffoldingTree.fromPlan(transformationPlan);

// Register validators
tree.registerValidator('test', new TestValidator());
tree.registerValidator('review', new QodoValidator());
tree.registerValidator('manual', new ManualApprovalValidator());

// Start execution
await tree.start('phase-1');
```

### 2. Node Execution
```javascript
async executeNode(node: ScaffoldingNode) {
  // 1. Check dependencies
  if (!this.dependenciesMet(node)) {
    node.state = 'BLOCKED';
    return;
  }
  
  // 2. Start execution
  node.state = 'IN_PROGRESS';
  node.startTime = new Date();
  await this.emitEvent('node:start', node);
  
  try {
    // 3. Execute node logic
    await this.executeNodeLogic(node);
    
    // 4. Validate
    node.state = 'VALIDATING';
    const validationPassed = await this.validate(node);
    
    if (validationPassed) {
      // 5a. Success - mark complete
      node.state = 'COMPLETED';
      node.endTime = new Date();
      node.duration = node.endTime - node.startTime;
      await this.emitEvent('node:complete', node);
      
      // 6. Trigger next nodes
      await this.advanceToNext(node);
    } else {
      // 5b. Validation failed
      await this.handleValidationFailure(node);
    }
  } catch (error) {
    // 5c. Execution error
    await this.handleExecutionError(node, error);
  }
}
```

### 3. Validation Process
```javascript
async validate(node: ScaffoldingNode): Promise<boolean> {
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
      
      // Auto-fix if possible
      if (validator.canAutoFix) {
        await validator.fix(node, result);
        attempts++;
      } else {
        break;
      }
    }
    
    results.push(result);
    node.validationResults.push(result);
  }
  
  return results.every(r => r.passed);
}
```

### 4. Failure Handling
```javascript
async handleValidationFailure(node: ScaffoldingNode) {
  node.retryCount++;
  
  if (node.retryCount >= node.maxRetries) {
    // Max retries exceeded - fail permanently
    node.state = 'FAILED';
    await this.emitEvent('node:failed', node);
    
    // Optionally rollback phase
    if (this.shouldRollback(node)) {
      await this.rollback(node.parent);
    }
  } else {
    // Retry after fixing issues
    node.state = 'IN_PROGRESS';
    await this.executeNode(node);
  }
}
```

### 5. Rollback Mechanism
```javascript
async rollback(node: ScaffoldingNode) {
  // 1. Mark as rolling back
  node.state = 'ROLLING_BACK';
  
  // 2. Revert changes (if rollback handler exists)
  if (node.rollbackHandler) {
    await node.rollbackHandler(node);
  }
  
  // 3. Rollback all children
  for (const child of node.children) {
    if (child.state !== 'PENDING') {
      await this.rollback(child);
    }
  }
  
  // 4. Reset state
  node.state = 'ROLLED_BACK';
  node.startTime = null;
  node.endTime = null;
  node.validationResults = [];
  node.errors = [];
  
  await this.emitEvent('node:rolled-back', node);
}
```

## Phase Gate Implementation

### Gate Criteria
```javascript
class PhaseGate {
  phase: ScaffoldingNode;
  criteria: GateCriterion[];
  
  async canPassGate(): Promise<GateResult> {
    const results = await Promise.all(
      this.criteria.map(c => c.check(this.phase))
    );
    
    return {
      passed: results.every(r => r.passed),
      results,
      blockers: results.filter(r => !r.passed)
    };
  }
}

// Standard gate criteria
const standardGate = [
  new AllTestsPassCriterion(),
  new CodeReviewApprovedCriterion(),
  new AllStepsCompleteCriterion(),
  new NoBlockingIssuesCriterion(),
  new MemoryUpdatedCriterion()
];
```

### Gate Validation
```javascript
async advanceToNextPhase(currentPhase: ScaffoldingNode) {
  const gate = new PhaseGate(currentPhase, standardGate);
  const result = await gate.canPassGate();
  
  if (result.passed) {
    // Gate passed - advance
    const nextPhase = this.getNextPhase(currentPhase);
    if (nextPhase) {
      await this.start(nextPhase.id);
    }
  } else {
    // Gate failed - show blockers
    console.error('Phase gate blocked:', result.blockers);
    throw new PhaseGateError(result.blockers);
  }
}
```

## Memory Integration

### State Persistence
```javascript
class ScaffoldingPersistence {
  async saveState(tree: ScaffoldingTree) {
    const state = {
      timestamp: new Date(),
      tree: this.serializeTree(tree),
      progress: tree.getProgress()
    };
    
    await writeFile(
      '.memory/scaffolding/state.json',
      JSON.stringify(state, null, 2)
    );
  }
  
  async loadState(): Promise<ScaffoldingTree> {
    const state = JSON.parse(
      await readFile('.memory/scaffolding/state.json', 'utf8')
    );
    
    return this.deserializeTree(state.tree);
  }
  
  async saveNodeHistory(node: ScaffoldingNode) {
    const history = {
      nodeId: node.id,
      name: node.name,
      state: node.state,
      duration: node.duration,
      validationResults: node.validationResults,
      timestamp: new Date()
    };
    
    await appendFile(
      `.memory/scaffolding/history/${node.id}.jsonl`,
      JSON.stringify(history) + '\n'
    );
  }
}
```

## Event System

### Events
```javascript
class ScaffoldingEventEmitter {
  events = {
    'node:start': [],
    'node:complete': [],
    'node:failed': [],
    'node:validating': [],
    'node:rolled-back': [],
    'phase:gate': [],
    'tree:complete': []
  };
  
  on(event: string, handler: Function) {
    this.events[event].push(handler);
  }
  
  async emit(event: string, data: any) {
    const handlers = this.events[event] || [];
    await Promise.all(handlers.map(h => h(data)));
  }
}

// Usage
tree.on('node:complete', async (node) => {
  await persistence.saveNodeHistory(node);
  await updateMemory(node);
  console.log(`✅ Completed: ${node.name}`);
});

tree.on('phase:gate', async (phase) => {
  console.log(`🚪 Phase gate check: ${phase.name}`);
});
```

## Error Recovery

### Strategies
1. **Retry with exponential backoff**: For transient failures
2. **Auto-fix**: For known fixable issues (linting, formatting)
3. **Rollback**: For corrupted state
4. **Skip**: For non-critical steps (with approval)
5. **Pause**: For manual intervention

### Implementation
```javascript
class ErrorRecoveryStrategy {
  async handle(node: ScaffoldingNode, error: Error) {
    if (this.isTransient(error)) {
      return this.retryWithBackoff(node);
    }
    
    if (this.canAutoFix(error)) {
      await this.autoFix(node, error);
      return this.retry(node);
    }
    
    if (this.isCorrupted(error)) {
      return this.rollback(node);
    }
    
    // Manual intervention required
    return this.pauseForManualFix(node, error);
  }
}
```

## Performance Considerations

### Parallelization
- Execute independent nodes in parallel
- Use worker threads for CPU-intensive validation
- Stream large datasets instead of loading in memory

### Caching
- Cache validation results (with TTL)
- Cache dependency resolution
- Cache file system operations

### Optimization
- Lazy load node children
- Index nodes for O(1) lookup
- Use incremental validation where possible

## Security

### Sandboxing
- Execute untrusted code in isolated context
- Limit file system access per node
- Validate all inputs/outputs

### Audit Trail
- Log all state transitions
- Record all validation attempts
- Track all rollbacks and failures

---

*Design complete. Ready for implementation.*
