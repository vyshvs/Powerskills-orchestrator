# Quick Start Guide

## Installation

```bash
npm install powerskills-memory-orchestrator
```

Or clone and use locally:
```bash
git clone <repository-url>
cd Powerskills-orchestrator
npm install
```

## 5-Minute Quick Start

### Step 1: Initialize the Plugin

```javascript
const PowerSkillsPlugin = require('powerskills-memory-orchestrator');

const plugin = new PowerSkillsPlugin({
  platforms: {
    claude: {
      enabled: true,
      apiKey: 'your-claude-api-key'
    }
  }
});

const api = plugin.getAPI();
```

### Step 2: Store Some Data

```javascript
// Write to memory
await api.memory.write('user:123', {
  name: 'Alice',
  role: 'developer'
});

// Read from memory
const user = await api.memory.read('user:123');
console.log(user.value.name); // "Alice"
```

### Step 3: Create and Run an Agent

```javascript
// Create an agent
const agentId = await api.agents.create({
  name: 'MyAgent',
  type: 'general-purpose'
});

// Execute a task
const result = await api.agents.execute(agentId, {
  description: 'Analyze user data',
  platform: 'claude',
  data: { userId: '123' }
});

console.log(result);
```

### Step 4: Run Tasks in Parallel

```javascript
const results = await api.agents.parallel([
  { name: 'Task1', description: 'Process A', platform: 'claude' },
  { name: 'Task2', description: 'Process B', platform: 'claude' },
  { name: 'Task3', description: 'Process C', platform: 'claude' }
]);

console.log(`Completed ${results.length} tasks`);
```

## Run the Examples

### Basic Usage Example
```bash
npm start
```

### Advanced Demo
```bash
npm run demo
```

### Run Tests
```bash
npm test
```

## Common Patterns

### Pattern 1: Data Processing Pipeline

```javascript
const result = await api.agents.pipeline([
  {
    name: 'Load Data',
    description: 'Load from source',
    platform: 'claude'
  },
  {
    name: 'Transform',
    description: 'Transform data',
    platform: 'claude'
  },
  {
    name: 'Save',
    description: 'Save results',
    platform: 'claude'
  }
], { input: 'raw-data' });
```

### Pattern 2: Multi-Platform Analysis

```javascript
const workflow = {
  name: 'Multi-Platform Analysis',
  steps: [
    {
      name: 'Parallel Analysis',
      type: 'parallel',
      tasks: [
        { name: 'OpenAI', platform: 'openai', description: 'Analyze with GPT' },
        { name: 'Claude', platform: 'claude', description: 'Analyze with Claude' }
      ]
    },
    {
      name: 'Aggregate',
      type: 'custom',
      execute: async (context, plugin) => {
        // Your aggregation logic
        return { aggregated: true };
      }
    }
  ]
};

await api.workflow.execute(workflow);
```

### Pattern 3: Session Management

```javascript
// Do some work
await api.memory.write('data:1', { value: 'test' });
await api.agents.create({ name: 'Worker' });

// Export session
const sessionData = await api.session.export();

// Later, import session
const newPlugin = new PowerSkillsPlugin();
const newApi = newPlugin.getAPI();
await newApi.session.import(sessionData);
```

## Environment Variables

Create a `.env` file:

```env
OPENAI_API_KEY=your-openai-key
CLAUDE_API_KEY=your-claude-key
ANTIGRAVITY_API_KEY=your-antigravity-key
```

Load in your code:

```javascript
require('dotenv').config(); // If using dotenv package

const plugin = new PowerSkillsPlugin({
  platforms: {
    openai: {
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY
    },
    claude: {
      enabled: true,
      apiKey: process.env.CLAUDE_API_KEY
    }
  }
});
```

## Next Steps

1. Read the [full README](README.md) for detailed API documentation
2. Check [ARCHITECTURE.md](ARCHITECTURE.md) to understand the design
3. Review [examples/](examples/) for more complex use cases
4. Read [ISOLATION.md](ISOLATION.md) to understand the standalone architecture

## Getting Help

- Check the [README](README.md) for API reference
- Review [examples/](examples/) for usage patterns
- Run tests to see expected behavior: `npm test`

## Common Issues

**Issue**: "Session is not active"
**Solution**: The session was ended or paused. Call `api.session.resume()` or create a new plugin instance.

**Issue**: Platform validation fails
**Solution**: Check that your API key is correct and the platform is enabled in the config.

**Issue**: Agent execution timeout
**Solution**: Increase `defaultTimeout` in orchestrator config.

## Quick Reference Card

```javascript
// Memory
api.memory.write(key, value, options)
api.memory.read(key)
api.memory.search(query, options)
api.memory.delete(key)

// Agents
api.agents.create(config)
api.agents.execute(agentId, task)
api.agents.parallel(tasks)
api.agents.sequential(tasks)
api.agents.pipeline(stages, data)

// Workflows
api.workflow.execute(workflow)

// Session
api.session.info()
api.session.export()
api.session.end()

// Utilities
api.status()
api.logs(filter)
plugin.on('log', callback)
```

That's it! You're ready to use PowerSkills Memory Orchestrator.
