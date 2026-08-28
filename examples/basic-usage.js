/**
 * Basic Usage Example
 * Demonstrates core functionality of PowerSkills Memory Orchestrator
 */

const PowerSkillsPlugin = require('../index');

async function main() {
  console.log('🚀 Initializing PowerSkills Memory Orchestrator...\n');

  // Initialize plugin with configuration
  const plugin = new PowerSkillsPlugin({
    memory: {
      persistencePath: './data/memory',
      compressionEnabled: true,
      encryptionEnabled: false,
      maxMemorySize: 100000000
    },
    platforms: {
      openai: {
        enabled: true,
        apiKey: process.env.OPENAI_API_KEY || 'demo-key',
        defaultModel: 'gpt-4'
      },
      claude: {
        enabled: true,
        apiKey: process.env.CLAUDE_API_KEY || 'demo-key',
        defaultModel: 'claude-opus-5'
      },
      antigravity: {
        enabled: true,
        apiKey: process.env.ANTIGRAVITY_API_KEY || 'demo-key'
      }
    },
    orchestrator: {
      maxConcurrentAgents: 10,
      defaultTimeout: 300000,
      retryAttempts: 3
    }
  });

  // Get API
  const api = plugin.getAPI();

  console.log('✅ Plugin initialized\n');
  console.log('Session Info:', api.session.info(), '\n');

  // ========== MEMORY OPERATIONS ==========
  console.log('📝 Testing Memory Operations...');

  // Write some data
  await api.memory.write('user:profile', {
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'dark',
      notifications: true
    }
  }, {
    type: 'user',
    tags: ['profile', 'user-data']
  });
  console.log('  ✓ Written user profile');

  await api.memory.write('config:settings', {
    apiVersion: '1.0',
    features: ['memory', 'agents', 'workflows'],
    maxRetries: 3
  }, {
    type: 'config',
    tags: ['settings', 'configuration']
  });
  console.log('  ✓ Written configuration');

  // Read data
  const userProfile = await api.memory.read('user:profile');
  console.log('  ✓ Read user profile:', userProfile.value.name);

  // Search memory
  const searchResults = await api.memory.search('user', { type: 'fuzzy' });
  console.log(`  ✓ Search found ${searchResults.length} result(s)`);

  // Get memory stats
  const memStats = await api.memory.stats();
  console.log('  ✓ Memory stats:', {
    count: memStats.memoryCount,
    size: memStats.memorySize
  });

  console.log('\n');

  // ========== AGENT OPERATIONS ==========
  console.log('🤖 Testing Agent Operations...');

  // Create an agent
  const agentId = await api.agents.create({
    name: 'DataProcessor',
    type: 'general-purpose'
  });
  console.log(`  ✓ Created agent: ${agentId}`);

  // Execute a task
  const taskResult = await api.agents.execute(agentId, {
    description: 'Process user data',
    data: { userId: '123', action: 'analyze' },
    platform: 'claude',
    model: 'claude-opus-5'
  });
  console.log('  ✓ Task executed:', taskResult.platform);

  // Get agent status
  const agentStatus = await api.agents.status(agentId);
  console.log('  ✓ Agent status:', agentStatus.status);

  console.log('\n');

  // ========== PARALLEL EXECUTION ==========
  console.log('⚡ Testing Parallel Execution...');

  const parallelTasks = [
    {
      name: 'Analysis-1',
      description: 'Analyze dataset A',
      platform: 'openai',
      data: { dataset: 'A' }
    },
    {
      name: 'Analysis-2',
      description: 'Analyze dataset B',
      platform: 'claude',
      data: { dataset: 'B' }
    },
    {
      name: 'Analysis-3',
      description: 'Analyze dataset C',
      platform: 'antigravity',
      data: { dataset: 'C' }
    }
  ];

  const parallelResults = await api.agents.parallel(parallelTasks);
  console.log(`  ✓ Executed ${parallelResults.length} tasks in parallel`);

  console.log('\n');

  // ========== WORKFLOW EXECUTION ==========
  console.log('🔄 Testing Workflow Execution...');

  const workflow = {
    name: 'Data Processing Pipeline',
    initialContext: { userId: '123', timestamp: Date.now() },
    steps: [
      {
        name: 'Fetch User Data',
        type: 'memory',
        operation: 'read',
        key: 'user:profile',
        updateContext: true
      },
      {
        name: 'Process Data',
        type: 'agent',
        agentType: 'data-processor',
        task: {
          description: 'Process fetched data',
          platform: 'claude',
          data: {}
        },
        updateContext: true
      },
      {
        name: 'Store Results',
        type: 'memory',
        operation: 'write',
        key: 'processed:user:123',
        value: { processed: true, timestamp: Date.now() },
        options: {
          type: 'result',
          tags: ['processed', 'workflow-result']
        }
      }
    ]
  };

  const workflowResult = await api.workflow.execute(workflow);
  console.log(`  ✓ Workflow completed: ${workflowResult.name}`);
  console.log(`  ✓ Duration: ${workflowResult.duration}ms`);
  console.log(`  ✓ Steps: ${workflowResult.results.length}`);

  console.log('\n');

  // ========== PLATFORM STATUS ==========
  console.log('🌐 Platform Status:');
  const platformStatus = api.platforms.status();
  platformStatus.forEach(platform => {
    console.log(`  ${platform.enabled ? '✓' : '✗'} ${platform.platform}: ${platform.model}`);
  });

  console.log('\n');

  // ========== SESSION EXPORT ==========
  console.log('💾 Exporting Session...');
  const sessionExport = await api.session.export();
  console.log('  ✓ Session exported:', {
    sessionId: sessionExport.sessionData.sessionId,
    memoryCount: sessionExport.memory.stats.memoryCount,
    logsCount: sessionExport.memory.logs.length
  });

  console.log('\n');

  // ========== FINAL STATUS ==========
  console.log('📊 Final Status:');
  const fullStatus = await api.status();
  console.log('  Session:', fullStatus.session.sessionId);
  console.log('  Uptime:', fullStatus.session.uptime + 'ms');
  console.log('  Memory items:', fullStatus.memory.memoryCount);
  console.log('  Active agents:', fullStatus.agents.length);
  console.log('  Total logs:', fullStatus.memory.totalLogs);

  console.log('\n');

  // ========== END SESSION ==========
  const summary = await api.session.end();
  console.log('✅ Session ended successfully');
  console.log('📈 Session Summary:', {
    duration: summary.duration + 'ms',
    memoryItems: summary.stats.memoryCount,
    agentCount: summary.agents.length
  });
}

// Run the example
main().catch(console.error);
