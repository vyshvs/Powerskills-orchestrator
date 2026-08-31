/**
 * Workflow Integration
 * Orchestrates complex multi-phase workflows with memory tracking
 */

import MemoryOrchestrator from './index.js';
import PlatformAdapterFactory from './adapters.js';

export class WorkflowEngine {
  constructor(config = {}) {
    this.orchestrator = new MemoryOrchestrator(config);
    this.adapter = PlatformAdapterFactory.create(
      config.platform || 'claude',
      this.orchestrator
    );
    this.workflows = new Map();
    this.currentWorkflow = null;
  }

  /**
   * Define a new workflow
   */
  defineWorkflow(name, phases) {
    const workflow = {
      name,
      phases: phases.map((phase, index) => ({
        ...phase,
        index,
        status: 'pending',
        dependencies: phase.dependencies || []
      })),
      status: 'defined',
      createdAt: new Date().toISOString()
    };

    this.workflows.set(name, workflow);
    this.orchestrator.writeMemory('workflow-defined', { name, phases: workflow.phases.length });

    return workflow;
  }

  /**
   * Execute workflow with full memory tracking
   */
  async executeWorkflow(workflowName, context = {}) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    this.currentWorkflow = workflow;
    workflow.status = 'running';
    workflow.startTime = new Date().toISOString();

    this.orchestrator.writeMemory('workflow-started', {
      workflow: workflowName,
      phases: workflow.phases.length,
      context
    });

    const results = [];

    try {
      for (const phase of workflow.phases) {
        // Check dependencies
        const depsCompleted = phase.dependencies.every(depIndex => {
          const dep = workflow.phases[depIndex];
          return dep.status === 'completed';
        });

        if (!depsCompleted) {
          throw new Error(`Dependencies not met for phase: ${phase.name}`);
        }

        // Execute phase
        this.orchestrator.startPhase(phase.name, phase.description);

        let phaseResult;
        if (phase.subAgents) {
          // Execute with sub-agents
          phaseResult = await this.executeWithSubAgents(phase, context);
        } else if (phase.handler) {
          // Execute custom handler
          phaseResult = await phase.handler(this.orchestrator, this.adapter, context);
        } else {
          // Execute default
          phaseResult = await this.adapter.execute(phase.name, { ...context, phase });
        }

        phase.status = 'completed';
        phase.result = phaseResult;

        this.orchestrator.completePhase(`Phase completed: ${phase.name}`);

        results.push({
          phase: phase.name,
          result: phaseResult
        });
      }

      workflow.status = 'completed';
      workflow.endTime = new Date().toISOString();

      this.orchestrator.writeMemory('workflow-completed', {
        workflow: workflowName,
        duration: new Date(workflow.endTime) - new Date(workflow.startTime),
        phases: workflow.phases.length
      });

      return {
        workflow: workflowName,
        status: 'completed',
        results
      };

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;

      this.orchestrator.writeMemory('workflow-failed', {
        workflow: workflowName,
        error: error.message,
        completedPhases: workflow.phases.filter(p => p.status === 'completed').length
      });

      throw error;
    }
  }

  /**
   * Execute phase with sub-agents
   */
  async executeWithSubAgents(phase, context) {
    const subAgentResults = [];

    for (const agentConfig of phase.subAgents) {
      const agent = await this.orchestrator.createSubAgent(
        agentConfig.name,
        agentConfig.config
      );

      try {
        const result = await this.adapter.execute(agentConfig.task, {
          ...context,
          agent: agent.name
        });

        this.orchestrator.completeSubAgent(agent.name, result);
        subAgentResults.push({ agent: agent.name, result });

      } catch (error) {
        this.orchestrator.writeMemory('subagent-error', {
          agent: agent.name,
          error: error.message
        });
        throw error;
      }
    }

    return {
      subAgents: subAgentResults,
      phase: phase.name
    };
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowName) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      return null;
    }

    return {
      name: workflow.name,
      status: workflow.status,
      phases: workflow.phases.map(p => ({
        name: p.name,
        status: p.status,
        index: p.index
      })),
      progress: {
        total: workflow.phases.length,
        completed: workflow.phases.filter(p => p.status === 'completed').length,
        percentage: Math.round(
          (workflow.phases.filter(p => p.status === 'completed').length / workflow.phases.length) * 100
        )
      }
    };
  }

  /**
   * Generate workflow checklist
   */
  generateWorkflowChecklist(workflowName) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      return null;
    }

    const checklist = workflow.phases.map(phase => ({
      phase: phase.name,
      status: phase.status,
      completed: phase.status === 'completed',
      index: phase.index,
      dependencies: phase.dependencies
    }));

    this.orchestrator.writeMemory('workflow-checklist', {
      workflow: workflowName,
      checklist
    });

    return checklist;
  }

  /**
   * Complete all workflows
   */
  completeAllWorkflows() {
    const summary = {
      totalWorkflows: this.workflows.size,
      completed: 0,
      failed: 0,
      pending: 0
    };

    for (const [name, workflow] of this.workflows) {
      if (workflow.status === 'completed') {
        summary.completed++;
      } else if (workflow.status === 'failed') {
        summary.failed++;
      } else {
        summary.pending++;
      }
    }

    this.orchestrator.markAllCompleted();

    this.orchestrator.writeMemory('all-workflows-completed', summary);

    return summary;
  }
}

export default WorkflowEngine;
