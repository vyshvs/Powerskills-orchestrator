# Memory Orchestrator Plugin

A powerful plugin with memory management, sub-agent orchestration, and multi-platform compatibility for Claude, OpenAI, and Antigravity.

## Features

- ✅ **Memory Reader/Writer**: Persistent memory with phase tracking
- ✅ **Sub-Agent Orchestration**: Create and manage multiple sub-agents
- ✅ **Multi-Platform Support**: Compatible with Claude, OpenAI, and Antigravity
- ✅ **Auto Tool Selection**: Automatically discover and pick skills/plugins/MCPs
- ✅ **Phase Tracking**: Complete phase-wise checklist with automatic marking
- ✅ **Scaffolding Management**: Create and tear down scaffolding structures
- ✅ **Workflow Engine**: Complex multi-phase workflow orchestration
- ✅ **Comprehensive Reporting**: Generate detailed execution reports

## Installation

```bash
cd plugins/memory-orchestrator
npm install
```

## Usage

### CLI Usage

```bash
# Initialize orchestrator
./cli.js init --platform claude

# Start a new phase
./cli.js phase start --name "Setup" --description "Initial setup phase"

# Write memory
./cli.js memory write --type "checkpoint" --data '{"step": 1, "status": "ok"}'

# Create sub-agent
./cli.js agent create --name "coder" --config '{"role": "developer"}'

# Complete sub-agent
./cli.js agent complete --name "coder" --result '{"files": 5}'

# List phases
./cli.js phase list

# Mark everything completed
./cli.js complete

# Generate report
./cli.js report
```

### Programmatic Usage

```javascript
import MemoryOrchestrator from '@powerskills/memory-orchestrator';

// Initialize
const orchestrator = new MemoryOrchestrator({
  platform: 'claude',
  memoryDir: './.memory',
  autoSkillPick: true
});

// Start phase
orchestrator.startPhase('Analysis', 'Analyzing codebase');

// Write memory
orchestrator.writeMemory('analysis-result', {
  files: 150,
  issues: 10
});

// Create sub-agent
await orchestrator.createSubAgent('reviewer', {
  role: 'code-reviewer'
});

// Complete phase
orchestrator.completePhase('Analysis complete');

// Complete sub-agent
orchestrator.completeSubAgent('reviewer', {
  reviewed: 150,
  approved: 140
});

// Mark all completed
orchestrator.markAllCompleted();

// Generate report
const report = orchestrator.generateReport();
```

### Workflow Engine

```javascript
import WorkflowEngine from '@powerskills/memory-orchestrator/workflow';

const engine = new WorkflowEngine({
  platform: 'claude'
});

// Define workflow
engine.defineWorkflow('security-audit', [
  {
    name: 'Scan',
    description: 'Scan for vulnerabilities',
    handler: async (orchestrator, adapter, context) => {
      // Custom logic
      return { found: 89 };
    }
  },
  {
    name: 'Fix',
    description: 'Fix vulnerabilities',
    dependencies: [0], // Depends on phase 0 (Scan)
    subAgents: [
      { name: 'fixer-1', task: 'Fix ReDoS', config: {} },
      { name: 'fixer-2', task: 'Fix command injection', config: {} }
    ]
  },
  {
    name: 'Verify',
    description: 'Verify fixes',
    dependencies: [1] // Depends on phase 1 (Fix)
  }
]);

// Execute workflow
const result = await engine.executeWorkflow('security-audit', {
  project: 'powerskills'
});

// Get status
const status = engine.getWorkflowStatus('security-audit');
console.log(status.progress); // { total: 3, completed: 3, percentage: 100 }
```

## Platform Adapters

### Claude
```javascript
import { ClaudeAdapter } from '@powerskills/memory-orchestrator/adapters';

const adapter = new ClaudeAdapter(orchestrator);
const result = await adapter.executeWithMemory('Analyze code', {
  phaseName: 'Analysis'
});
```

### OpenAI
```javascript
import { OpenAIAdapter } from '@powerskills/memory-orchestrator/adapters';

const adapter = new OpenAIAdapter(orchestrator);
const result = await adapter.executeWithMemory('Generate code', {
  phaseName: 'Generation',
  model: 'gpt-4'
});
```

### Antigravity
```javascript
import { AntigravityAdapter } from '@powerskills/memory-orchestrator/adapters';

const adapter = new AntigravityAdapter(orchestrator);
const result = await adapter.executeWithMemory('Synthesize results', {
  phaseName: 'Synthesis'
});
```

## Memory Structure

Memory entries are stored in JSON format:

```json
{
  "type": "phase-start",
  "data": {
    "phase": "Setup",
    "description": "Initial setup",
    "timestamp": "2026-09-01T10:00:00.000Z"
  },
  "timestamp": "2026-09-01T10:00:00.000Z",
  "phase": "Setup"
}
```

## Phase Tracking

Phase tracking file (`phase-tracking.json`):

```json
{
  "phases": [
    {
      "name": "Setup",
      "description": "Initial setup",
      "startTime": "2026-09-01T10:00:00.000Z",
      "endTime": "2026-09-01T10:05:00.000Z",
      "status": "completed",
      "memory": []
    }
  ],
  "completedPhases": ["Setup"],
  "currentPhase": null,
  "lastUpdate": "2026-09-01T10:05:00.000Z"
}
```

## Checklist

Generate a checklist of all phases:

```javascript
const checklist = orchestrator.generateChecklist();
/*
[
  { phase: 'Setup', status: 'completed', completed: true, duration: 300000 },
  { phase: 'Analysis', status: 'in-progress', completed: false, duration: null }
]
*/
```

## Auto Tool Discovery

Automatically discover available tools:

```javascript
const tools = await orchestrator.autoPickTools();
/*
{
  skills: ['git-code-review.md', 'deep-research.md'],
  plugins: ['memory-orchestrator', 'security-scanner'],
  mcps: ['github', 'filesystem']
}
*/
```

## API Reference

### MemoryOrchestrator

#### Methods

- `startPhase(name, description)` - Start new phase
- `completePhase(summary)` - Complete current phase
- `writeMemory(type, data)` - Write memory entry
- `readMemory(filter)` - Read memory entries
- `createSubAgent(name, config)` - Create sub-agent
- `completeSubAgent(name, result)` - Complete sub-agent
- `createScaffolding(name, structure)` - Create scaffolding
- `tearDownScaffolding(name)` - Tear down scaffolding
- `generateChecklist()` - Generate phase checklist
- `markAllCompleted()` - Mark everything completed
- `generateReport()` - Generate comprehensive report
- `autoPickTools(context)` - Auto-discover tools

### WorkflowEngine

#### Methods

- `defineWorkflow(name, phases)` - Define workflow
- `executeWorkflow(name, context)` - Execute workflow
- `getWorkflowStatus(name)` - Get workflow status
- `generateWorkflowChecklist(name)` - Generate workflow checklist
- `completeAllWorkflows()` - Complete all workflows

## License

MIT

## Author

vyshvs
