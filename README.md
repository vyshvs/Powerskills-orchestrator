# PowerSkills Memory Orchestrator v2.1.0

**Advanced plugin with memory reader/writer sub-agent that records everything from start to end**

[![Security Audit](https://img.shields.io/badge/Security-Hardened-green)](SECURITY_AUDIT.md)
[![Tests](https://img.shields.io/badge/Tests-22%2F22%20Passing-brightgreen)](test/test-suite.js)
[![Auto-Update](https://img.shields.io/badge/Auto--Update-Enabled-blue)](#auto-update)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-orange)](#)

---

## 🚀 Features

### Core Capabilities
- **Memory Operations**: Write, read, search, delete with full metadata support
- **Sub-Agent Orchestration**: Parallel, sequential, and pipeline execution modes
- **Cross-Platform Support**: OpenAI, Claude, Antigravity compatible
- **Session Management**: Complete session lifecycle with pause/resume
- **Event System**: Real-time event emission for all operations
- **Execution History**: Full audit trail of all operations

### 🔒 Security Hardened
- ✅ **15 Critical Vulnerabilities Fixed** (see [Security Audit](SECURITY_AUDIT.md))
- ✅ Cryptographically secure session IDs
- ✅ ReDoS attack protection
- ✅ API key leakage prevention
- ✅ Input validation and type safety
- ✅ Resource exhaustion protection

### 🔄 Auto-Update
Plugin automatically checks GitHub for updates on startup and applies them immediately. Users get the latest security fixes and features the moment they trigger the plugin.

---

## 📦 Installation

```bash
npm install powerskills-memory-orchestrator
```

**Or clone from GitHub:**
```bash
git clone https://github.com/vyshvs/Powerskills-orchestrator.git
cd Powerskills-orchestrator
npm test
```

---

## 🎯 Quick Start

```javascript
const PowerSkillsPlugin = require('powerskills-memory-orchestrator');

// Initialize plugin with auto-update enabled (default)
const plugin = new PowerSkillsPlugin({
  autoUpdate: true,  // Auto-update on startup
  memory: {
    persistToDisk: true,
    sessionTimeout: 3600000
  }
});

// Wait for initialization (includes auto-update check)
await plugin.initPromise;

// Write to memory
await plugin.writeMemory('user:preferences', {
  theme: 'dark',
  language: 'en'
}, {
  tags: ['user', 'settings'],
  type: 'config'
});

// Read from memory
const prefs = await plugin.readMemory('user:preferences');

// Search memory
const results = await plugin.searchMemory('theme', {
  tags: ['settings']
});

// Create and execute agents
const agentId = await plugin.createAgent({
  name: 'DataProcessor',
  type: 'worker'
});

const result = await plugin.executeTask(agentId, {
  description: 'Process user data',
  data: { userId: 123 }
});
```

---

## 🔧 API Reference

### Memory Operations

#### `writeMemory(key, value, options)`
Store data in memory with metadata.

```javascript
await plugin.writeMemory('session:state', { step: 3 }, {
  tags: ['session', 'workflow'],
  type: 'state',
  metadata: { userId: 'user123' }
});
```

#### `readMemory(key, options)`
Retrieve data from memory.

```javascript
const data = await plugin.readMemory('session:state', {
  includeMetadata: true
});
```

#### `searchMemory(query, options)`
Search memory with regex patterns.

```javascript
const results = await plugin.searchMemory('session:', {
  tags: ['workflow'],
  limit: 10
});
```

#### `deleteMemory(key)`
Remove data from memory.

```javascript
await plugin.deleteMemory('session:state');
```

#### `clearMemory(filter)`
Clear memory with optional filter.

```javascript
await plugin.clearMemory({
  tags: ['temporary'],
  olderThan: Date.now() - 3600000
});
```

### Agent Operations

#### `createAgent(config)`
Create a new sub-agent.

```javascript
const agentId = await plugin.createAgent({
  name: 'Processor',
  type: 'worker',
  platform: 'claude'
});
```

#### `executeTask(agentId, task)`
Execute a task with an agent.

```javascript
const result = await plugin.executeTask(agentId, {
  description: 'Analyze data',
  data: { input: 'data' },
  platform: 'claude'
});
```

#### `parallelExecute(tasks)`
Execute multiple tasks concurrently.

```javascript
const results = await plugin.parallelExecute([
  { agentId: 'agent1', task: {...} },
  { agentId: 'agent2', task: {...} }
]);
```

#### `sequentialExecute(tasks)`
Execute tasks in sequence.

```javascript
const results = await plugin.sequentialExecute([
  { agentId: 'agent1', task: {...} },
  { agentId: 'agent2', task: {...} }
]);
```

#### `pipeline(stages, data)`
Execute pipeline workflow.

```javascript
const result = await plugin.pipeline([
  { name: 'Extract', description: 'Extract data' },
  { name: 'Transform', description: 'Transform data' },
  { name: 'Load', description: 'Load data' }
], initialData);
```

### Platform Configuration

#### `configurePlatform(platformName, config)`
Configure AI platform credentials.

```javascript
await plugin.configurePlatform('claude', {
  enabled: true,
  apiKey: 'your-api-key',
  baseUrl: 'https://api.anthropic.com',
  defaultModel: 'claude-opus-5'
});
```

### Workflow Operations

#### `executeWorkflow(workflow)`
Execute a complete workflow.

```javascript
const result = await plugin.executeWorkflow({
  name: 'DataPipeline',
  steps: [
    { operation: 'memory', action: 'write', key: 'data', value: {...} },
    { operation: 'agent', action: 'create', config: {...} },
    { operation: 'agent', action: 'execute', agentId: 'agent1', task: {...} }
  ]
});
```

### Session Management

#### `exportSession()`
Export current session state.

```javascript
const sessionData = await plugin.exportSession();
```

#### `pauseSession()`
Pause the current session.

```javascript
await plugin.pauseSession();
```

#### `resumeSession()`
Resume a paused session.

```javascript
await plugin.resumeSession();
```

#### `endSession(summary)`
End session with summary.

```javascript
await plugin.endSession({
  completed: true,
  stats: { operations: 42 }
});
```

---

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test
```

**Test Coverage:**
- ✅ 22/22 tests passing
- Memory operations (read/write/search/delete/stats/clear)
- Agent lifecycle (create/execute/status)
- Parallel/Sequential/Pipeline execution
- Platform management
- Workflow execution
- Session management
- Event system
- Execution history

---

## 🔒 Security

PowerSkills Memory Orchestrator v2.1.0 has undergone comprehensive security hardening:

- **15 Critical Vulnerabilities Fixed** (see [SECURITY_AUDIT.md](SECURITY_AUDIT.md))
- Cryptographically secure session generation
- ReDoS attack protection (regex pattern limits)
- API key leakage prevention
- Input validation and type safety
- Resource exhaustion protection
- Memory leak prevention

**Verification:** [VERIFICATION.md](VERIFICATION.md)

---

## 📊 Architecture

```
PowerSkills Memory Orchestrator
│
├── Core Components
│   ├── Memory Engine (memory-engine.js)
│   │   ├── Session management
│   │   ├── Read/Write operations
│   │   ├── Search with regex
│   │   └── Statistics tracking
│   │
│   ├── Platform Adapter (platform-adapter.js)
│   │   ├── Multi-platform support
│   │   ├── API abstraction
│   │   └── Credential management
│   │
│   ├── Sub-Agent Orchestrator (sub-agent-orchestrator.js)
│   │   ├── Agent lifecycle
│   │   ├── Task execution
│   │   ├── Parallel/Sequential modes
│   │   └── Pipeline workflows
│   │
│   └── Update Manager (update-manager.js)
│       ├── GitHub version checking
│       ├── Auto-update on startup
│       └── Changelog retrieval
│
└── Main Plugin (index.js)
    ├── Unified API
    ├── Session management
    ├── Event system
    └── Workflow execution
```

---

## 🔄 Auto-Update System

The plugin automatically checks for updates when initialized:

1. **Startup Check**: Queries GitHub API for latest version
2. **Version Comparison**: Compares all version parts (not just major.minor.patch)
3. **Auto-Download**: Downloads update if available
4. **Auto-Apply**: Applies update immediately
5. **User Notification**: Shows console message with changelog
6. **Restart Prompt**: Asks user to restart to apply updates

**Configuration:**
```javascript
const plugin = new PowerSkillsPlugin({
  autoUpdate: true,  // Enable auto-update (default)
  // autoUpdate: false  // Disable auto-update
});
```

---

## 📝 Configuration

### Full Configuration Example

```javascript
const plugin = new PowerSkillsPlugin({
  // Auto-update
  autoUpdate: true,

  // Memory settings
  memory: {
    persistToDisk: true,
    sessionTimeout: 3600000,
    maxMemorySize: 104857600  // 100MB
  },

  // Orchestrator settings
  orchestrator: {
    maxConcurrentAgents: 10,
    taskTimeout: 300000,
    retryAttempts: 3
  },

  // Platform configurations
  platforms: {
    claude: {
      enabled: true,
      apiKey: process.env.CLAUDE_API_KEY,
      baseUrl: 'https://api.anthropic.com',
      defaultModel: 'claude-opus-5'
    },
    openai: {
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com',
      defaultModel: 'gpt-4'
    }
  }
});
```

---

## 🎯 Use Cases

### 1. Data Pipeline with Memory
```javascript
// Store intermediate results
await plugin.writeMemory('pipeline:step1', processedData);

// Execute transformation
const agent = await plugin.createAgent({ name: 'Transformer' });
const result = await plugin.executeTask(agent, {
  description: 'Transform data',
  data: processedData
});

// Store final result
await plugin.writeMemory('pipeline:final', result);
```

### 2. Multi-Agent Collaboration
```javascript
// Create multiple agents
const agents = await Promise.all([
  plugin.createAgent({ name: 'Analyzer' }),
  plugin.createAgent({ name: 'Validator' }),
  plugin.createAgent({ name: 'Formatter' })
]);

// Execute in parallel
const results = await plugin.parallelExecute(
  agents.map((agentId, i) => ({
    agentId,
    task: { description: tasks[i], data }
  }))
);
```

### 3. Session-Based Workflows
```javascript
// Start session
await plugin.initPromise;

// Perform operations
await plugin.writeMemory('session:context', context);
const result = await plugin.executeWorkflow(workflow);

// Export session for later
const sessionData = await plugin.exportSession();

// Resume later
await plugin.resumeSession();
```

---

## 🛠️ Development

### Project Structure
```
Powerskills-orchestrator/
├── index.js                 # Main plugin entry
├── core/
│   ├── memory-engine.js     # Memory operations
│   ├── platform-adapter.js  # Platform abstraction
│   ├── sub-agent-orchestrator.js  # Agent management
│   └── update-manager.js    # Auto-update system
├── test/
│   └── test-suite.js        # Comprehensive tests
├── examples/
│   ├── basic-usage.js       # Basic examples
│   └── demo.js              # Full demo
├── SECURITY_AUDIT.md        # Security review
├── VERIFICATION.md          # Verification report
└── package.json
```

### Running Examples
```bash
npm start        # Run basic example
npm run demo     # Run full demo
```

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🔗 Links

- **Repository**: https://github.com/vyshvs/Powerskills-orchestrator
- **Security Audit**: [SECURITY_AUDIT.md](SECURITY_AUDIT.md)
- **Verification Report**: [VERIFICATION.md](VERIFICATION.md)
- **Issues**: https://github.com/vyshvs/Powerskills-orchestrator/issues

---

## 📈 Version History

### v2.1.0 (Latest)
- ✅ Auto-update on plugin startup
- ✅ 15 critical security vulnerabilities fixed
- ✅ Cryptographically secure session IDs
- ✅ ReDoS protection
- ✅ API key leakage prevention
- ✅ Resource optimization (CPU, memory)
- ✅ Full version comparison in update checks
- ✅ Pipeline data flow improvements
- ✅ 22/22 tests passing

### v2.0.1
- GitHub update manager
- Automatic version checking

### v1.0.0
- Initial release
- Core memory operations
- Sub-agent orchestration
- Platform adapters

---

**Built with ❤️ by PowerSkills Team**

**Powered by:** Claude Opus 5 🤖
