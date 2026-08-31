/**
 * Memory Orchestrator Plugin
 *
 * A comprehensive plugin with:
 * - Memory reader/writer with phase tracking
 * - Sub-agent orchestration
 * - Multi-platform support (Claude, OpenAI, Antigravity)
 * - Auto skill/plugin/MCP selection
 * - Complete phase tracking and scaffolding
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class MemoryOrchestrator {
  constructor(config = {}) {
    this.config = {
      memoryDir: config.memoryDir || join(process.cwd(), '.memory'),
      platform: config.platform || 'claude', // claude, openai, antigravity
      autoSkillPick: config.autoSkillPick !== false,
      ...config
    };

    this.phases = [];
    this.currentPhase = null;
    this.completedPhases = [];
    this.subAgents = new Map();
    this.scaffolding = new Map();

    this.initializeMemoryDir();
  }

  initializeMemoryDir() {
    if (!fs.existsSync(this.config.memoryDir)) {
      fs.mkdirSync(this.config.memoryDir, { recursive: true });
    }

    // Create phase tracking file
    const trackingFile = join(this.config.memoryDir, 'phase-tracking.json');
    if (!fs.existsSync(trackingFile)) {
      fs.writeFileSync(trackingFile, JSON.stringify({
        phases: [],
        completedPhases: [],
        currentPhase: null,
        startTime: new Date().toISOString()
      }, null, 2));
    }
  }

  /**
   * Start a new phase
   */
  startPhase(phaseName, description = '') {
    const phase = {
      name: phaseName,
      description,
      startTime: new Date().toISOString(),
      status: 'in-progress',
      memory: []
    };

    this.currentPhase = phase;
    this.phases.push(phase);

    this.writeMemory('phase-start', {
      phase: phaseName,
      description,
      timestamp: phase.startTime
    });

    console.log(`📋 Phase started: ${phaseName}`);
    return phase;
  }

  /**
   * Complete current phase
   */
  completePhase(summary = '') {
    if (!this.currentPhase) {
      throw new Error('No active phase to complete');
    }

    this.currentPhase.status = 'completed';
    this.currentPhase.endTime = new Date().toISOString();
    this.currentPhase.summary = summary;

    this.completedPhases.push(this.currentPhase.name);

    // Write phase completion memory
    this.writeMemory('phase-complete', {
      phase: this.currentPhase.name,
      summary,
      duration: new Date(this.currentPhase.endTime) - new Date(this.currentPhase.startTime),
      timestamp: this.currentPhase.endTime
    });

    // Update phase tracking
    this.updatePhaseTracking();

    console.log(`✅ Phase completed: ${this.currentPhase.name}`);

    const completed = this.currentPhase;
    this.currentPhase = null;

    return completed;
  }

  /**
   * Write memory entry
   */
  writeMemory(type, data) {
    const timestamp = new Date().toISOString();
    const memoryEntry = {
      type,
      data,
      timestamp,
      phase: this.currentPhase?.name || 'no-phase'
    };

    // Write to phase-specific memory
    if (this.currentPhase) {
      this.currentPhase.memory.push(memoryEntry);
    }

    // Write to disk
    const memoryFile = join(
      this.config.memoryDir,
      `${timestamp.replace(/[:.]/g, '-')}-${type}.json`
    );

    fs.writeFileSync(memoryFile, JSON.stringify(memoryEntry, null, 2));

    return memoryEntry;
  }

  /**
   * Read memory entries
   */
  readMemory(filter = {}) {
    const memoryFiles = fs.readdirSync(this.config.memoryDir)
      .filter(f => f.endsWith('.json') && f !== 'phase-tracking.json');

    const memories = memoryFiles.map(file => {
      const content = fs.readFileSync(join(this.config.memoryDir, file), 'utf8');
      return JSON.parse(content);
    });

    // Apply filters
    let filtered = memories;

    if (filter.type) {
      filtered = filtered.filter(m => m.type === filter.type);
    }

    if (filter.phase) {
      filtered = filtered.filter(m => m.phase === filter.phase);
    }

    if (filter.since) {
      filtered = filtered.filter(m => new Date(m.timestamp) >= new Date(filter.since));
    }

    return filtered;
  }

  /**
   * Update phase tracking file
   */
  updatePhaseTracking() {
    const trackingFile = join(this.config.memoryDir, 'phase-tracking.json');
    const tracking = {
      phases: this.phases,
      completedPhases: this.completedPhases,
      currentPhase: this.currentPhase,
      lastUpdate: new Date().toISOString()
    };

    fs.writeFileSync(trackingFile, JSON.stringify(tracking, null, 2));
  }

  /**
   * Create and manage sub-agents
   */
  async createSubAgent(name, config = {}) {
    const subAgent = {
      name,
      config,
      startTime: new Date().toISOString(),
      status: 'active',
      memory: []
    };

    this.subAgents.set(name, subAgent);

    this.writeMemory('subagent-created', {
      name,
      config,
      phase: this.currentPhase?.name
    });

    console.log(`🤖 Sub-agent created: ${name}`);
    return subAgent;
  }

  /**
   * Complete sub-agent work
   */
  completeSubAgent(name, result = {}) {
    const subAgent = this.subAgents.get(name);
    if (!subAgent) {
      throw new Error(`Sub-agent not found: ${name}`);
    }

    subAgent.status = 'completed';
    subAgent.endTime = new Date().toISOString();
    subAgent.result = result;

    this.writeMemory('subagent-completed', {
      name,
      result,
      duration: new Date(subAgent.endTime) - new Date(subAgent.startTime)
    });

    console.log(`✅ Sub-agent completed: ${name}`);
    return subAgent;
  }

  /**
   * Auto-pick skills/plugins/MCPs from available library
   */
  async autoPickTools(context = {}) {
    const tools = {
      skills: [],
      plugins: [],
      mcps: []
    };

    // Detect available tools based on project structure
    const projectRoot = process.cwd();

    // Check for skills
    const skillsDir = join(projectRoot, '.claude', 'skills');
    if (fs.existsSync(skillsDir)) {
      tools.skills = fs.readdirSync(skillsDir)
        .filter(f => f.endsWith('.md'));
    }

    // Check for plugins
    const pluginsDir = join(projectRoot, 'plugins');
    if (fs.existsSync(pluginsDir)) {
      tools.plugins = fs.readdirSync(pluginsDir)
        .filter(f => fs.statSync(join(pluginsDir, f)).isDirectory());
    }

    // Check for MCPs
    const mcpConfig = join(projectRoot, '.claude', 'mcp.json');
    if (fs.existsSync(mcpConfig)) {
      const config = JSON.parse(fs.readFileSync(mcpConfig, 'utf8'));
      tools.mcps = Object.keys(config.mcpServers || {});
    }

    this.writeMemory('tools-discovered', tools);

    return tools;
  }

  /**
   * Create scaffolding for a task
   */
  createScaffolding(name, structure) {
    this.scaffolding.set(name, {
      name,
      structure,
      status: 'active',
      createdAt: new Date().toISOString()
    });

    this.writeMemory('scaffolding-created', { name, structure });
    console.log(`🏗️  Scaffolding created: ${name}`);
  }

  /**
   * Tear down scaffolding
   */
  tearDownScaffolding(name) {
    const scaffold = this.scaffolding.get(name);
    if (!scaffold) {
      throw new Error(`Scaffolding not found: ${name}`);
    }

    scaffold.status = 'torn-down';
    scaffold.tornDownAt = new Date().toISOString();

    this.writeMemory('scaffolding-torn-down', { name });
    this.scaffolding.delete(name);

    console.log(`🧹 Scaffolding torn down: ${name}`);
  }

  /**
   * Generate checklist for phases
   */
  generateChecklist() {
    const checklist = this.phases.map(phase => ({
      phase: phase.name,
      status: phase.status,
      completed: this.completedPhases.includes(phase.name),
      duration: phase.endTime
        ? new Date(phase.endTime) - new Date(phase.startTime)
        : null
    }));

    this.writeMemory('checklist-generated', { checklist });

    return checklist;
  }

  /**
   * Mark everything completed
   */
  markAllCompleted() {
    // Complete current phase if active
    if (this.currentPhase) {
      this.completePhase('Auto-completed');
    }

    // Tear down all scaffolding
    for (const [name] of this.scaffolding) {
      this.tearDownScaffolding(name);
    }

    // Complete all sub-agents
    for (const [name, agent] of this.subAgents) {
      if (agent.status === 'active') {
        this.completeSubAgent(name, { autoCompleted: true });
      }
    }

    const summary = {
      totalPhases: this.phases.length,
      completedPhases: this.completedPhases.length,
      subAgents: this.subAgents.size,
      timestamp: new Date().toISOString()
    };

    this.writeMemory('all-completed', summary);

    console.log('✅ All tasks marked as completed');
    return summary;
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    const report = {
      summary: {
        totalPhases: this.phases.length,
        completedPhases: this.completedPhases.length,
        totalDuration: this.phases.reduce((acc, p) => {
          if (p.endTime) {
            return acc + (new Date(p.endTime) - new Date(p.startTime));
          }
          return acc;
        }, 0),
        subAgents: this.subAgents.size,
        scaffolding: this.scaffolding.size
      },
      phases: this.phases,
      checklist: this.generateChecklist(),
      memory: this.readMemory()
    };

    const reportFile = join(this.config.memoryDir, 'final-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(`📊 Report generated: ${reportFile}`);
    return report;
  }

  /**
   * Platform-specific adapter
   */
  getPlatformAdapter() {
    const adapters = {
      claude: {
        format: (message) => ({ role: 'user', content: message }),
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep']
      },
      openai: {
        format: (message) => ({ role: 'user', content: message }),
        tools: ['function', 'code_interpreter']
      },
      antigravity: {
        format: (message) => ({ type: 'message', data: message }),
        tools: ['execute', 'search', 'analyze']
      }
    };

    return adapters[this.config.platform] || adapters.claude;
  }
}

// Export for both ESM and CJS
export default MemoryOrchestrator;
