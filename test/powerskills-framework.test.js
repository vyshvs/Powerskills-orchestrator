/**
 * PowerSkills Framework Tests
 * Comprehensive testing for all PowerSkills components
 */

const PowerSkillsPlugin = require('../index');

// Test suite
const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n🧪 PowerSkills Framework Test Suite\n');
  console.log('============================================================');

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      results.passed++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      results.failed++;
    }
  }

  console.log('============================================================\n');
  console.log(`📊 Results: ${results.passed} passed, ${results.failed} failed`);
  console.log(`Total: ${tests.length} tests\n`);

  process.exit(results.failed > 0 ? 1 : 0);
}

// Test: Plugin initialization with PowerSkills
test('Plugin initializes with PowerSkills framework', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  if (!plugin.skillRegistry) throw new Error('SkillRegistry not initialized');
  if (!plugin.agentTemplateManager) throw new Error('AgentTemplateManager not initialized');
  if (!plugin.commandDispatcher) throw new Error('CommandDispatcher not initialized');
  if (!plugin.taskRouter) throw new Error('TaskRouter not initialized');
  if (!plugin.tokenBudgetTracker) throw new Error('TokenBudgetTracker not initialized');
  if (!plugin.verificationLoop) throw new Error('VerificationLoop not initialized');
  if (!plugin.orchestrationGates) throw new Error('OrchestrationGates not initialized');
});

// Test: Skill Registry
test('SkillRegistry loads core skills', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const skillCount = plugin.skillRegistry.getSkillCount();
  // Now we have 5 core skills + 39 converted skills = 44 total
  if (skillCount < 40) throw new Error(`Expected at least 40 skills, got ${skillCount}`);
});

test('SkillRegistry matches skills by task type', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const skill = plugin.skillRegistry.matchSkill('RESEARCH', 'research AI in healthcare');
  if (!skill) throw new Error('No skill matched for RESEARCH task');
  if (skill.name !== 'deep-research') throw new Error(`Expected deep-research, got ${skill.name}`);
});

test('SkillRegistry executes skills', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const result = await plugin.skillRegistry.executeSkill('deep-research', {
    userMessage: 'research quantum computing'
  });

  if (!result) throw new Error('Skill execution returned no result');
  if (result.type !== 'research-report') throw new Error('Expected research-report type');
});

// Test: Agent Template Manager
test('AgentTemplateManager loads templates', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const templateCount = plugin.agentTemplateManager.getTemplateCount();
  // Now we have 8 core + 39 converted = 47 total
  if (templateCount < 40) throw new Error(`Expected at least 40 templates, got ${templateCount}`);
});

test('AgentTemplateManager instantiates agents', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const agent = plugin.agentTemplateManager.instantiateAgent('code-reviewer');
  if (!agent) throw new Error('Agent not instantiated');
  if (!agent.id) throw new Error('Agent missing ID');
  if (agent.model !== 'claude-sonnet-5') throw new Error('Unexpected model');
});

test('AgentTemplateManager enforces Haiku 4.5 for memory-writer', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const agent = plugin.agentTemplateManager.instantiateAgent('memory-writer', {
    model: 'claude-opus-5' // Try to override
  });

  if (agent.model !== 'claude-haiku-4.5') {
    throw new Error('Memory-writer should enforce Haiku 4.5');
  }
});

// Test: Command Dispatcher
test('CommandDispatcher parses commands', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const parsed = plugin.commandDispatcher.parseCommand('/code-review src/**/*.js');
  if (!parsed) throw new Error('Command not parsed');
  if (parsed.command !== '/code-review') throw new Error('Wrong command name');
  if (parsed.args !== 'src/**/*.js') throw new Error('Wrong args');
});

test('CommandDispatcher executes /help', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const result = await plugin.commandDispatcher.executeCommand('/help');
  if (!result) throw new Error('No result from /help');
  if (result.type !== 'help') throw new Error('Expected help type');
  if (!result.commands) throw new Error('Missing commands list');
});

test('CommandDispatcher executes /status', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const result = await plugin.commandDispatcher.executeCommand('/status');
  if (!result) throw new Error('No result from /status');
  if (result.type !== 'status') throw new Error('Expected status type');
  if (!result.skills) throw new Error('Missing skills info');
  if (!result.agents) throw new Error('Missing agents info');
});

test('CommandDispatcher executes /memory-write and /memory-read', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  // Write
  const writeResult = await plugin.commandDispatcher.executeCommand('/memory-write', 'test:key test value');
  if (!writeResult.success) throw new Error('Memory write failed');

  // Read
  const readResult = await plugin.commandDispatcher.executeCommand('/memory-read', 'test:key');
  if (!readResult.value) throw new Error('Memory read failed');
});

// Test: Task Router
test('TaskRouter detects task types', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const tests = [
    { msg: 'research AI in healthcare', expected: 'RESEARCH' },
    { msg: 'implement user authentication', expected: 'ENGINEERING' },
    { msg: 'design system architecture', expected: 'ARCHITECTURE' },
    { msg: 'create a presentation', expected: 'PRESENTATION' },
    { msg: 'debug this error', expected: 'DEBUGGING' }
  ];

  for (const { msg, expected } of tests) {
    const taskType = plugin.taskRouter.detectTaskType(msg);
    if (taskType !== expected) {
      throw new Error(`Expected ${expected}, got ${taskType} for "${msg}"`);
    }
  }
});

test('TaskRouter selects appropriate models', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const memoryModel = plugin.taskRouter.selectModel('MEMORY');
  if (memoryModel !== 'claude-haiku-4.5') throw new Error('Memory should use Haiku 4.5');

  const archModel = plugin.taskRouter.selectModel('ARCHITECTURE');
  if (archModel !== 'claude-opus-5') throw new Error('Architecture should use Opus');

  const engineeringModel = plugin.taskRouter.selectModel('ENGINEERING');
  if (engineeringModel !== 'claude-sonnet-5') throw new Error('Engineering should use Sonnet');
});

test('TaskRouter routes to correct skills', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const skills = plugin.taskRouter.routeToSkill('RESEARCH');
  if (!skills.includes('deep-research')) throw new Error('Expected deep-research skill');
});

// Test: Token Budget Tracker
test('TokenBudgetTracker initializes', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const budget = plugin.tokenBudgetTracker.initialize(200000);
  if (!budget) throw new Error('Budget not initialized');
  if (budget.contextWindow !== 200000) throw new Error('Wrong context window');
});

test('TokenBudgetTracker checks budget', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  plugin.tokenBudgetTracker.initialize(100000);
  const canProceed = plugin.tokenBudgetTracker.checkBudget({
    name: 'test-phase',
    description: 'Test phase description'
  });

  if (!canProceed) throw new Error('Should be able to proceed');
});

test('TokenBudgetTracker warns at high usage', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  plugin.tokenBudgetTracker.initialize(10000);
  plugin.tokenBudgetTracker.usedTokens = 8000; // 80%

  plugin.tokenBudgetTracker.checkBudget({
    name: 'test-phase',
    description: 'x'.repeat(1000)
  });

  const warnings = plugin.tokenBudgetTracker.getWarnings();
  if (warnings.length === 0) throw new Error('Expected warnings at high usage');
});

// Test: Verification Loop
test('VerificationLoop verifies successful code', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const result = await plugin.verificationLoop.verify({
    code: 'console.log("test")',
    name: 'test-phase'
  });

  if (!result.success) throw new Error('Verification should succeed');
});

test('VerificationLoop classifies errors', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const tests = [
    { msg: 'SyntaxError: Unexpected token', expected: 'SYNTAX_ERROR' },
    { msg: 'Cannot find module "test"', expected: 'MODULE_NOT_FOUND' },
    { msg: 'TypeError: Cannot read property', expected: 'TYPE_ERROR' },
    { msg: 'ReferenceError: x is not defined', expected: 'REFERENCE_ERROR' }
  ];

  for (const { msg, expected } of tests) {
    const errorType = plugin.verificationLoop.classifyError(msg);
    if (errorType !== expected) {
      throw new Error(`Expected ${expected}, got ${errorType}`);
    }
  }
});

// Test: Orchestration Gates
test('OrchestrationGates executes Gate 0 (preprocessing)', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const gate0 = await plugin.orchestrationGates.gate0_preprocessing();
  if (!gate0) throw new Error('Gate 0 failed');
  if (!gate0.tokenBudget) throw new Error('Token budget not initialized');
  if (!gate0.deduplicationRegistry) throw new Error('Dedup registry not initialized');
});

test('OrchestrationGates executes Gate 1 (routing)', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const gate0 = await plugin.orchestrationGates.gate0_preprocessing();
  const gate1 = await plugin.orchestrationGates.gate1_routing('research quantum computing', gate0);

  if (!gate1) throw new Error('Gate 1 failed');
  if (gate1.taskType !== 'RESEARCH') throw new Error('Wrong task type detected');
  if (!gate1.skill) throw new Error('No skill matched');
});

test('OrchestrationGates full execution returns plan', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const result = await plugin.orchestrationGates.execute('research AI applications');

  if (!result) throw new Error('Orchestration failed');
  if (result.status !== 'PLAN_READY') throw new Error('Expected PLAN_READY status');
  if (!result.plan) throw new Error('No plan generated');
  if (!result.awaitingApproval) throw new Error('Should await approval');
});

// Test: Integration - processRequest
test('Plugin processRequest detects commands', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const result = await plugin.processRequest('/status');
  if (!result) throw new Error('No result');
  if (result.type !== 'status') throw new Error('Expected status response');
});

test('Plugin processRequest executes orchestration', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const result = await plugin.processRequest('research machine learning');
  if (!result) throw new Error('No result');
  if (result.status !== 'PLAN_READY') throw new Error('Expected PLAN_READY');
});

test('Plugin lists available skills', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const skills = plugin.listAvailableSkills();
  if (!skills) throw new Error('No skills returned');
  if (!Array.isArray(skills)) throw new Error('Skills should be array');
  if (skills.length < 5) throw new Error('Expected at least 5 skills');
});

test('Plugin lists available commands', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const commands = plugin.listAvailableCommands();
  if (!commands) throw new Error('No commands returned');
  if (!Array.isArray(commands)) throw new Error('Commands should be array');
  if (commands.length < 5) throw new Error('Expected at least 5 commands');
});

test('Plugin lists agent templates', async () => {
  const plugin = new PowerSkillsPlugin();
  await plugin.initPromise;

  const templates = plugin.listAgentTemplates();
  if (!templates) throw new Error('No templates returned');
  if (!Array.isArray(templates)) throw new Error('Templates should be array');
  if (templates.length < 5) throw new Error('Expected at least 5 templates');
});

// Run all tests
runTests();
