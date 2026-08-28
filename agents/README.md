# Global Memory Agent Configuration

This directory contains the **Memory Writer** agent that runs globally in parallel with all requests.

## Agent: memory-writer

**Status**: 🟢 Global / Always Active  
**Model**: Claude Haiku 4.5 (exclusive)  
**Scope**: Runs with every single request

### Files

- `memory-writer.md` - Agent documentation and behavior specification
- `memory-writer.json` - Agent configuration and metadata

### How It Works

1. **Global Registration**: Agent is registered in plugin.json as a global custom agent
2. **Auto-Activation**: Automatically activates when plugin is installed
3. **Parallel Execution**: Runs alongside main request without blocking
4. **Memory Operations**: Uses PowerSkills Memory Orchestrator API

### Antigravity Integration

Following the Antigravity custom agent pattern:

```
Custom Agents [1]
├─ memory-writer [Global]
   ├─ Manages persistent project memory
   ├─ Project structure tracking
   └─ Uses Claude Haiku 4.5 exclusively
```

### Mandatory Behavior

**For EVERY request**:
1. ✅ Load relevant memory (previous context)
2. ✅ Track operations (what's happening)
3. ✅ Store results (outcomes + metadata)
4. ✅ Update session state (continuity)

### Answering Rules Applied

The memory agent enforces answering rules on **every** interaction:

- Before: Load context and preferences
- During: Track decisions and operations
- After: Store results and update state

### Integration with Main Plugin

```javascript
// The plugin automatically integrates with the memory agent
const plugin = new PowerSkillsPlugin();
const api = plugin.getAPI();

// Memory agent uses this API automatically
// No manual setup required
```

### Privacy & Security

- API keys and secrets are NEVER stored
- Sensitive data is flagged appropriately
- User can clear memory anytime
- Automatic cleanup of old data

### Performance

- Target latency: < 100ms per operation
- Non-blocking parallel execution
- Background processing for heavy operations
- Automatic retry on failure

### User Commands

Users can interact with memory:

```
@memory search <query>     - Search stored memory
@memory show recent        - Show recent interactions  
@memory clear <filter>     - Clear specific memory
@memory export             - Export session data
@memory stats              - View memory statistics
```

### Status Check

To verify the agent is active:

```javascript
// In your AI environment
const status = await plugin.getAgentStatus('memory-writer');
console.log(status); 
// { active: true, model: 'claude-haiku-4-5', scope: 'global' }
```

---

**Note**: This agent is mandatory and cannot be disabled. It's essential for maintaining session continuity and context across all interactions.
