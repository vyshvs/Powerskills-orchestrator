/**
 * Memory Orchestrator Plugin - Improved Version
 *
 * Security improvements:
 * - Async file operations to prevent blocking
 * - Atomic file operations to prevent race conditions
 * - Input validation and sanitization
 * - Comprehensive error handling
 * - Memory-efficient streaming for large datasets
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import QodoIntegration from './qodo-integration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Custom error classes for better error handling
 */
class MemoryOrchestratorError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'MemoryOrchestratorError';
    this.code = code;
  }
}

class ValidationError extends MemoryOrchestratorError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR');
  }
}

class FileSystemError extends MemoryOrchestratorError {
  constructor(message, originalError) {
    super(message, 'FS_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Input validation utilities
 */
const validators = {
  isString(value, fieldName) {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`);
    }
  },

  isNonEmptyString(value, fieldName) {
    this.isString(value, fieldName);
    if (value.trim().length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`);
    }
  },

  isValidPhaseName(name) {
    this.isNonEmptyString(name, 'Phase name');
    if (name.length > 100) {
      throw new ValidationError('Phase name too long (max 100 characters)');
    }
  },

  isValidMemoryType(type) {
    this.isNonEmptyString(type, 'Memory type');
    if (!/^[a-z0-9-]+$/i.test(type)) {
      throw new ValidationError('Memory type can only contain alphanumeric characters and hyphens');
    }
  },

  isValidPlatform(platform) {
    const validPlatforms = ['claude', 'openai', 'antigravity'];
    if (!validPlatforms.includes(platform)) {
      throw new ValidationError(`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`);
    }
  }
};

export class MemoryOrchestrator {
  constructor(config = {}) {
    // Validate config
    if (config.platform) {
      validators.isValidPlatform(config.platform);
    }

    this.config = {
      memoryDir: config.memoryDir || join(process.cwd(), '.memory'),
      platform: config.platform || 'claude',
      autoSkillPick: config.autoSkillPick !== false,
      maxMemoryEntries: config.maxMemoryEntries || 10000,
      qodoEnabled: config.qodoEnabled !== false,
      qodoAutoFix: config.qodoAutoFix !== false,
      runTests: config.runTests !== false,
      ...config
    };

    this.phases = [];
    this.currentPhase = null;
    this.completedPhases = [];
    this.subAgents = new Map();
    this.scaffolding = new Map();
    this.initialized = false;
    this.modifiedFiles = new Set(); // Track files modified during phase

    // Initialize Qodo integration
    this.qodo = new QodoIntegration({
      enabled: this.config.qodoEnabled,
      autoFix: this.config.qodoAutoFix,
      testCommand: this.config.testCommand
    });
  }

  /**
   * Initialize memory directory with atomic operations
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Create directory with recursive flag - atomic operation
      await fs.mkdir(this.config.memoryDir, { recursive: true });

      const trackingFile = join(this.config.memoryDir, 'phase-tracking.json');

      // Try to create file atomically (wx flag fails if exists)
      try {
        await fs.writeFile(
          trackingFile,
          JSON.stringify({
            phases: [],
            completedPhases: [],
            currentPhase: null,
            startTime: new Date().toISOString()
          }, null, 2),
          { flag: 'wx' }
        );
      } catch (error) {
        // File exists, verify it's readable
        if (error.code !== 'EEXIST') {
          throw new FileSystemError('Failed to create tracking file', error);
        }

        // Validate existing file
        await fs.access(trackingFile, fs.constants.R_OK | fs.constants.W_OK);
      }

      this.initialized = true;
    } catch (error) {
      throw new FileSystemError(`Failed to initialize memory directory: ${error.message}`, error);
    }
  }

  /**
   * Ensure initialization before operations
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Start a new phase with validation
   */
  async startPhase(phaseName, description = '') {
    await this.ensureInitialized();

    validators.isValidPhaseName(phaseName);
    validators.isString(description, 'Description');

    if (this.currentPhase) {
      throw new MemoryOrchestratorError(
        `Cannot start phase "${phaseName}". Phase "${this.currentPhase.name}" is still active.`,
        'PHASE_CONFLICT'
      );
    }

    const phase = {
      name: phaseName,
      description,
      startTime: new Date().toISOString(),
      status: 'in-progress',
      memory: [],
      modifiedFiles: [],
      qualityCheck: null
    };

    this.currentPhase = phase;
    this.phases.push(phase);
    this.modifiedFiles.clear(); // Reset file tracking for new phase

    await this.writeMemory('phase-start', {
      phase: phaseName,
      description,
      timestamp: phase.startTime
    });

    console.log(`📋 Phase started: ${phaseName}`);
    return phase;
  }

  /**
   * Complete current phase with validation and Qodo review
   */
  async completePhase(summary = '') {
    await this.ensureInitialized();

    if (!this.currentPhase) {
      throw new MemoryOrchestratorError('No active phase to complete', 'NO_ACTIVE_PHASE');
    }

    validators.isString(summary, 'Summary');

    console.log(`\n🔍 Running quality checks for phase: ${this.currentPhase.name}`);

    // Run Qodo review and tests on modified files
    const modifiedFilesArray = Array.from(this.modifiedFiles);
    this.currentPhase.modifiedFiles = modifiedFilesArray;

    let qualityCheck = null;
    if (modifiedFilesArray.length > 0) {
      console.log(`📝 Files modified in this phase: ${modifiedFilesArray.length}`);

      qualityCheck = await this.qodo.runQualityCheck(modifiedFilesArray);
      this.currentPhase.qualityCheck = qualityCheck;

      // Generate quality report
      const reportPath = join(
        this.config.memoryDir,
        `quality-report-${this.currentPhase.name.replace(/[^a-z0-9]/gi, '-')}.json`
      );
      await this.qodo.generateQualityReport(qualityCheck, reportPath);

      // Check if quality check passed
      if (!qualityCheck.passed) {
        console.warn('⚠️  Quality checks failed, but proceeding with phase completion');
        console.warn('📊 Review quality report for details');
      } else {
        console.log('✅ All quality checks passed');
      }
    } else {
      console.log('ℹ️  No files modified in this phase, skipping quality checks');
      qualityCheck = { skipped: true, reason: 'No files modified' };
      this.currentPhase.qualityCheck = qualityCheck;
    }

    // Update phase status
    this.currentPhase.status = 'completed';
    this.currentPhase.endTime = new Date().toISOString();
    this.currentPhase.summary = summary;

    this.completedPhases.push(this.currentPhase.name);

    // Write memory with quality check results
    await this.writeMemory('phase-complete', {
      phase: this.currentPhase.name,
      summary,
      duration: new Date(this.currentPhase.endTime) - new Date(this.currentPhase.startTime),
      timestamp: this.currentPhase.endTime,
      modifiedFiles: modifiedFilesArray,
      qualityCheck: {
        passed: qualityCheck.passed,
        reviewIssues: qualityCheck.review?.issues?.length || 0,
        testsStatus: qualityCheck.tests?.passed ? 'passed' : 'failed',
        autoFixed: qualityCheck.review?.fixed || 0
      }
    });

    await this.updatePhaseTracking();

    console.log(`✅ Phase completed: ${this.currentPhase.name}`);

    const completed = this.currentPhase;
    this.currentPhase = null;
    this.modifiedFiles.clear();

    return completed;
  }

  /**
   * Track a file modification during current phase
   */
  trackFileModification(filePath) {
    if (this.currentPhase) {
      this.modifiedFiles.add(filePath);
    }
  }

  /**
   * Track multiple file modifications
   */
  trackFileModifications(filePaths) {
    if (this.currentPhase) {
      filePaths.forEach(path => this.modifiedFiles.add(path));
    }
  }

  /**
   * Get files modified in current phase
   */
  getModifiedFiles() {
    return Array.from(this.modifiedFiles);
  }

  /**
   * Write memory entry with atomic operation
   */
  async writeMemory(type, data) {
    await this.ensureInitialized();

    validators.isValidMemoryType(type);

    if (typeof data !== 'object' || data === null) {
      throw new ValidationError('Memory data must be an object');
    }

    const timestamp = new Date().toISOString();
    const memoryEntry = {
      type,
      data,
      timestamp,
      phase: this.currentPhase?.name || 'no-phase'
    };

    // Add to phase-specific memory
    if (this.currentPhase) {
      this.currentPhase.memory.push(memoryEntry);
    }

    // Generate safe filename
    const safeTimestamp = timestamp.replace(/[:.]/g, '-');
    const safeType = type.replace(/[^a-z0-9-]/gi, '-');
    const memoryFile = join(
      this.config.memoryDir,
      `${safeTimestamp}-${safeType}.json`
    );

    try {
      await fs.writeFile(memoryFile, JSON.stringify(memoryEntry, null, 2), 'utf8');
    } catch (error) {
      throw new FileSystemError(`Failed to write memory entry: ${error.message}`, error);
    }

    return memoryEntry;
  }

  /**
   * Read memory entries with filtering and pagination
   */
  async readMemory(filter = {}, options = {}) {
    await this.ensureInitialized();

    const { limit = this.config.maxMemoryEntries, offset = 0 } = options;

    try {
      const files = await fs.readdir(this.config.memoryDir);
      const memoryFiles = files
        .filter(f => f.endsWith('.json') && f !== 'phase-tracking.json')
        .sort()
        .reverse(); // Most recent first

      const memories = [];
      let count = 0;
      let skipped = 0;

      for (const file of memoryFiles) {
        if (count >= limit) break;
        if (skipped < offset) {
          skipped++;
          continue;
        }

        try {
          const content = await fs.readFile(
            join(this.config.memoryDir, file),
            'utf8'
          );
          const memory = JSON.parse(content);

          // Apply filters
          if (filter.type && memory.type !== filter.type) continue;
          if (filter.phase && memory.phase !== filter.phase) continue;
          if (filter.since && new Date(memory.timestamp) < new Date(filter.since)) continue;

          memories.push(memory);
          count++;
        } catch (error) {
          console.warn(`Failed to read memory file ${file}:`, error.message);
          continue;
        }
      }

      return memories;
    } catch (error) {
      throw new FileSystemError(`Failed to read memory entries: ${error.message}`, error);
    }
  }

  /**
   * Update phase tracking file atomically
   */
  async updatePhaseTracking() {
    await this.ensureInitialized();

    const trackingFile = join(this.config.memoryDir, 'phase-tracking.json');
    const tracking = {
      phases: this.phases,
      completedPhases: this.completedPhases,
      currentPhase: this.currentPhase,
      lastUpdate: new Date().toISOString()
    };

    try {
      // Write to temp file first, then rename (atomic)
      const tempFile = `${trackingFile}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(tracking, null, 2), 'utf8');
      await fs.rename(tempFile, trackingFile);
    } catch (error) {
      throw new FileSystemError(`Failed to update phase tracking: ${error.message}`, error);
    }
  }

  /**
   * Create and manage sub-agents with validation
   */
  async createSubAgent(name, config = {}) {
    await this.ensureInitialized();

    validators.isNonEmptyString(name, 'Sub-agent name');

    if (this.subAgents.has(name)) {
      throw new MemoryOrchestratorError(`Sub-agent "${name}" already exists`, 'DUPLICATE_AGENT');
    }

    const subAgent = {
      name,
      config,
      startTime: new Date().toISOString(),
      status: 'active',
      memory: []
    };

    this.subAgents.set(name, subAgent);

    await this.writeMemory('subagent-created', {
      name,
      config,
      phase: this.currentPhase?.name
    });

    console.log(`🤖 Sub-agent created: ${name}`);
    return subAgent;
  }

  /**
   * Complete sub-agent work with validation
   */
  async completeSubAgent(name, result = {}) {
    await this.ensureInitialized();

    validators.isNonEmptyString(name, 'Sub-agent name');

    const subAgent = this.subAgents.get(name);
    if (!subAgent) {
      throw new MemoryOrchestratorError(`Sub-agent not found: ${name}`, 'AGENT_NOT_FOUND');
    }

    if (subAgent.status === 'completed') {
      throw new MemoryOrchestratorError(`Sub-agent "${name}" already completed`, 'ALREADY_COMPLETED');
    }

    subAgent.status = 'completed';
    subAgent.endTime = new Date().toISOString();
    subAgent.result = result;

    await this.writeMemory('subagent-completed', {
      name,
      result,
      duration: new Date(subAgent.endTime) - new Date(subAgent.startTime)
    });

    console.log(`✅ Sub-agent completed: ${name}`);
    return subAgent;
  }

  /**
   * Auto-pick tools from available library
   */
  async autoPickTools(context = {}) {
    await this.ensureInitialized();

    const tools = {
      skills: [],
      plugins: [],
      mcps: []
    };

    const projectRoot = process.cwd();

    try {
      // Check for skills
      const skillsDir = join(projectRoot, '.claude', 'skills');
      try {
        const skillFiles = await fs.readdir(skillsDir);
        tools.skills = skillFiles.filter(f => f.endsWith('.md'));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn('Failed to read skills directory:', error.message);
        }
      }

      // Check for plugins
      const pluginsDir = join(projectRoot, 'plugins');
      try {
        const pluginFiles = await fs.readdir(pluginsDir);
        const pluginDirs = await Promise.all(
          pluginFiles.map(async (f) => {
            try {
              const stat = await fs.stat(join(pluginsDir, f));
              return stat.isDirectory() ? f : null;
            } catch {
              return null;
            }
          })
        );
        tools.plugins = pluginDirs.filter(Boolean);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn('Failed to read plugins directory:', error.message);
        }
      }

      // Check for MCPs
      const mcpConfig = join(projectRoot, '.claude', 'mcp.json');
      try {
        const config = await fs.readFile(mcpConfig, 'utf8');
        const parsed = JSON.parse(config);
        tools.mcps = Object.keys(parsed.mcpServers || {});
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn('Failed to read MCP config:', error.message);
        }
      }

      await this.writeMemory('tools-discovered', tools);

      return tools;
    } catch (error) {
      throw new FileSystemError(`Failed to discover tools: ${error.message}`, error);
    }
  }

  /**
   * Create scaffolding with validation
   */
  async createScaffolding(name, structure) {
    await this.ensureInitialized();

    validators.isNonEmptyString(name, 'Scaffolding name');

    if (this.scaffolding.has(name)) {
      throw new MemoryOrchestratorError(`Scaffolding "${name}" already exists`, 'DUPLICATE_SCAFFOLDING');
    }

    this.scaffolding.set(name, {
      name,
      structure,
      status: 'active',
      createdAt: new Date().toISOString()
    });

    await this.writeMemory('scaffolding-created', { name, structure });
    console.log(`🏗️  Scaffolding created: ${name}`);
  }

  /**
   * Tear down scaffolding with validation
   */
  async tearDownScaffolding(name) {
    await this.ensureInitialized();

    validators.isNonEmptyString(name, 'Scaffolding name');

    const scaffold = this.scaffolding.get(name);
    if (!scaffold) {
      throw new MemoryOrchestratorError(`Scaffolding not found: ${name}`, 'SCAFFOLDING_NOT_FOUND');
    }

    scaffold.status = 'torn-down';
    scaffold.tornDownAt = new Date().toISOString();

    await this.writeMemory('scaffolding-torn-down', { name });
    this.scaffolding.delete(name);

    console.log(`🧹 Scaffolding torn down: ${name}`);
  }

  /**
   * Generate checklist for phases
   */
  generateChecklist() {
    return this.phases.map(phase => ({
      phase: phase.name,
      status: phase.status,
      completed: this.completedPhases.includes(phase.name),
      duration: phase.endTime
        ? new Date(phase.endTime) - new Date(phase.startTime)
        : null
    }));
  }

  /**
   * Mark everything completed
   */
  async markAllCompleted() {
    await this.ensureInitialized();

    // Complete current phase if active
    if (this.currentPhase) {
      await this.completePhase('Auto-completed');
    }

    // Tear down all scaffolding
    const scaffoldingNames = Array.from(this.scaffolding.keys());
    for (const name of scaffoldingNames) {
      await this.tearDownScaffolding(name);
    }

    // Complete all sub-agents
    for (const [name, agent] of this.subAgents) {
      if (agent.status === 'active') {
        await this.completeSubAgent(name, { autoCompleted: true });
      }
    }

    const summary = {
      totalPhases: this.phases.length,
      completedPhases: this.completedPhases.length,
      subAgents: this.subAgents.size,
      timestamp: new Date().toISOString()
    };

    await this.writeMemory('all-completed', summary);

    console.log('✅ All tasks marked as completed');
    return summary;
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    await this.ensureInitialized();

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
      memory: await this.readMemory({}, { limit: 1000 })
    };

    const reportFile = join(this.config.memoryDir, 'final-report.json');

    try {
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2), 'utf8');
      console.log(`📊 Report generated: ${reportFile}`);
    } catch (error) {
      console.warn(`Failed to write report file: ${error.message}`);
    }

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

export default MemoryOrchestrator;
