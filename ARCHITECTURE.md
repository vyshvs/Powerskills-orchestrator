# PowerSkills Memory Orchestrator Plugin

## Overview

This plugin provides advanced memory management and sub-agent orchestration capabilities with full session recording. Compatible with OpenAI, Claude, and Antigravity platforms.

## Directory Structure

```
Powerskills-orchestrator/
├── core/
│   ├── memory-engine.js          # Core memory management system
│   ├── platform-adapter.js       # Cross-platform API adapter
│   └── sub-agent-orchestrator.js # Agent management and orchestration
├── examples/
│   ├── basic-usage.js            # Basic usage examples
│   └── demo.js                   # Advanced demo with all features
├── Ref/                          # Reference materials (isolated)
├── index.js                      # Main plugin entry point
├── package.json                  # Package configuration
├── plugin-manifest.json          # Plugin manifest for compatibility
├── README.md                     # Full documentation
└── ARCHITECTURE.md               # This file

## Architecture

### Core Components

#### 1. Memory Engine (`core/memory-engine.js`)
- **Purpose**: Persistent memory storage with read/write operations
- **Features**:
  - Key-value storage with metadata
  - Search capabilities (fuzzy, exact, regex, tags)
  - Optional compression and encryption
  - TTL (time-to-live) support
  - Session recording and event emission
  - Export/import functionality

**Key Methods**:
- `write(key, value, options)` - Store data with metadata
- `read(key, options)` - Retrieve data
- `search(query, options)` - Search stored data
- `delete(key)` - Remove data
- `clear(filter)` - Bulk delete with filters
- `getStats()` - Memory statistics

#### 2. Platform Adapter (`core/platform-adapter.js`)
- **Purpose**: Unified interface for multiple AI platforms
- **Supported Platforms**:
  - OpenAI (GPT models)
  - Claude (Anthropic models)
  - Antigravity (all models)

**Key Methods**:
- `call(platform, method, params)` - Make API calls
- `stream(platform, method, params, callback)` - Streaming responses
- `validateCredentials(platform)` - Validate API keys
- `getAvailableModels(platform)` - List available models
- `configurePlatform(platform, config)` - Update platform settings

#### 3. Sub-Agent Orchestrator (`core/sub-agent-orchestrator.js`)
- **Purpose**: Manage and coordinate multiple sub-agents
- **Execution Modes**:
  - Parallel: Run multiple tasks simultaneously
  - Sequential: Run tasks one after another
  - Pipeline: Chain tasks with output passing

**Key Methods**:
- `createAgent(config)` - Create a new agent
- `executeTask(agentId, task)` - Execute single task
- `parallelExecution(tasks, options)` - Parallel execution
- `sequentialExecution(tasks, options)` - Sequential execution
- `pipeline(stages, data)` - Pipeline execution
- `getExecutionHistory(filter)` - Audit trail

### Main Plugin (`index.js`)

The main plugin class integrates all core components and provides a unified API.

**Architecture Pattern**: Facade Pattern
- Simplifies interaction with complex subsystems
- Provides consistent interface across all operations
- Manages session lifecycle

**Key Responsibilities**:
- Initialize and coordinate all core components
- Provide unified API through `getAPI()` method
- Manage session state and lifecycle
- Execute complex workflows
- Export/import session data

### Workflow Engine

Built into the main plugin, the workflow engine supports:
- Multi-step workflows with context passing
- Mixed execution types (agents, memory, platform calls, custom logic)
- Error handling and recovery
- Progress tracking
- Custom step execution

**Workflow Step Types**:
1. **agent** - Execute agent task
2. **parallel** - Run multiple tasks simultaneously
3. **sequential** - Run tasks in sequence
4. **memory** - Memory operations (read/write/search)
5. **platform** - Direct platform API calls
6. **custom** - Custom execution logic

### Data Flow

```
User Request
    ↓
Main Plugin (index.js)
    ↓
┌───────────────┬──────────────────┬─────────────────┐
│               │                  │                 │
Memory Engine   Platform Adapter   Sub-Agent Orchestrator
│               │                  │                 │
└───────────────┴──────────────────┴─────────────────┘
    ↓
Session Logs & Results
```

### Event System

The plugin uses an event-driven architecture:
- All operations emit log events
- Events captured in session log
- Real-time monitoring through `plugin.on('log', callback)`
- Complete audit trail

### Session Management

**Session Lifecycle**:
1. **Initialize** - Create session, initialize components
2. **Active** - Execute operations, record everything
3. **Pause** - Temporarily suspend operations
4. **Resume** - Continue from paused state
5. **End** - Generate summary, finalize logs

**Session Data Includes**:
- All memory operations
- Agent execution history
- Platform API calls
- Event logs
- Configuration state

### Isolation and No Shared Content

The plugin is designed with strict isolation:

1. **Memory Isolation**:
   - Each session has unique session ID
   - Memory operations are scoped to session
   - No cross-session data leakage

2. **Agent Isolation**:
   - Optional worktree isolation mode
   - Each agent has unique ID
   - Agents can run in parallel without conflicts

3. **Platform Isolation**:
   - Separate API keys per platform
   - Independent configuration
   - No credential sharing

4. **Reference Material Isolation**:
   - `Ref/` folder contains reference materials only
   - Not imported or used by plugin code
   - Completely separate from plugin logic
   - Can be removed without affecting plugin functionality

### Cross-Platform Compatibility

**Design Principles**:
1. **Unified Interface**: Single API works across all platforms
2. **Platform Abstraction**: Platform-specific logic hidden in adapter
3. **Model Agnostic**: Works with any model from any platform
4. **Configuration Driven**: Easy to add new platforms

**Platform-Specific Handling**:
- Request/response format translation
- Authentication method differences
- API endpoint variations
- Model-specific parameters

### Error Handling

**Multi-Level Error Handling**:
1. **Operation Level**: Try-catch on individual operations
2. **Component Level**: Error logging and recovery
3. **Session Level**: Session remains stable despite errors
4. **User Level**: Clear error messages and recovery options

**Recovery Strategies**:
- Retry with exponential backoff
- Fallback to alternative platforms
- Continue on error (configurable)
- Session state preservation

### Performance Considerations

1. **Memory Management**:
   - Compression for large data
   - Configurable size limits
   - Automatic cleanup of expired data

2. **Concurrency Control**:
   - Configurable max concurrent agents
   - Queue system for task scheduling
   - Non-blocking async operations

3. **Optimization**:
   - Event-driven architecture reduces polling
   - Lazy loading for disk persistence
   - Streaming support for large responses

### Security Features

1. **Optional Encryption**: Sensitive data can be encrypted
2. **No Credential Sharing**: API keys never logged or shared
3. **Session Isolation**: Complete separation between sessions
4. **Audit Trail**: Full logging for security review

### Extensibility

The plugin is designed for easy extension:

1. **Custom Workflow Steps**: Add `execute` function
2. **New Platforms**: Implement platform methods in adapter
3. **Custom Agents**: Configure agent types
4. **Event Handlers**: Hook into event system

### Testing Strategy

Example tests should cover:
1. Memory operations (CRUD)
2. Agent creation and execution
3. Parallel/sequential/pipeline execution
4. Workflow execution
5. Platform adapter functionality
6. Session management
7. Error handling

### Deployment

**Requirements**:
- Node.js >= 14.0.0
- No external dependencies (standalone)
- Environment variables for API keys (optional)

**Installation**:
```bash
npm install powerskills-memory-orchestrator
```

**Usage**:
```javascript
const PowerSkillsPlugin = require('powerskills-memory-orchestrator');
const plugin = new PowerSkillsPlugin(config);
const api = plugin.getAPI();
```

## Design Decisions

### Why No External Dependencies?
- Maximum portability
- No dependency conflicts
- Easier to audit and secure
- Faster installation

### Why Event-Driven Architecture?
- Real-time monitoring
- Loose coupling
- Easy to extend
- Complete audit trail

### Why Facade Pattern?
- Simplifies complex subsystems
- Consistent API surface
- Easy to use and learn
- Hides implementation details

### Why Session-Based?
- Complete recording capability
- Export/import functionality
- Isolation between uses
- Clear lifecycle management

## Future Enhancements

Potential areas for expansion:
1. Persistent disk storage implementation
2. Distributed agent execution
3. Advanced analytics on session data
4. Real-time collaboration features
5. Plugin marketplace integration
6. Advanced caching strategies
7. GraphQL API interface
8. WebSocket support for real-time updates

## Contributing

When contributing to this plugin:
1. Maintain isolation principles
2. Follow existing patterns
3. Add comprehensive logging
4. Include error handling
5. Update documentation
6. Add examples for new features

## License

MIT License - See LICENSE file for details
