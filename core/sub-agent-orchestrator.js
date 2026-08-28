/**
 * Sub-Agent Orchestrator
 * Manages multiple sub-agents working in parallel or sequentially
 * Records all operations and integrates with memory engine
 */

class SubAgentOrchestrator {
  constructor(memoryEngine, config = {}) {
    this.memoryEngine = memoryEngine;
    this.agents = new Map();
    this.taskQueue = [];
    this.activeAgents = new Set();
    this.config = {
      maxConcurrentAgents: config.maxConcurrentAgents || 10,
      defaultTimeout: config.defaultTimeout || 300000, // 5 minutes
      retryAttempts: config.retryAttempts || 3,
      isolationMode: config.isolationMode || 'worktree',
      ...config
    };
    this.executionHistory = [];
  }

  async createAgent(agentConfig) {
    const agentId = this.generateAgentId();
    const agent = {
      id: agentId,
      name: agentConfig.name,
      type: agentConfig.type || 'general-purpose',
      status: 'idle',
      createdAt: Date.now(),
      config: agentConfig,
      executionCount: 0,
      results: []
    };

    this.agents.set(agentId, agent);
    await this.memoryEngine.write(`agent:${agentId}`, agent, {
      type: 'agent',
      tags: ['agent', agentConfig.type]
    });

    this.memoryEngine.log('AGENT_CREATED', `Agent created: ${agentConfig.name}`, { agentId });
    return agentId;
  }

  generateAgentId() {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async executeTask(agentId, task) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Wait if max concurrent agents reached
    while (this.activeAgents.size >= this.config.maxConcurrentAgents) {
      await this.sleep(100);
    }

    this.activeAgents.add(agentId);
    agent.status = 'running';
    agent.currentTask = task;

    const execution = {
      executionId: this.generateExecutionId(),
      agentId,
      task,
      startTime: Date.now(),
      status: 'running'
    };

    this.executionHistory.push(execution);
    await this.memoryEngine.write(`execution:${execution.executionId}`, execution, {
      type: 'execution',
      tags: ['execution', agentId]
    });

    try {
      this.memoryEngine.log('TASK_START', `Task started by ${agent.name}`, {
        agentId,
        taskType: task.type
      });

      // Execute the task based on platform
      const result = await this.executeByPlatform(agent, task);

      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.status = 'completed';
      execution.result = result;

      agent.executionCount++;
      agent.results.push(result);
      agent.status = 'idle';
      agent.currentTask = null;

      await this.memoryEngine.write(`execution:${execution.executionId}`, execution, {
        type: 'execution',
        tags: ['execution', 'completed', agentId]
      });

      this.memoryEngine.log('TASK_COMPLETE', `Task completed by ${agent.name}`, {
        agentId,
        duration: execution.duration,
        success: true
      });

      this.activeAgents.delete(agentId);
      return result;

    } catch (error) {
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.status = 'failed';
      execution.error = error.message;

      agent.status = 'error';
      agent.lastError = error.message;

      await this.memoryEngine.write(`execution:${execution.executionId}`, execution, {
        type: 'execution',
        tags: ['execution', 'failed', agentId]
      });

      this.memoryEngine.log('TASK_FAILED', `Task failed for ${agent.name}`, {
        agentId,
        error: error.message
      });

      this.activeAgents.delete(agentId);
      throw error;
    }
  }

  async executeByPlatform(agent, task) {
    const platform = task.platform || 'claude';

    switch (platform) {
      case 'openai':
        return await this.executeOpenAITask(agent, task);
      case 'claude':
        return await this.executeClaudeTask(agent, task);
      case 'antigravity':
        return await this.executeAntigravityTask(agent, task);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async executeOpenAITask(agent, task) {
    // OpenAI-specific execution logic
    const result = {
      platform: 'openai',
      agentId: agent.id,
      task: task.description,
      output: await this.processTask(agent, task),
      model: task.model || 'gpt-4',
      timestamp: Date.now()
    };

    await this.memoryEngine.write(`result:${agent.id}:${Date.now()}`, result, {
      type: 'result',
      tags: ['openai', agent.id]
    });

    return result;
  }

  async executeClaudeTask(agent, task) {
    // Claude-specific execution logic
    const result = {
      platform: 'claude',
      agentId: agent.id,
      task: task.description,
      output: await this.processTask(agent, task),
      model: task.model || 'claude-opus-5',
      timestamp: Date.now()
    };

    await this.memoryEngine.write(`result:${agent.id}:${Date.now()}`, result, {
      type: 'result',
      tags: ['claude', agent.id]
    });

    return result;
  }

  async executeAntigravityTask(agent, task) {
    // Antigravity-specific execution logic
    const result = {
      platform: 'antigravity',
      agentId: agent.id,
      task: task.description,
      output: await this.processTask(agent, task),
      model: task.model || 'default',
      timestamp: Date.now()
    };

    await this.memoryEngine.write(`result:${agent.id}:${Date.now()}`, result, {
      type: 'result',
      tags: ['antigravity', agent.id]
    });

    return result;
  }

  async processTask(agent, task) {
    // Core task processing logic
    // This is where the actual work happens
    return {
      processed: true,
      data: task.data,
      metadata: {
        agentId: agent.id,
        agentType: agent.type,
        processingTime: Date.now()
      }
    };
  }

  async parallelExecution(tasks, options = {}) {
    const results = [];
    const agents = [];

    // Create agents for each task
    for (const task of tasks) {
      const agentConfig = {
        name: task.name || `Agent-${tasks.indexOf(task)}`,
        type: task.type || 'general-purpose',
        ...options
      };
      const agentId = await this.createAgent(agentConfig);
      agents.push(agentId);
    }

    // Execute all tasks in parallel
    const promises = tasks.map((task, index) =>
      this.executeTask(agents[index], task)
    );

    try {
      const taskResults = await Promise.all(promises);
      results.push(...taskResults);

      this.memoryEngine.log('PARALLEL_COMPLETE', 'Parallel execution completed', {
        taskCount: tasks.length,
        successCount: taskResults.length
      });

      return results;
    } catch (error) {
      this.memoryEngine.log('PARALLEL_FAILED', 'Parallel execution failed', {
        error: error.message
      });
      throw error;
    }
  }

  async sequentialExecution(tasks, options = {}) {
    const results = [];
    const agentConfig = {
      name: options.name || 'Sequential-Agent',
      type: options.type || 'general-purpose',
      ...options
    };

    const agentId = await this.createAgent(agentConfig);

    for (const task of tasks) {
      try {
        const result = await this.executeTask(agentId, task);
        results.push(result);
      } catch (error) {
        if (!options.continueOnError) {
          throw error;
        }
        results.push({ error: error.message, task });
      }
    }

    this.memoryEngine.log('SEQUENTIAL_COMPLETE', 'Sequential execution completed', {
      taskCount: tasks.length,
      successCount: results.filter(r => !r.error).length
    });

    return results;
  }

  async pipeline(stages, data) {
    let currentData = data;
    const pipelineResults = [];

    for (const stage of stages) {
      const agentId = await this.createAgent({
        name: stage.name,
        type: stage.type || 'pipeline-stage'
      });

      const task = {
        description: stage.description,
        data: currentData,
        type: 'pipeline',
        platform: stage.platform
      };

      const result = await this.executeTask(agentId, task);
      pipelineResults.push(result);
      currentData = result.output;
    }

    this.memoryEngine.log('PIPELINE_COMPLETE', 'Pipeline execution completed', {
      stageCount: stages.length
    });

    return {
      stages: pipelineResults,
      finalOutput: currentData
    };
  }

  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getAgentStatus(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    return {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      executionCount: agent.executionCount,
      currentTask: agent.currentTask,
      lastError: agent.lastError
    };
  }

  async getAllAgents() {
    return Array.from(this.agents.values()).map(agent => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      executionCount: agent.executionCount
    }));
  }

  async terminateAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.status = 'terminated';
    this.activeAgents.delete(agentId);
    this.agents.delete(agentId);

    await this.memoryEngine.delete(`agent:${agentId}`);
    this.memoryEngine.log('AGENT_TERMINATED', `Agent terminated: ${agent.name}`, { agentId });

    return true;
  }

  async getExecutionHistory(filter = {}) {
    let history = [...this.executionHistory];

    if (filter.agentId) {
      history = history.filter(e => e.agentId === filter.agentId);
    }

    if (filter.status) {
      history = history.filter(e => e.status === filter.status);
    }

    if (filter.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  async exportState() {
    return {
      agents: Array.from(this.agents.entries()),
      executionHistory: this.executionHistory,
      activeAgents: Array.from(this.activeAgents),
      timestamp: Date.now()
    };
  }

  async importState(state) {
    this.agents = new Map(state.agents);
    this.executionHistory = state.executionHistory;
    this.activeAgents = new Set(state.activeAgents);

    this.memoryEngine.log('STATE_IMPORTED', 'Orchestrator state imported', {
      agentCount: this.agents.size,
      historyCount: this.executionHistory.length
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SubAgentOrchestrator;
