/**
 * Test Suite for PowerSkills Memory Orchestrator
 * Comprehensive tests for all plugin functionality
 */

const PowerSkillsPlugin = require('../index');

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 PowerSkills Memory Orchestrator Test Suite\n');
    console.log('='.repeat(60));

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log('='.repeat(60));
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    console.log(`Total: ${this.tests.length} tests\n`);

    return this.failed === 0;
  }
}

const runner = new TestRunner();

// Test: Plugin Initialization
runner.test('Plugin initializes correctly', async () => {
  const plugin = new PowerSkillsPlugin();
  const session = plugin.getSessionInfo();

  if (!session.active) throw new Error('Session not active');
  if (!session.sessionId) throw new Error('Session ID not set');
});

// Test: Memory Write
runner.test('Memory write operation', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  const result = await api.memory.write('test:key', { value: 'test' });

  if (!result.success) throw new Error('Write failed');
  if (!result.key) throw new Error('Key not returned');
});

// Test: Memory Read
runner.test('Memory read operation', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  await api.memory.write('test:read', { data: 'readable' });
  const result = await api.memory.read('test:read');

  if (!result) throw new Error('Read returned null');
  if (result.value.data !== 'readable') throw new Error('Value mismatch');
});

// Test: Memory Search
runner.test('Memory search operation', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  await api.memory.write('search:item1', { value: 1 }, { tags: ['test'] });
  await api.memory.write('search:item2', { value: 2 }, { tags: ['test'] });

  const results = await api.memory.search('search', { type: 'fuzzy' });

  if (results.length < 2) throw new Error('Search found too few results');
});

// Test: Memory Delete
runner.test('Memory delete operation', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  await api.memory.write('test:delete', { value: 'deleteme' });
  const deleted = await api.memory.delete('test:delete');

  if (!deleted) throw new Error('Delete returned false');

  const result = await api.memory.read('test:delete');
  if (result !== null) throw new Error('Item still exists after delete');
});

// Test: Memory Stats
runner.test('Memory statistics', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  await api.memory.write('stats:test', { value: 'test' });
  const stats = await api.memory.stats();

  if (typeof stats.memoryCount !== 'number') throw new Error('Invalid memory count');
  if (typeof stats.memorySize !== 'number') throw new Error('Invalid memory size');
  if (!stats.sessionId) throw new Error('No session ID in stats');
});

// Test: Agent Creation
runner.test('Agent creation', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  const agentId = await api.agents.create({
    name: 'TestAgent',
    type: 'test'
  });

  if (!agentId) throw new Error('Agent ID not returned');
  if (!agentId.startsWith('agent_')) throw new Error('Invalid agent ID format');
});

// Test: Agent Execution
runner.test('Agent task execution', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  const agentId = await api.agents.create({
    name: 'ExecutionAgent',
    type: 'test'
  });

  const result = await api.agents.execute(agentId, {
    description: 'Test task',
    data: { test: true },
    platform: 'claude'
  });

  if (!result) throw new Error('No result returned');
  if (!result.platform) throw new Error('Platform not set in result');
});

// Test: Agent Status
runner.test('Agent status retrieval', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  const agentId = await api.agents.create({
    name: 'StatusAgent',
    type: 'test'
  });

  const status = await api.agents.status(agentId);

  if (!status) throw new Error('Status not returned');
  if (status.id !== agentId) throw new Error('Agent ID mismatch');
  if (!status.status) throw new Error('Status field missing');
});

// Test: Parallel Execution
runner.test('Parallel task execution', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  const tasks = [
    { name: 'Task1', description: 'Test 1', platform: 'claude' },
    { name: 'Task2', description: 'Test 2', platform: 'openai' }
  ];

  const results = await api.agents.parallel(tasks);

  if (!Array.isArray(results)) throw new Error('Results not an array');
  if (results.length !== tasks.length) throw new Error('Result count mismatch');
});

// Test: Sequential Execution
runner.test('Sequential task execution', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  const tasks = [
    { name: 'Seq1', description: 'Sequential 1', platform: 'claude' },
    { name: 'Seq2', description: 'Sequential 2', platform: 'openai' }
  ];

  const results = await api.agents.sequential(tasks);

  if (!Array.isArray(results)) throw new Error('Results not an array');
  if (results.length !== tasks.length) throw new Error('Result count mismatch');
});

// Test: Pipeline Execution
runner.test('Pipeline execution', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  const stages = [
    { name: 'Stage1', description: 'First', platform: 'claude' },
    { name: 'Stage2', description: 'Second', platform: 'openai' }
  ];

  const result = await api.agents.pipeline(stages, { input: 'test' });

  if (!result.stages) throw new Error('Stages not returned');
  if (!result.finalOutput) throw new Error('Final output missing');
});

// Test: Platform Status
runner.test('Platform status check', async () => {
  const plugin = new PowerSkillsPlugin({
    platforms: {
      claude: { enabled: true, apiKey: 'test' },
      openai: { enabled: true, apiKey: 'test' }
    }
  });
  const api = plugin.getAPI();

  const status = api.platforms.status();

  if (!Array.isArray(status)) throw new Error('Status not an array');
  if (status.length === 0) throw new Error('No platforms in status');
});

// Test: Platform Validation
runner.test('Platform credential validation', async () => {
  const plugin = new PowerSkillsPlugin({
    platforms: {
      claude: { enabled: true, apiKey: 'test-key' }
    }
  });
  const api = plugin.getAPI();

  const validation = await api.platforms.validate('claude');

  if (typeof validation.valid !== 'boolean') throw new Error('Invalid validation result');
});

// Test: Workflow Execution
runner.test('Workflow execution', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  const workflow = {
    name: 'TestWorkflow',
    initialContext: { test: true },
    steps: [
      {
        name: 'Step1',
        type: 'memory',
        operation: 'write',
        key: 'workflow:test',
        value: { data: 'test' }
      }
    ]
  };

  const result = await api.workflow.execute(workflow);

  if (!result.name) throw new Error('Workflow name missing');
  if (!result.results) throw new Error('Workflow results missing');
  if (result.status !== 'completed') throw new Error('Workflow not completed');
});

// Test: Session Export
runner.test('Session export', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  await api.memory.write('export:test', { value: 'export' });
  const exported = await api.session.export();

  if (!exported.sessionData) throw new Error('Session data missing');
  if (!exported.memory) throw new Error('Memory data missing');
  if (!exported.timestamp) throw new Error('Timestamp missing');
});

// Test: Session Pause/Resume
runner.test('Session pause and resume', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  await api.session.pause();
  let info = api.session.info();
  if (info.active) throw new Error('Session still active after pause');

  await api.session.resume();
  info = api.session.info();
  if (!info.active) throw new Error('Session not active after resume');
});

// Test: Session End
runner.test('Session end with summary', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  await api.memory.write('end:test', { value: 'test' });
  const summary = await api.session.end();

  if (!summary.sessionId) throw new Error('Session ID missing');
  if (typeof summary.duration !== 'number') throw new Error('Duration missing');
  if (summary.duration < 0) throw new Error('Duration is negative');
  if (!summary.stats) throw new Error('Stats missing');
});

// Test: Full Status
runner.test('Full status retrieval', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  const status = await api.status();

  if (!status.session) throw new Error('Session info missing');
  if (!status.memory) throw new Error('Memory info missing');
  if (!status.agents) throw new Error('Agents info missing');
  if (!status.platforms) throw new Error('Platforms info missing');
});

// Test: Event Listening
runner.test('Event emission and listening', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  let eventReceived = false;

  plugin.on('log', (log) => {
    if (log.type === 'WRITE') {
      eventReceived = true;
    }
  });

  await api.memory.write('event:test', { value: 'test' });

  // Give event a moment to fire
  await new Promise(resolve => setTimeout(resolve, 10));

  if (!eventReceived) throw new Error('Event not received');
});

// Test: Execution History
runner.test('Execution history tracking', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  const agentId = await api.agents.create({ name: 'HistoryAgent' });
  await api.agents.execute(agentId, {
    description: 'History test',
    platform: 'claude'
  });

  const history = await api.agents.history();

  if (!Array.isArray(history)) throw new Error('History not an array');
  if (history.length === 0) throw new Error('No history recorded');
});

// Test: Memory Clear with Filter
runner.test('Memory clear with filter', async () => {
  const plugin = new PowerSkillsPlugin();
  const api = plugin.getAPI();

  await api.memory.write('clear:1', { v: 1 }, { type: 'temp' });
  await api.memory.write('clear:2', { v: 2 }, { type: 'temp' });
  await api.memory.write('keep:1', { v: 3 }, { type: 'perm' });

  const cleared = await api.memory.clear({ type: 'temp' });

  if (cleared < 2) throw new Error('Not enough items cleared');

  const kept = await api.memory.read('keep:1');
  if (!kept) throw new Error('Permanent item was cleared');
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
