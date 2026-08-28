/**
 * PowerSkills Orchestration Gates
 * 7-gate execution system for structured task processing
 */

class OrchestrationGates {
  constructor(plugin) {
    this.plugin = plugin;
    this.currentGate = 0;
    this.currentPhase = 0;
    this.gateHistory = [];
  }

  async execute(userMessage) {
    try {
      // Gate 0: Pre-processing
      const gate0 = await this.gate0_preprocessing();
      this.recordGate(0, 'preprocessing', gate0);

      // Gate 1: Routing
      const gate1 = await this.gate1_routing(userMessage, gate0);
      this.recordGate(1, 'routing', gate1);

      // Gate 2: Alignment
      const gate2 = await this.gate2_alignment(gate1.taskType, userMessage);
      this.recordGate(2, 'alignment', gate2);

      // Gate 3: Planning
      const gate3 = await this.gate3_planning(gate1, gate0, userMessage);
      this.recordGate(3, 'planning', gate3);

      // STOP - Return plan for user approval
      return {
        status: 'PLAN_READY',
        gates: {
          gate0,
          gate1,
          gate2,
          gate3
        },
        plan: gate3.plan,
        awaitingApproval: true
      };

    } catch (error) {
      this.plugin.memoryEngine.log('ORCHESTRATION_ERROR', `Failed at gate ${this.currentGate}`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async executeApprovedPlan(gates, plan) {
    try {
      // Gate 4: Dispatch
      const gate4 = await this.gate4_dispatch(plan.phases);
      this.recordGate(4, 'dispatch', gate4);

      // Gate 5: Execution
      const gate5 = await this.gate5_execution(plan.phases, gate4.subagents);
      this.recordGate(5, 'execution', gate5);

      // Gate 6: Verification
      const gate6 = await this.gate6_verification(gate5.results);
      this.recordGate(6, 'verification', gate6);

      // Gate 7: Completion
      const gate7 = await this.gate7_completion(gate6.verified, plan);
      this.recordGate(7, 'completion', gate7);

      return {
        status: 'COMPLETE',
        success: gate7.allPassed,
        score: gate7.score,
        outputs: gate7.outputs,
        gates: this.gateHistory
      };

    } catch (error) {
      this.plugin.memoryEngine.log('EXECUTION_ERROR', `Failed at gate ${this.currentGate}`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async gate0_preprocessing() {
    this.currentGate = 0;

    // Memory reading (ALWAYS FIRST)
    let memory = null;
    let projectStructure = null;

    try {
      memory = await this.plugin.memoryEngine.read('session:state');
    } catch (error) {
      this.plugin.memoryEngine.log('GATE0', 'No session state found, creating fresh');
    }

    try {
      projectStructure = await this.plugin.memoryEngine.read('project:structure');
    } catch (error) {
      this.plugin.memoryEngine.log('GATE0', 'No project structure found');
    }

    // Token budget initialization
    const budget = this.plugin.tokenBudgetTracker.initialize();

    // Deduplication registry
    const deduplicationRegistry = {
      activeSkills: [],
      completedSkills: []
    };

    this.plugin.memoryEngine.log('GATE0', 'Pre-processing complete', {
      hasMemory: !!memory,
      hasProjectStructure: !!projectStructure,
      tokenBudget: budget
    });

    return {
      memory,
      projectStructure,
      tokenBudget: budget,
      deduplicationRegistry
    };
  }

  async gate1_routing(userMessage, gate0) {
    this.currentGate = 1;

    // Task type detection
    const taskType = this.plugin.taskRouter.detectTaskType(userMessage);

    // Complexity estimation
    const complexity = this.plugin.taskRouter.estimateComplexity(userMessage, taskType);

    // Model selection
    const modelTier = this.plugin.taskRouter.selectModel(taskType, complexity);

    // Skill matching
    const skill = this.plugin.skillRegistry.matchSkill(taskType, userMessage);

    // Subagent recommendation
    const useSubagent = this.plugin.taskRouter.shouldUseSubagent(taskType, complexity);

    this.plugin.memoryEngine.log('GATE1', 'Routing complete', {
      taskType,
      complexity,
      modelTier,
      skillName: skill?.name,
      useSubagent
    });

    return {
      taskType,
      complexity,
      modelTier,
      skill,
      useSubagent
    };
  }

  async gate2_alignment(taskType, userMessage) {
    this.currentGate = 2;

    // Role declaration
    const role = this.getRoleForTask(taskType);

    // Internal rubric (not output to user)
    const rubric = this.buildRubric(role);

    // Goal restatement
    const goal = {
      original: userMessage,
      restated: `Complete ${taskType} task: ${userMessage.substring(0, 100)}...`,
      unknowns: []
    };

    this.plugin.memoryEngine.log('GATE2', 'Alignment complete', {
      role,
      taskType
    });

    return {
      role,
      rubric,
      goal
    };
  }

  async gate3_planning(gate1, gate0, userMessage) {
    this.currentGate = 3;

    if (!gate1.skill) {
      throw new Error('No skill matched for task type: ' + gate1.taskType);
    }

    // Generate plan using skill
    const context = {
      userMessage,
      taskType: gate1.taskType,
      complexity: gate1.complexity,
      modelTier: gate1.modelTier,
      memory: gate0.memory,
      projectStructure: gate0.projectStructure
    };

    // Execute skill to get plan
    const skillResult = await gate1.skill.execute(context);

    // Structure the plan
    const plan = {
      name: `${gate1.taskType} Implementation`,
      description: userMessage,
      phases: this.generatePhases(skillResult, gate1),
      changeSurface: this.identifyChangeSurface(skillResult),
      edgeCases: this.identifyEdgeCases(gate1.taskType),
      testingStrategy: this.buildTestingStrategy(gate1.taskType),
      mvpFirst: true
    };

    this.plugin.memoryEngine.log('GATE3', 'Planning complete', {
      phaseCount: plan.phases.length,
      taskType: gate1.taskType
    });

    return { plan };
  }

  async gate4_dispatch(phases) {
    this.currentGate = 4;

    const subagents = [];

    for (const phase of phases) {
      if (phase.requiresSubagent) {
        const agent = await this.plugin.orchestrator.createAgent({
          name: phase.agentName || `agent-${phase.name}`,
          type: phase.agentType || 'worker'
        });

        subagents.push({
          agentId: agent,
          phase: phase.name
        });
      }
    }

    this.plugin.memoryEngine.log('GATE4', 'Dispatch complete', {
      subagentCount: subagents.length
    });

    return { subagents };
  }

  async gate5_execution(phases, subagents) {
    this.currentGate = 5;

    const results = [];

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];

      // Token budget check
      const budgetOk = this.plugin.tokenBudgetTracker.checkBudget(phase);
      if (!budgetOk) {
        throw new Error(`Token budget exhausted at phase ${phase.name}`);
      }

      // Execute phase
      const result = await this.executePhase(phase, subagents);

      // Memory update
      await this.plugin.memoryEngine.write(`phase:${phase.name}`, result);

      results.push(result);
    }

    this.plugin.memoryEngine.log('GATE5', 'Execution complete', {
      phaseCount: results.length
    });

    return { results };
  }

  async gate6_verification(results) {
    this.currentGate = 6;

    const verified = [];

    for (const result of results) {
      const verificationResult = await this.plugin.verificationLoop.verify(result);
      verified.push(verificationResult);
    }

    this.plugin.memoryEngine.log('GATE6', 'Verification complete', {
      totalResults: verified.length,
      successCount: verified.filter(v => v.success).length
    });

    return { verified };
  }

  async gate7_completion(verified, plan) {
    this.currentGate = 7;

    const allPassed = verified.every(v => v.success);
    const score = this.scoreResults(verified);

    // Final memory update
    await this.plugin.memoryEngine.write('session:completion', {
      success: allPassed,
      score,
      timestamp: Date.now(),
      plan: plan.name
    });

    this.plugin.memoryEngine.log('GATE7', 'Completion', {
      allPassed,
      score
    });

    return {
      allPassed,
      score,
      outputs: verified
    };
  }

  // Helper methods
  getRoleForTask(taskType) {
    const roles = {
      ENGINEERING: 'Staff Software Engineer, PhD in Distributed Systems',
      ARCHITECTURE: 'Principal Architect, PhD in LLM Infrastructure',
      RESEARCH: 'Research Scientist, PhD in Knowledge Synthesis',
      FRONTEND: 'Principal UI Engineer, PhD in Design Systems',
      DEBUGGING: 'Senior Debugging Specialist, Systems Expert'
    };

    return roles[taskType] || 'Senior Technical Specialist';
  }

  buildRubric(role) {
    return {
      correctness: { weight: 0.25, target: 95 },
      completeness: { weight: 0.20, target: 95 },
      conciseness: { weight: 0.15, target: 95 },
      domainAccuracy: { weight: 0.20, target: 95 },
      edgeCaseCoverage: { weight: 0.10, target: 95 },
      outputQuality: { weight: 0.10, target: 95 }
    };
  }

  generatePhases(skillResult, gate1) {
    // Convert skill result into executable phases
    return [
      {
        name: 'phase-1',
        description: `Execute ${gate1.taskType} task`,
        requiresSubagent: gate1.useSubagent,
        agentType: 'implementer',
        result: skillResult
      }
    ];
  }

  identifyChangeSurface(skillResult) {
    return {
      filesToModify: [],
      filesToCreate: [],
      filesToDelete: []
    };
  }

  identifyEdgeCases(taskType) {
    return [
      'Error handling',
      'Empty input handling',
      'Concurrent access'
    ];
  }

  buildTestingStrategy(taskType) {
    return {
      approach: 'Verification loop with output testing',
      debugHooks: true,
      expectedOutputs: []
    };
  }

  async executePhase(phase, subagents) {
    // Execute the phase work
    return {
      name: phase.name,
      code: phase.result,
      type: 'implementation',
      success: true
    };
  }

  scoreResults(verified) {
    const successCount = verified.filter(v => v.success).length;
    return Math.floor((successCount / verified.length) * 100);
  }

  recordGate(gateNumber, gateName, result) {
    this.gateHistory.push({
      gate: gateNumber,
      name: gateName,
      timestamp: Date.now(),
      result
    });
  }

  getGateHistory() {
    return this.gateHistory;
  }

  reset() {
    this.currentGate = 0;
    this.currentPhase = 0;
    this.gateHistory = [];
  }
}

module.exports = OrchestrationGates;
