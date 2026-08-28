/**
 * PowerSkills Memory Orchestrator Plugin
 * Main entry point that integrates all components
 * Provides unified API for memory operations, sub-agents, and cross-platform compatibility
 */

const MemoryEngine = require('./core/memory-engine');
const PlatformAdapter = require('./core/platform-adapter');
const SubAgentOrchestrator = require('./core/sub-agent-orchestrator');
const UpdateManager = require('./core/update-manager');

// PowerSkills Framework
const SkillRegistry = require('./core/powerskills/skill-registry');
const AgentTemplateManager = require('./core/powerskills/agent-template-manager');
const CommandDispatcher = require('./core/powerskills/command-dispatcher');
const TaskRouter = require('./core/powerskills/task-router');
const TokenBudgetTracker = require('./core/powerskills/token-budget-tracker');
const VerificationLoop = require('./core/powerskills/verification-loop');
const OrchestrationGates = require('./core/powerskills/orchestration-gates');

class PowerSkillsPlugin {
  constructor(config = {}) {
    this.config = {
      name: 'PowerSkills Memory Orchestrator',
      version: '3.3.0',
      ...config
    };

    // Initialize core components
    this.memoryEngine = new MemoryEngine(config.memory || {});
    this.platformAdapter = new PlatformAdapter(config.platforms || {});
    this.orchestrator = new SubAgentOrchestrator(this.memoryEngine, config.orchestrator || {});
    this.updateManager = new UpdateManager({
      repository: 'https://api.github.com/repos/vyshvs/Powerskills-orchestrator',
      currentVersion: this.config.version,
      autoUpdate: config.autoUpdate !== false
    });

    // PowerSkills Framework
    this.skillRegistry = new SkillRegistry(this);
    this.agentTemplateManager = new AgentTemplateManager(this);
    this.commandDispatcher = new CommandDispatcher(this);
    this.taskRouter = new TaskRouter(this);
    this.tokenBudgetTracker = new TokenBudgetTracker(this);
    this.verificationLoop = new VerificationLoop(this);
    this.orchestrationGates = new OrchestrationGates(this);

    // Trading Context Systems (Week 1 - Foundation)
    const MarketContextProvider = require('./core/context/market-context-provider.js');
    const UserProfileManager = require('./core/personalization/user-profile-manager.js');
    this.marketContext = new MarketContextProvider(this);
    this.userProfileManager = new UserProfileManager(this);

    // Trading Intelligence Systems (Week 2 - Intelligence)
    const MultiAgentCoordinator = require('./core/orchestration/multi-agent-coordinator.js');
    const PerformanceTracker = require('./core/analytics/performance-tracker.js');
    this.multiAgentCoordinator = new MultiAgentCoordinator(this);
    this.performanceTracker = new PerformanceTracker(this);

    // Session management
    this.sessionActive = false;
    this.sessionData = null;
    this.initPromise = this.initialize();
  }

  async initialize() {
    this.sessionData = {
      startTime: Date.now(),
      pluginVersion: this.config.version,
      sessionId: this.memoryEngine.sessionId
    };

    this.sessionActive = true;

    this.memoryEngine.log('PLUGIN_INIT', 'PowerSkills Plugin initialized', {
      version: this.config.version,
      sessionId: this.sessionData.sessionId
    });

    // Auto-update on startup: check and apply updates immediately
    try {
      const updateCheck = await this.updateManager.checkForUpdates();

      if (updateCheck.updateAvailable) {
        this.memoryEngine.log('UPDATE_AVAILABLE', 'New version available, auto-updating...', {
          current: updateCheck.currentVersion,
          latest: updateCheck.latestVersion
        });

        const updateResult = await this.updateManager.applyUpdate();

        if (updateResult.success) {
          this.memoryEngine.log('UPDATE_SUCCESS', 'Plugin updated successfully! Restart to use new version.', {
            version: updateCheck.latestVersion,
            changes: updateResult.changes
          });

          console.log(`\n🎉 PowerSkills updated to v${updateCheck.latestVersion}!`);
          console.log('📝 Changes:', updateResult.changes);
          console.log('🔄 Restart the plugin to apply updates.\n');
        }
      } else {
        this.memoryEngine.log('UP_TO_DATE', 'Plugin is up to date', {
          version: this.config.version
        });
      }
    } catch (error) {
      this.memoryEngine.log('UPDATE_ERROR', 'Failed to auto-update', {
        error: error.message
      });
    }

    // Log initial state
    await this.memoryEngine.write('session:init', this.sessionData, {
      type: 'session',
      tags: ['init', 'session']
    });
  }

  // ============= MEMORY OPERATIONS =============

  async writeMemory(key, value, options = {}) {
    this.ensureSessionActive();
    return await this.memoryEngine.write(key, value, options);
  }

  async readMemory(key, options = {}) {
    this.ensureSessionActive();
    return await this.memoryEngine.read(key, options);
  }

  async searchMemory(query, options = {}) {
    this.ensureSessionActive();
    return await this.memoryEngine.search(query, options);
  }

  async deleteMemory(key) {
    this.ensureSessionActive();
    return await this.memoryEngine.delete(key);
  }

  async clearMemory(filter = {}) {
    this.ensureSessionActive();
    return await this.memoryEngine.clear(filter);
  }

  async getMemoryStats() {
    return this.memoryEngine.getStats();
  }

  // ============= SUB-AGENT OPERATIONS =============

  async createAgent(agentConfig) {
    this.ensureSessionActive();
    return await this.orchestrator.createAgent(agentConfig);
  }

  async executeTask(agentId, task) {
    this.ensureSessionActive();
    return await this.orchestrator.executeTask(agentId, task);
  }

  async executeParallel(tasks, options = {}) {
    this.ensureSessionActive();
    return await this.orchestrator.parallelExecution(tasks, options);
  }

  async executeSequential(tasks, options = {}) {
    this.ensureSessionActive();
    return await this.orchestrator.sequentialExecution(tasks, options);
  }

  async executePipeline(stages, data) {
    this.ensureSessionActive();
    return await this.orchestrator.pipeline(stages, data);
  }

  async getAgentStatus(agentId) {
    return await this.orchestrator.getAgentStatus(agentId);
  }

  async getAllAgents() {
    return await this.orchestrator.getAllAgents();
  }

  async terminateAgent(agentId) {
    return await this.orchestrator.terminateAgent(agentId);
  }

  async getExecutionHistory(filter = {}) {
    return await this.orchestrator.getExecutionHistory(filter);
  }

  // ============= PLATFORM OPERATIONS =============

  async callPlatform(platform, method, params = {}) {
    this.ensureSessionActive();
    return await this.platformAdapter.call(platform, method, params);
  }

  async streamPlatform(platform, method, params = {}, callback) {
    this.ensureSessionActive();
    return await this.platformAdapter.stream(platform, method, params, callback);
  }

  async validatePlatform(platform) {
    return await this.platformAdapter.validateCredentials(platform);
  }

  async getAvailableModels(platform) {
    return await this.platformAdapter.getAvailableModels(platform);
  }

  async configurePlatform(platform, config) {
    return this.platformAdapter.configurePlatform(platform, config);
  }

  getPlatformStatus() {
    return this.platformAdapter.getStatus();
  }

  // ============= POWERSKILLS OPERATIONS =============

  async processRequest(userMessage) {
    this.ensureSessionActive();

    // Check if it's a command
    const commandParsed = this.commandDispatcher.parseCommand(userMessage);
    if (commandParsed) {
      return await this.commandDispatcher.executeCommand(
        commandParsed.command,
        commandParsed.args
      );
    }

    // Execute orchestration gates
    const result = await this.orchestrationGates.execute(userMessage);

    return result;
  }

  async executeApprovedPlan(plan) {
    this.ensureSessionActive();

    // Continue with gates 4-7
    const result = await this.orchestrationGates.executeApprovedPlan(
      plan.gates,
      plan.plan
    );

    return result;
  }

  async executeSkill(skillName, context) {
    this.ensureSessionActive();

    return await this.skillRegistry.executeSkill(skillName, context);
  }

  async getSkillRecommendations(userMessage) {
    return this.taskRouter.getRecommendedSkills(userMessage);
  }

  getTokenBudgetStatus() {
    return this.tokenBudgetTracker.getReport();
  }

  listAvailableSkills() {
    return this.skillRegistry.getAllSkills().map(s => ({
      name: s.name,
      description: s.description,
      category: s.category,
      triggers: s.triggers
    }));
  }

  listAvailableCommands() {
    return this.commandDispatcher.listCommands();
  }

  listAgentTemplates() {
    return this.agentTemplateManager.listTemplates();
  }

  // ============= WORKFLOW OPERATIONS =============

  async executeWorkflow(workflow) {
    try {
      this.ensureSessionActive();
    } catch (error) {
      this.memoryEngine.log('WORKFLOW_ERROR', 'Session not active', { workflow: workflow.name });
      throw error;
    }

    const workflowId = this.generateWorkflowId();
    const startTime = Date.now();

    this.memoryEngine.log('WORKFLOW_START', `Workflow started: ${workflow.name}`, {
      workflowId,
      steps: workflow.steps.length
    });

    await this.memoryEngine.write(`workflow:${workflowId}`, {
      id: workflowId,
      name: workflow.name,
      status: 'running',
      startTime,
      steps: workflow.steps
    }, {
      type: 'workflow',
      tags: ['workflow', 'running']
    });

    const results = [];
    let currentContext = workflow.initialContext || {};

    try {
      for (const step of workflow.steps) {
        const stepResult = await this.executeWorkflowStep(step, currentContext, workflowId);
        results.push(stepResult);

        // Update context for next step
        if (step.updateContext && stepResult.output) {
          // Merge output into context, but limit context growth
          const newContextKeys = Object.keys(stepResult.output);
          if (Object.keys(currentContext).length + newContextKeys.length > 1000) {
            this.memoryEngine.log('WORKFLOW_WARN', 'Context size limit approaching', {
              workflowId,
              currentSize: Object.keys(currentContext).length
            });
          }
          currentContext = { ...currentContext, ...stepResult.output };
        }
      }

      const endTime = Date.now();
      const workflowResult = {
        id: workflowId,
        name: workflow.name,
        status: 'completed',
        startTime,
        endTime,
        duration: endTime - startTime,
        results,
        finalContext: currentContext
      };

      await this.memoryEngine.write(`workflow:${workflowId}`, workflowResult, {
        type: 'workflow',
        tags: ['workflow', 'completed']
      });

      this.memoryEngine.log('WORKFLOW_COMPLETE', `Workflow completed: ${workflow.name}`, {
        workflowId,
        duration: workflowResult.duration
      });

      return workflowResult;

    } catch (error) {
      this.memoryEngine.log('WORKFLOW_FAILED', `Workflow failed: ${workflow.name}`, {
        workflowId,
        error: error.message
      });

      await this.memoryEngine.write(`workflow:${workflowId}`, {
        id: workflowId,
        name: workflow.name,
        status: 'failed',
        error: error.message,
        startTime,
        endTime: Date.now(),
        results
      }, {
        type: 'workflow',
        tags: ['workflow', 'failed']
      });

      throw error;
    }
  }

  async executeWorkflowStep(step, context, workflowId) {
    this.memoryEngine.log('STEP_START', `Step started: ${step.name}`, {
      workflowId,
      stepType: step.type
    });

    const stepStartTime = Date.now();

    let result;

    switch (step.type) {
      case 'agent':
        const agentId = await this.createAgent({
          name: step.name,
          type: step.agentType || 'general-purpose'
        });
        result = await this.executeTask(agentId, {
          ...step.task,
          data: { ...step.task.data, context }
        });
        break;

      case 'parallel':
        result = await this.executeParallel(step.tasks, step.options);
        break;

      case 'sequential':
        result = await this.executeSequential(step.tasks, step.options);
        break;

      case 'memory':
        if (step.operation === 'write') {
          result = await this.writeMemory(step.key, step.value, step.options);
        } else if (step.operation === 'read') {
          result = await this.readMemory(step.key, step.options);
        } else if (step.operation === 'search') {
          result = await this.searchMemory(step.query, step.options);
        } else if (step.operation === 'delete') {
          result = await this.deleteMemory(step.key);
        } else if (step.operation === 'clear') {
          result = await this.clearMemory(step.filter || {});
        } else {
          throw new Error(`Unknown memory operation: ${step.operation}`);
        }
        break;

      case 'platform':
        result = await this.callPlatform(step.platform, step.method, {
          ...step.params,
          context
        });
        break;

      case 'custom':
        if (typeof step.execute === 'function') {
          result = await step.execute(context, this);
        } else {
          throw new Error('Custom step must have execute function');
        }
        break;

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    const stepEndTime = Date.now();
    const stepResult = {
      step: step.name,
      type: step.type,
      startTime: stepStartTime,
      endTime: stepEndTime,
      duration: stepEndTime - stepStartTime,
      output: result
    };

    this.memoryEngine.log('STEP_COMPLETE', `Step completed: ${step.name}`, {
      workflowId,
      duration: stepResult.duration
    });

    await this.memoryEngine.write(`workflow:${workflowId}:step:${step.name}`, stepResult, {
      type: 'workflow-step',
      tags: ['workflow', workflowId]
    });

    return stepResult;
  }

  generateWorkflowId() {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============= SESSION MANAGEMENT =============

  async exportSession() {
    const sessionExport = {
      sessionData: this.sessionData,
      memory: this.memoryEngine.exportSession(),
      orchestrator: await this.orchestrator.exportState(),
      platforms: this.platformAdapter.getStatus(),
      timestamp: Date.now()
    };

    await this.memoryEngine.write('session:export', sessionExport, {
      type: 'session',
      tags: ['export', 'session']
    });

    return sessionExport;
  }

  async importSession(sessionExport) {
    this.sessionData = sessionExport.sessionData;
    await this.memoryEngine.importSession(sessionExport.memory);
    await this.orchestrator.importState(sessionExport.orchestrator);

    this.sessionActive = true;

    this.memoryEngine.log('SESSION_IMPORTED', 'Session imported successfully', {
      sessionId: sessionExport.sessionData.sessionId
    });
  }

  async pauseSession() {
    this.sessionActive = false;
    this.memoryEngine.log('SESSION_PAUSED', 'Session paused');
  }

  async resumeSession() {
    this.sessionActive = true;
    this.memoryEngine.log('SESSION_RESUMED', 'Session resumed');
  }

  async endSession() {
    const sessionSummary = {
      sessionId: this.sessionData.sessionId,
      startTime: this.sessionData.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.sessionData.startTime,
      stats: this.memoryEngine.getStats(),
      agents: await this.orchestrator.getAllAgents(),
      platforms: this.platformAdapter.getStatus()
    };

    await this.memoryEngine.write('session:end', sessionSummary, {
      type: 'session',
      tags: ['end', 'session', 'summary']
    });

    this.memoryEngine.log('SESSION_ENDED', 'Session ended', sessionSummary);

    this.sessionActive = false;
    return sessionSummary;
  }

  // ============= UPDATE OPERATIONS =============

  async checkForUpdates() {
    return await this.updateManager.checkForUpdates();
  }

  async applyUpdate() {
    return await this.updateManager.applyUpdate();
  }

  getUpdateStatus() {
    return this.updateManager.getUpdateStatus();
  }

  // ============= UTILITY METHODS =============

  ensureSessionActive() {
    if (!this.sessionActive) {
      throw new Error('Session is not active. Please start or resume the session.');
    }
  }

  getSessionInfo() {
    return {
      active: this.sessionActive,
      sessionId: this.sessionData?.sessionId,
      startTime: this.sessionData?.startTime,
      uptime: this.sessionData ? Date.now() - this.sessionData.startTime : 0,
      version: this.config.version
    };
  }

  async getFullStatus() {
    return {
      session: this.getSessionInfo(),
      memory: this.memoryEngine.getStats(),
      agents: await this.orchestrator.getAllAgents(),
      platforms: this.platformAdapter.getStatus(),
      timestamp: Date.now()
    };
  }

  async getLogs(filter = {}) {
    const logs = this.memoryEngine.sessionLog;

    if (filter.type) {
      return logs.filter(log => log.type === filter.type);
    }

    if (filter.limit) {
      return logs.slice(-filter.limit);
    }

    return logs;
  }

  on(event, callback) {
    this.memoryEngine.eventEmitter.on(event, callback);
  }

  // ============= API METHODS =============

  getAPI() {
    return {
      // Memory
      memory: {
        write: this.writeMemory.bind(this),
        read: this.readMemory.bind(this),
        search: this.searchMemory.bind(this),
        delete: this.deleteMemory.bind(this),
        clear: this.clearMemory.bind(this),
        stats: this.getMemoryStats.bind(this)
      },
      // Agents
      agents: {
        create: this.createAgent.bind(this),
        execute: this.executeTask.bind(this),
        parallel: this.executeParallel.bind(this),
        sequential: this.executeSequential.bind(this),
        pipeline: this.executePipeline.bind(this),
        status: this.getAgentStatus.bind(this),
        list: this.getAllAgents.bind(this),
        terminate: this.terminateAgent.bind(this),
        history: this.getExecutionHistory.bind(this)
      },
      // Platforms
      platforms: {
        call: this.callPlatform.bind(this),
        stream: this.streamPlatform.bind(this),
        validate: this.validatePlatform.bind(this),
        models: this.getAvailableModels.bind(this),
        configure: this.configurePlatform.bind(this),
        status: this.getPlatformStatus.bind(this)
      },
      // Workflows
      workflow: {
        execute: this.executeWorkflow.bind(this)
      },
      // Session
      session: {
        info: this.getSessionInfo.bind(this),
        export: this.exportSession.bind(this),
        import: this.importSession.bind(this),
        pause: this.pauseSession.bind(this),
        resume: this.resumeSession.bind(this),
        end: this.endSession.bind(this)
      },
      // Utilities
      status: this.getFullStatus.bind(this),
      logs: this.getLogs.bind(this),
      on: this.on.bind(this),
      // Updates
      update: {
        check: this.checkForUpdates.bind(this),
        apply: this.applyUpdate.bind(this),
        status: this.getUpdateStatus.bind(this)
      }
    };
  }
}

module.exports = PowerSkillsPlugin;
