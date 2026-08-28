/**
 * PowerSkills Token Budget Tracker
 * Context monitoring and token budget management
 */

class TokenBudgetTracker {
  constructor(plugin) {
    this.plugin = plugin;
    this.contextWindow = 200000; // Default context window
    this.usedTokens = 0;
    this.remaining = 0;
    this.phases = [];
    this.warnings = [];
    this.tokenHistory = [];
  }

  initialize(modelContextLimit = 200000) {
    this.contextWindow = modelContextLimit;
    this.usedTokens = this.estimateCurrentUsage();
    this.remaining = this.contextWindow - this.usedTokens;
    this.warnings = [];
    this.phases = [];

    this.plugin.memoryEngine.log('TOKEN_BUDGET', 'Initialized', {
      contextWindow: this.contextWindow,
      usedTokens: this.usedTokens,
      remaining: this.remaining
    });

    return {
      contextWindow: this.contextWindow,
      used: this.usedTokens,
      remaining: this.remaining
    };
  }

  estimateCurrentUsage() {
    // Rough estimation heuristic
    // In production, this would use actual token counter from the platform

    // Base usage: system prompts, plugin initialization
    let baseUsage = 5000;

    // Add memory context if loaded
    const memoryStats = this.plugin.memoryEngine.getStats();
    const memoryTokens = Math.floor(memoryStats.memorySize / 4); // ~4 chars per token
    baseUsage += memoryTokens;

    return baseUsage;
  }

  estimatePhase(phaseDescription) {
    if (!phaseDescription) {
      return 1000; // Default estimate
    }

    // Estimate based on description complexity
    const text = typeof phaseDescription === 'string'
      ? phaseDescription
      : JSON.stringify(phaseDescription);

    // Rough heuristic: ~4 characters per token
    const descriptionTokens = Math.floor(text.length / 4);

    // Phase execution typically uses 10-20x the description size
    const multiplier = 15;
    const estimate = descriptionTokens * multiplier;

    // Minimum estimate
    return Math.max(estimate, 500);
  }

  checkBudget(phase) {
    const phaseName = phase.name || phase.description || 'unknown';
    const estimate = this.estimatePhase(phase.description || phase);

    const percentUsed = (this.usedTokens / this.contextWindow) * 100;

    // Critical: 95% or more
    if (percentUsed >= 95) {
      const warning = {
        level: 'CRITICAL',
        message: `🛑 CRITICAL — ${this.remaining} tokens remaining. Must summarize state to Memory and halt.`,
        phase: phaseName,
        percentUsed: percentUsed.toFixed(2),
        estimate
      };
      this.warnings.push(warning);

      this.plugin.memoryEngine.log('TOKEN_BUDGET', 'CRITICAL threshold reached', warning);

      return false; // Cannot proceed
    }

    // High warning: 85% or more
    if (percentUsed >= 85) {
      const warning = {
        level: 'HIGH',
        message: `🚨 85% context consumed — ${this.remaining} tokens remaining. MANDATORY: Offload to subagents.`,
        phase: phaseName,
        percentUsed: percentUsed.toFixed(2),
        estimate
      };
      this.warnings.push(warning);

      this.plugin.memoryEngine.log('TOKEN_BUDGET', 'HIGH warning', warning);
    }

    // Medium warning: 70% or more
    if (percentUsed >= 70) {
      const warning = {
        level: 'MEDIUM',
        message: `⚠️ 70% context consumed — ${this.remaining} tokens remaining. Consider summarizing.`,
        phase: phaseName,
        percentUsed: percentUsed.toFixed(2),
        estimate
      };
      this.warnings.push(warning);

      this.plugin.memoryEngine.log('TOKEN_BUDGET', 'MEDIUM warning', warning);
    }

    // Record phase
    this.phases.push({
      name: phaseName,
      estimate,
      timestamp: Date.now(),
      percentUsedBefore: percentUsed
    });

    // Update usage
    this.usedTokens += estimate;
    this.remaining = this.contextWindow - this.usedTokens;

    // Record token history
    this.tokenHistory.push({
      phase: phaseName,
      used: this.usedTokens,
      remaining: this.remaining,
      timestamp: Date.now()
    });

    return true; // Can proceed
  }

  trackTokenUsage(phase, actualTokens) {
    // Update actual usage if provided by platform
    if (actualTokens && typeof actualTokens === 'number') {
      const phaseName = phase.name || phase.description || 'unknown';

      // Find the phase in history
      const phaseRecord = this.phases.find(p => p.name === phaseName);
      if (phaseRecord) {
        phaseRecord.actual = actualTokens;
        phaseRecord.accuracy = ((actualTokens / phaseRecord.estimate) * 100).toFixed(2) + '%';
      }

      // Recalculate remaining
      this.usedTokens = actualTokens;
      this.remaining = this.contextWindow - this.usedTokens;
    }
  }

  getWarnings(level = null) {
    if (!level) {
      return this.warnings;
    }

    return this.warnings.filter(w => w.level === level);
  }

  getReport() {
    const percentUsed = ((this.usedTokens / this.contextWindow) * 100).toFixed(2);

    return {
      contextWindow: this.contextWindow,
      usedTokens: this.usedTokens,
      remaining: this.remaining,
      percentUsed,
      status: this.getStatus(),
      warnings: this.warnings,
      phases: this.phases,
      tokenHistory: this.tokenHistory
    };
  }

  getStatus() {
    const percentUsed = (this.usedTokens / this.contextWindow) * 100;

    if (percentUsed >= 95) return 'CRITICAL';
    if (percentUsed >= 85) return 'HIGH';
    if (percentUsed >= 70) return 'MEDIUM';
    if (percentUsed >= 50) return 'LOW';
    return 'OK';
  }

  shouldSummarize() {
    return this.getStatus() === 'HIGH' || this.getStatus() === 'CRITICAL';
  }

  shouldOffloadToSubagent() {
    return this.getStatus() === 'HIGH' || this.getStatus() === 'CRITICAL';
  }

  reset() {
    this.usedTokens = this.estimateCurrentUsage();
    this.remaining = this.contextWindow - this.usedTokens;
    this.phases = [];
    this.warnings = [];
    this.tokenHistory = [];

    this.plugin.memoryEngine.log('TOKEN_BUDGET', 'Reset', {
      usedTokens: this.usedTokens,
      remaining: this.remaining
    });
  }

  getPhaseReport(phaseName) {
    return this.phases.find(p => p.name === phaseName);
  }

  getTotalPhasesExecuted() {
    return this.phases.length;
  }

  getAveragePhaseTokens() {
    if (this.phases.length === 0) return 0;

    const total = this.phases.reduce((sum, p) => sum + (p.actual || p.estimate), 0);
    return Math.floor(total / this.phases.length);
  }
}

module.exports = TokenBudgetTracker;
