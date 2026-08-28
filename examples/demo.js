/**
 * Advanced Demo
 * Demonstrates advanced features including custom workflows and error handling
 */

const PowerSkillsPlugin = require('../index');

async function advancedDemo() {
  console.log('🎯 PowerSkills Memory Orchestrator - Advanced Demo\n');

  const plugin = new PowerSkillsPlugin({
    memory: {
      persistencePath: './data/advanced',
      compressionEnabled: true
    },
    platforms: {
      claude: { enabled: true, apiKey: 'demo-key', defaultModel: 'claude-opus-5' },
      openai: { enabled: true, apiKey: 'demo-key', defaultModel: 'gpt-4' },
      antigravity: { enabled: true, apiKey: 'demo-key' }
    },
    orchestrator: {
      maxConcurrentAgents: 5
    }
  });

  const api = plugin.getAPI();

  // Listen to all events
  plugin.on('log', (log) => {
    console.log(`[${log.type}] ${log.message}`);
  });

  console.log('\n=== ADVANCED WORKFLOW WITH CUSTOM STEPS ===\n');

  const advancedWorkflow = {
    name: 'Multi-Platform Analysis Pipeline',
    initialContext: {
      targetData: 'sample-dataset',
      analysisType: 'comprehensive'
    },
    steps: [
      {
        name: 'Initial Memory Check',
        type: 'custom',
        execute: async (context, plugin) => {
          console.log('  → Checking existing memory...');
          const existing = await plugin.readMemory(`analysis:${context.targetData}`);
          return {
            cached: existing !== null,
            data: existing?.value
          };
        },
        updateContext: true
      },
      {
        name: 'Parallel Analysis',
        type: 'parallel',
        tasks: [
          {
            name: 'OpenAI Analysis',
            description: 'Analyze with GPT-4',
            platform: 'openai',
            data: { source: 'openai' }
          },
          {
            name: 'Claude Analysis',
            description: 'Analyze with Claude',
            platform: 'claude',
            data: { source: 'claude' }
          },
          {
            name: 'Antigravity Analysis',
            description: 'Analyze with Antigravity',
            platform: 'antigravity',
            data: { source: 'antigravity' }
          }
        ],
        updateContext: true
      },
      {
        name: 'Aggregate Results',
        type: 'custom',
        execute: async (context, plugin) => {
          console.log('  → Aggregating multi-platform results...');
          const aggregated = {
            platforms: ['openai', 'claude', 'antigravity'],
            timestamp: Date.now(),
            summary: 'Combined analysis complete'
          };
          return aggregated;
        },
        updateContext: true
      },
      {
        name: 'Store Final Results',
        type: 'memory',
        operation: 'write',
        key: 'analysis:final-result',
        value: { status: 'completed', analyzed: true },
        options: {
          type: 'analysis-result',
          tags: ['analysis', 'multi-platform', 'final']
        }
      }
    ]
  };

  const result = await api.workflow.execute(advancedWorkflow);
  console.log('\n✅ Advanced workflow completed');
  console.log(`   Duration: ${result.duration}ms`);
  console.log(`   Steps executed: ${result.results.length}`);

  console.log('\n=== PIPELINE EXECUTION ===\n');

  const pipelineStages = [
    {
      name: 'Stage 1: Preprocessing',
      description: 'Preprocess input data',
      platform: 'claude'
    },
    {
      name: 'Stage 2: Analysis',
      description: 'Analyze preprocessed data',
      platform: 'openai'
    },
    {
      name: 'Stage 3: Postprocessing',
      description: 'Generate final output',
      platform: 'antigravity'
    }
  ];

  const pipelineResult = await api.agents.pipeline(pipelineStages, {
    input: 'raw-data',
    config: { verbose: true }
  });

  console.log('\n✅ Pipeline completed');
  console.log(`   Stages: ${pipelineResult.stages.length}`);

  console.log('\n=== SEQUENTIAL WITH ERROR HANDLING ===\n');

  const sequentialTasks = [
    {
      name: 'Task 1',
      description: 'First sequential task',
      platform: 'claude'
    },
    {
      name: 'Task 2',
      description: 'Second sequential task',
      platform: 'openai'
    },
    {
      name: 'Task 3',
      description: 'Third sequential task',
      platform: 'antigravity'
    }
  ];

  const seqResults = await api.agents.sequential(sequentialTasks, {
    continueOnError: true
  });

  console.log('\n✅ Sequential execution completed');
  console.log(`   Tasks: ${seqResults.length}`);

  console.log('\n=== MEMORY SEARCH AND FILTERING ===\n');

  // Write various types of data
  await api.memory.write('test:data1', { value: 'test1' }, { type: 'test', tags: ['alpha', 'beta'] });
  await api.memory.write('test:data2', { value: 'test2' }, { type: 'test', tags: ['beta', 'gamma'] });
  await api.memory.write('test:data3', { value: 'test3' }, { type: 'production', tags: ['gamma'] });

  // Search by different methods
  const fuzzySearch = await api.memory.search('test', { type: 'fuzzy' });
  console.log(`Fuzzy search 'test': ${fuzzySearch.length} results`);

  const tagSearch = await api.memory.search('beta', { type: 'tags' });
  console.log(`Tag search 'beta': ${tagSearch.length} results`);

  console.log('\n=== EXECUTION HISTORY ===\n');

  const history = await api.agents.history({ limit: 5 });
  console.log(`Recent executions: ${history.length}`);
  history.forEach((exec, i) => {
    console.log(`  ${i + 1}. ${exec.status} - ${exec.duration || 'N/A'}ms`);
  });

  console.log('\n=== AGENT LIFECYCLE ===\n');

  // Create multiple agents
  const agent1 = await api.agents.create({ name: 'Agent-A', type: 'worker' });
  const agent2 = await api.agents.create({ name: 'Agent-B', type: 'worker' });
  const agent3 = await api.agents.create({ name: 'Agent-C', type: 'worker' });

  console.log(`Created 3 agents: ${agent1}, ${agent2}, ${agent3}`);

  // List all agents
  const allAgents = await api.agents.list();
  console.log(`Total active agents: ${allAgents.length}`);

  // Terminate one agent
  await api.agents.terminate(agent1);
  console.log(`Terminated ${agent1}`);

  const remainingAgents = await api.agents.list();
  console.log(`Remaining agents: ${remainingAgents.length}`);

  console.log('\n=== PLATFORM VALIDATION ===\n');

  for (const platform of ['openai', 'claude', 'antigravity']) {
    const validation = await api.platforms.validate(platform);
    console.log(`${platform}: ${validation.valid ? '✓ Valid' : '✗ Invalid'}`);

    if (validation.valid) {
      const models = await api.platforms.models(platform);
      console.log(`  Available models: ${models.join(', ')}`);
    }
  }

  console.log('\n=== FINAL SESSION SUMMARY ===\n');

  const finalStatus = await api.status();
  console.log('Session:', {
    id: finalStatus.session.sessionId,
    uptime: `${Math.round(finalStatus.session.uptime / 1000)}s`,
    active: finalStatus.session.active
  });

  console.log('\nMemory:', {
    count: finalStatus.memory.memoryCount,
    size: `${Math.round(finalStatus.memory.memorySize / 1024)}KB`,
    logs: finalStatus.memory.totalLogs
  });

  console.log('\nAgents:', {
    total: finalStatus.agents.length,
    types: [...new Set(finalStatus.agents.map(a => a.type))]
  });

  console.log('\nPlatforms:', finalStatus.platforms.map(p =>
    `${p.platform}: ${p.enabled ? 'enabled' : 'disabled'}`
  ).join(', '));

  // Export and display
  const sessionExport = await api.session.export();
  console.log('\n📦 Session exported with', sessionExport.memory.logs.length, 'log entries');

  // End session
  const summary = await api.session.end();
  console.log('\n✅ Demo completed successfully!');
  console.log(`Total session duration: ${Math.round(summary.duration / 1000)}s`);
}

advancedDemo().catch(console.error);
