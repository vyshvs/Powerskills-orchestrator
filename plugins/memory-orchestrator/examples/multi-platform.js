/**
 * Example: Multi-Platform Integration
 * Demonstrates using the plugin across Claude, OpenAI, and Antigravity
 */

import MemoryOrchestrator from '../index.js';
import PlatformAdapterFactory from '../adapters.js';

async function runMultiPlatformDemo() {
  console.log('🌐 Multi-Platform Integration Demo\n');

  // Create orchestrators for each platform
  const platforms = ['claude', 'openai', 'antigravity'];
  const results = {};

  for (const platform of platforms) {
    console.log(`\n📦 Testing ${platform.toUpperCase()} platform...`);

    const orchestrator = new MemoryOrchestrator({
      platform,
      memoryDir: `./.memory/${platform}-demo`
    });

    const adapter = PlatformAdapterFactory.create(platform, orchestrator);

    // Start phase
    orchestrator.startPhase('Integration Test', `Testing ${platform} integration`);

    // Auto-pick tools
    const tools = await orchestrator.autoPickTools();
    console.log(`  Discovered ${tools.skills.length + tools.plugins.length + tools.mcps.length} tools`);

    // Get platform-specific tools
    const platformTools = adapter.getAvailableTools();
    console.log(`  Platform tools: ${platformTools.join(', ')}`);

    // Create sub-agent
    await orchestrator.createSubAgent(`${platform}-worker`, {
      role: 'test-executor',
      platform
    });

    // Execute task
    const result = await adapter.executeWithMemory(
      'Test platform compatibility',
      { phaseName: 'Compatibility Test' }
    );

    // Complete sub-agent
    orchestrator.completeSubAgent(`${platform}-worker`, {
      success: true,
      platform
    });

    // Complete phase
    orchestrator.completePhase(`${platform} integration tested successfully`);

    // Generate checklist
    const checklist = orchestrator.generateChecklist();
    console.log(`  ✅ Completed ${checklist.filter(c => c.completed).length} phases`);

    results[platform] = {
      success: true,
      tools: platformTools,
      phases: checklist.length
    };
  }

  console.log('\n📊 Summary:');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

/**
 * Example: Complex Workflow with Memory Persistence
 */
async function runComplexWorkflow() {
  console.log('\n\n🚀 Complex Workflow Demo\n');

  const orchestrator = new MemoryOrchestrator({
    platform: 'claude',
    memoryDir: './.memory/complex-workflow'
  });

  // Phase 1: Setup
  orchestrator.startPhase('Setup', 'Initialize project structure');
  orchestrator.createScaffolding('project-structure', {
    directories: ['src', 'tests', 'docs'],
    files: ['README.md', 'package.json']
  });
  orchestrator.writeMemory('setup-complete', { scaffolding: 'project-structure' });
  orchestrator.completePhase('Setup completed');

  // Phase 2: Development
  orchestrator.startPhase('Development', 'Implement features');

  const devAgents = ['frontend-dev', 'backend-dev', 'database-dev'];
  for (const agent of devAgents) {
    await orchestrator.createSubAgent(agent, { role: 'developer' });
  }

  orchestrator.writeMemory('development-progress', { agents: devAgents.length });

  for (const agent of devAgents) {
    orchestrator.completeSubAgent(agent, { filesCreated: 15 });
  }

  orchestrator.completePhase('Development completed');

  // Phase 3: Testing
  orchestrator.startPhase('Testing', 'Run comprehensive tests');
  await orchestrator.createSubAgent('tester', { role: 'qa' });
  orchestrator.writeMemory('test-results', { passed: 150, failed: 0 });
  orchestrator.completeSubAgent('tester', { coverage: '95%' });
  orchestrator.completePhase('Testing completed');

  // Phase 4: Deployment
  orchestrator.startPhase('Deployment', 'Deploy to production');
  orchestrator.writeMemory('deployment-status', { environment: 'production' });
  orchestrator.completePhase('Deployment completed');

  // Generate final report
  const report = orchestrator.generateReport();
  console.log('\n📊 Workflow Report:');
  console.log(`  Total Phases: ${report.summary.totalPhases}`);
  console.log(`  Completed: ${report.summary.completedPhases}`);
  console.log(`  Duration: ${Math.round(report.summary.totalDuration / 1000)}s`);
  console.log(`  Sub-agents: ${report.summary.subAgents}`);
  console.log(`  Memory Entries: ${report.memory.length}`);

  // Tear down scaffolding
  orchestrator.tearDownScaffolding('project-structure');

  // Mark everything completed
  const summary = orchestrator.markAllCompleted();
  console.log('\n✅ All tasks completed!');

  return report;
}

/**
 * Example: Read and Query Memory
 */
async function demonstrateMemoryQueries() {
  console.log('\n\n🧠 Memory Query Demo\n');

  const orchestrator = new MemoryOrchestrator({
    memoryDir: './.memory/memory-demo'
  });

  // Write various memory entries
  orchestrator.startPhase('Data Collection', 'Collecting system data');

  orchestrator.writeMemory('system-info', {
    os: 'Windows 11',
    node: 'v24.19.0',
    memory: '16GB'
  });

  orchestrator.writeMemory('performance-metric', {
    cpu: 45,
    memory: 60,
    disk: 70
  });

  orchestrator.writeMemory('checkpoint', {
    step: 1,
    status: 'ok'
  });

  orchestrator.completePhase('Data collection completed');

  // Query memory
  console.log('📖 Querying memory...\n');

  const allMemory = orchestrator.readMemory();
  console.log(`  Total entries: ${allMemory.length}`);

  const phaseMemory = orchestrator.readMemory({ phase: 'Data Collection' });
  console.log(`  Phase entries: ${phaseMemory.length}`);

  const checkpoints = orchestrator.readMemory({ type: 'checkpoint' });
  console.log(`  Checkpoints: ${checkpoints.length}`);

  // Display memory details
  console.log('\n📝 Memory Entries:');
  allMemory.forEach(entry => {
    console.log(`  [${entry.type}] ${entry.timestamp}`);
    console.log(`    Phase: ${entry.phase}`);
    console.log(`    Data: ${JSON.stringify(entry.data)}`);
  });

  return allMemory;
}

// Run all demos
async function main() {
  try {
    await runMultiPlatformDemo();
    await runComplexWorkflow();
    await demonstrateMemoryQueries();

    console.log('\n\n✨ All demos completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    process.exit(1);
  }
}

main();
