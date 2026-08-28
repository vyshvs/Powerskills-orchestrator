# Global Memory Agent Integration

## Overview

The PowerSkills Memory Orchestrator includes a **global memory agent** that runs in parallel with ALL user requests. This agent is registered in your AI's global settings and stays active across all sessions.

## Agent Registration

### In Global Settings (Custom Agents)

```
Custom Agents [1]
└─ memory-writer [Global] 🟢
   ├─ Manages persistent project memory
   ├─ Project structure tracking and implementation history
   └─ Uses Claude Haiku 4.5 exclusively
```

### Configuration

The agent is automatically registered when the plugin is installed:

```json
{
  "name": "memory-writer",
  "scope": "global",
  "type": "custom-agent",
  "model": "claude-haiku-4-5-20251001",
  "alwaysActive": true,
  "runInParallel": true
}
```

## How It Works

### 1. Installation
```
User installs plugin
    ↓
Plugin registers memory-writer agent globally
    ↓
Agent appears in Custom Agents settings
    ↓
Agent is automatically enabled
```

### 2. Every Request
```
User makes ANY request
    ↓
Main AI processes request
    ↓  (parallel)
Memory Agent runs simultaneously
    ├─ Loads relevant context
    ├─ Tracks operations
    └─ Stores results
    ↓
Both complete
    ↓
User sees response + memory updated
```

### 3. Persistence
```
Session ends
    ↓
Memory agent saves all data
    ↓
Next session starts
    ↓
Memory agent loads previous context
    ↓
Continuity maintained
```

## Answering Rules (Mandatory)

The memory agent enforces these rules on **EVERY** user input:

### Rule 1: Load Context
```
Before processing any request:
- Load previous interactions
- Retrieve user preferences
- Check project state
- Load relevant history
```

### Rule 2: Track Operations
```
During processing:
- Log all operations
- Record decisions made
- Track files modified
- Note errors encountered
```

### Rule 3: Store Results
```
After processing:
- Store request/response pair
- Update project state
- Tag with keywords
- Maintain session continuity
```

### Rule 4: Never Block
```
All memory operations:
- Run in parallel
- Never delay main response
- Handle errors gracefully
- Complete in background if needed
```

## Integration with AI Platforms

### Antigravity Pattern
Following the Antigravity custom agent pattern:
- Agent registered globally
- Appears in Custom Agents list
- Always active toggle
- Model specified (Claude Haiku 4.5)

### OpenAI Compatible
Works with OpenAI assistants:
- Function calling for memory operations
- Parallel function execution
- Context window management

### Claude Native
Optimized for Claude:
- Uses Claude Haiku 4.5 for speed
- Tool use for memory operations
- Streaming support

## User Experience

### Transparent Operation
Users don't need to:
- Manually activate the agent
- Remember to save context
- Request memory operations
- Think about persistence

Everything happens automatically.

### User Controls
Users CAN:
- View memory stats: `@memory stats`
- Search memory: `@memory search <query>`
- Clear memory: `@memory clear`
- Export session: `@memory export`

### Example Interaction

```
User: "Create a login component"

[Main AI]
Creates the login component code...

[Memory Agent - Parallel]
✓ Loaded previous project structure
✓ Tracked: login component created
✓ Stored: component code + patterns
✓ Tagged: "login", "auth", "frontend"
✓ Updated project state

User: "Now add a logout button"

[Memory Agent - Parallel]
✓ Loaded: login component context
✓ Knows: component already exists
✓ Provides: relevant previous code
✓ Ensures: consistency with existing code
```

## Technical Implementation

### Plugin API Integration
```javascript
// Memory agent uses the plugin API
const plugin = new PowerSkillsPlugin();
const api = plugin.getAPI();

// Automatic parallel execution
class MemoryAgent {
  async processRequest(userInput) {
    // Load context
    const context = await api.memory.search(userInput);
    
    // Store input
    await api.memory.write(`input:${Date.now()}`, {
      content: userInput,
      timestamp: new Date().toISOString()
    });
    
    // Track operations (happens during main processing)
    // ...
    
    // Store results (after main processing)
    await api.memory.write(`result:${Date.now()}`, {
      response: result,
      context: context
    });
  }
}
```

### Non-Blocking Execution
```javascript
// Main request processing
async function handleRequest(input) {
  // Start memory agent in parallel
  const memoryPromise = memoryAgent.processRequest(input);
  
  // Process main request
  const response = await mainAI.process(input);
  
  // Wait for memory (or let it complete in background)
  await memoryPromise.catch(err => logError(err));
  
  return response;
}
```

## Performance

- **Latency**: < 100ms additional overhead
- **Throughput**: No impact on main request
- **Memory Usage**: ~10MB for typical session
- **Storage**: Automatic cleanup of old data

## Privacy & Security

- API keys never stored in memory
- Sensitive data flagged appropriately
- User can clear all memory anytime
- Data stored locally only (no external sharing)
- Encryption available for sensitive projects

## Troubleshooting

### Agent Not Appearing in Settings
1. Reinstall the plugin
2. Check plugin.json for agent configuration
3. Verify global scope is set
4. Restart your AI environment

### Memory Not Persisting
1. Check write permissions
2. Verify storage path
3. Check disk space
3. Review error logs: `@memory logs`

### Performance Issues
1. Clear old memory: `@memory clear old`
2. Reduce retention period
3. Check concurrent operations
4. Review memory stats: `@memory stats`

---

**Status**: 🟢 Active  
**Scope**: Global (All Requests)  
**Model**: Claude Haiku 4.5  
**Mandatory**: Yes (Cannot be disabled)
