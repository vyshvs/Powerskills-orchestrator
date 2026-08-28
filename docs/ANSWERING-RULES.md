# Memory Agent - Answering Rules

## Mandatory Behavior for ALL Requests

This document defines the **mandatory answering rules** that the memory agent MUST follow for every single user interaction, without exception.

---

## Core Principle

**EVERY user input triggers the complete memory cycle:**
1. **Load** → Previous context
2. **Track** → Current operations
3. **Store** → Results and state

**No exceptions** - even for simple queries like "hello" or trivial questions.

---

## Rule 1: Pre-Processing (Load Context)

### When: Before ANY request is processed

### Actions:
```
1. Load session history
   - Previous 10 interactions minimum
   - Active project context
   - Current session state

2. Retrieve user preferences
   - Coding style preferences
   - Language preferences
   - Tool preferences

3. Check project state
   - Files structure
   - Current tasks
   - Recent changes

4. Load relevant context
   - Related previous requests
   - Similar patterns
   - Important notes
```

### Implementation:
```javascript
async function preProcess(userInput) {
  // Load session history
  const history = await api.memory.search('session:history', {
    type: 'tags',
    limit: 10,
    orderBy: 'recent'
  });
  
  // Retrieve preferences
  const preferences = await api.memory.read('user:preferences');
  
  // Check project state
  const projectState = await api.memory.read('project:state');
  
  // Find relevant context
  const context = await api.memory.search(userInput, {
    type: 'fuzzy',
    limit: 5
  });
  
  return { history, preferences, projectState, context };
}
```

### Time Limit: < 50ms

---

## Rule 2: Active Tracking (During Processing)

### When: While the main request is being processed

### Actions:
```
1. Track operations in real-time
   - Commands executed
   - Files accessed
   - APIs called
   - Functions used

2. Log decision points
   - Why this approach?
   - What alternatives considered?
   - What was the reasoning?

3. Record intermediate results
   - Partial outputs
   - Error states
   - Progress checkpoints

4. Monitor for errors
   - Capture error messages
   - Log error context
   - Store recovery actions
```

### Implementation:
```javascript
async function trackOperation(operation) {
  const trackingEntry = {
    timestamp: Date.now(),
    type: 'operation',
    operation: operation.name,
    details: operation.details,
    stage: 'in-progress'
  };
  
  await api.memory.write(
    `track:${operation.id}`,
    trackingEntry,
    { type: 'tracking', tags: ['real-time', operation.category] }
  );
}
```

### Time Limit: Non-blocking (background)

---

## Rule 3: Post-Processing (Store Results)

### When: After request is completed

### Actions:
```
1. Store request/response pair
   - Full user input
   - Complete response
   - Timestamp and metadata

2. Update project state
   - Files modified
   - New components created
   - Dependencies changed

3. Tag appropriately
   - Extract keywords
   - Identify categories
   - Link related memories

4. Update session state
   - Interaction count
   - Session progress
   - Active context
```

### Implementation:
```javascript
async function postProcess(request, response) {
  // Store request/response
  await api.memory.write(
    `interaction:${Date.now()}`,
    {
      request: request,
      response: response,
      timestamp: new Date().toISOString()
    },
    {
      type: 'interaction',
      tags: extractKeywords(request + ' ' + response)
    }
  );
  
  // Update project state
  if (response.filesModified) {
    const state = await api.memory.read('project:state');
    state.files = [...state.files, ...response.filesModified];
    await api.memory.write('project:state', state);
  }
  
  // Update session
  await api.memory.write('session:last-interaction', {
    timestamp: Date.now(),
    summary: summarize(response)
  });
}
```

### Time Limit: < 100ms

---

## Rule 4: Error Handling

### When: Any error occurs during memory operations

### Actions:
```
1. Log the error
   - Error type and message
   - Context and stack trace
   - Timestamp and session ID

2. Never block main request
   - Memory errors are non-fatal
   - Main response always returns
   - Retry in background

3. Graceful degradation
   - Continue without context if load fails
   - Skip storage if write fails
   - Alert user only on persistent failures

4. Auto-recovery
   - Retry failed operations 3 times
   - Exponential backoff
   - Report if all retries fail
```

### Implementation:
```javascript
async function safeMemoryOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    // Log error
    console.error('Memory operation failed:', error);
    
    // Don't block main request
    return null;
    
    // Retry in background
    setTimeout(() => retryOperation(operation), 1000);
  }
}
```

---

## Rule 5: Privacy & Security

### When: Handling any data

### Actions:
```
1. Never store secrets
   - API keys
   - Passwords
   - Tokens
   - Private keys

2. Flag sensitive data
   - Personal information
   - Financial data
   - Health information

3. Honor deletion requests
   - Immediate removal
   - Cascade to related data
   - Confirm deletion

4. Respect retention policies
   - Auto-delete old data
   - Keep only relevant history
   - Compress archived data
```

### Implementation:
```javascript
async function sanitizeData(data) {
  const sensitive = detectSensitive(data);
  
  if (sensitive.containsSecrets) {
    data = redactSecrets(data);
  }
  
  if (sensitive.isPersonal) {
    data.metadata.sensitive = true;
    data.metadata.retention = '30days';
  }
  
  return data;
}
```

---

## Rule 6: Performance Guarantees

### Time Limits:
- Pre-processing: < 50ms
- Post-processing: < 100ms
- Tracking: Non-blocking background
- Total overhead: < 150ms per request

### Resource Limits:
- Memory usage: < 10MB per session
- Disk storage: < 100MB per project
- Network: 0 (all local)

### Failure Handling:
- If memory operations take > 200ms → move to background
- If storage exceeds 100MB → auto-cleanup
- If errors persist > 3 times → alert user

---

## Rule 7: Continuity Across Sessions

### When: Session starts or ends

### Session Start:
```
1. Load previous session data
2. Restore context
3. Resume where user left off
4. Alert if significant time gap
```

### Session End:
```
1. Save complete session state
2. Mark session as ended
3. Clean up temporary data
4. Prepare for next session
```

---

## Examples

### Example 1: Simple Query

**User**: "What's 2+2?"

**Memory Agent**:
```
[Pre] Load context... (nothing relevant)
[Track] User asked math question
[Store] Input: "What's 2+2?", Output: "4", Tags: ["math", "simple"]
```

### Example 2: Code Request

**User**: "Add error handling to the login function"

**Memory Agent**:
```
[Pre] Load context...
  - Found: login function code (created 2 days ago)
  - Found: user prefers try-catch style
  - Found: project uses custom error handler

[Track] 
  - Locating login function
  - Adding try-catch block
  - Importing error handler

[Store]
  - Modified: login.js
  - Added: error handling
  - Pattern: try-catch with custom handler
  - Tags: ["error-handling", "login", "refactor"]
  - Context: Links to previous login creation
```

### Example 3: Project Question

**User**: "What components did we create yesterday?"

**Memory Agent**:
```
[Pre] Load context...
  - Found: 5 components created yesterday
  - Found: session from yesterday

[Track]
  - Searching memory for yesterday's date
  - Filtering by type: "component"

[Store]
  - Query: components from yesterday
  - Response: List of 5 components
  - Tags: ["query", "history", "components"]
```

---

## Compliance Checklist

For EVERY request, verify:

- [ ] Context loaded before processing
- [ ] Operations tracked during processing
- [ ] Results stored after processing
- [ ] Errors handled gracefully
- [ ] Privacy rules respected
- [ ] Performance within limits
- [ ] Continuity maintained
- [ ] User preferences honored

---

## Monitoring

Track these metrics:

- **Coverage**: % of requests with full memory cycle
- **Latency**: Average time for memory operations
- **Errors**: Failed memory operations
- **Storage**: Total memory used
- **Retrieval**: Context relevance score

**Target**: 100% coverage, <150ms latency, <0.1% errors

---

**Status**: Mandatory  
**Enforcement**: Automatic  
**Exceptions**: None  
**Override**: Not permitted
