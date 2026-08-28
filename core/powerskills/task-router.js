/**
 * PowerSkills Task Router
 * Intelligent task classification and skill routing with adaptive model selection
 */

class TaskRouter {
  constructor(plugin) {
    this.plugin = plugin;
    this.taskPatterns = this.loadTaskPatterns();
    this.modelTiers = {
      flash_lite: 'claude-haiku-4.5',      // Memory operations only
      flash: 'claude-haiku-4.5',            // Simple retrieval
      inherit: 'claude-sonnet-5',           // Standard work
      pro: 'claude-opus-5'                  // Complex reasoning
    };
  }

  loadTaskPatterns() {
    return {
      PRESENTATION: {
        patterns: [/\.(pptx|presentation|slides?|deck)/i, /create.*presentation/i, /make.*slides/i],
        keywords: ['presentation', 'slides', 'deck', 'powerpoint', 'keynote'],
        modelTier: 'inherit',
        skills: ['presentation-generation']
      },
      DOCUMENT: {
        patterns: [/\.(docx|document|report|memo)/i, /write.*document/i, /create.*report/i],
        keywords: ['document', 'report', 'memo', 'doc', 'write up'],
        modelTier: 'inherit',
        skills: ['document-generation']
      },
      SPREADSHEET: {
        patterns: [/\.(xlsx|spreadsheet|csv)/i, /create.*spreadsheet/i, /excel/i],
        keywords: ['spreadsheet', 'excel', 'csv', 'data table'],
        modelTier: 'flash',
        skills: ['spreadsheet-generation']
      },
      PDF: {
        patterns: [/\.pdf/i, /fill.*form/i, /extract.*pdf/i],
        keywords: ['pdf', 'form', 'extract'],
        modelTier: 'flash',
        skills: ['pdf-manipulation']
      },
      ENGINEERING: {
        patterns: [/(implement|build|code|fix|debug|refactor)/i],
        keywords: ['implement', 'build', 'code', 'fix', 'debug', 'refactor', 'develop'],
        modelTier: 'inherit',
        skills: ['code-review', 'systematic-debugging']
      },
      ARCHITECTURE: {
        patterns: [/(architecture|blueprint|prd|design.*system)/i],
        keywords: ['architecture', 'blueprint', 'prd', 'design', 'system design'],
        modelTier: 'pro',
        skills: ['architecture-design']
      },
      RESEARCH: {
        patterns: [/(research|investigate|analyze|study|explore)/i],
        keywords: ['research', 'investigate', 'analyze', 'study', 'explore', 'deep dive'],
        modelTier: 'flash',
        skills: ['deep-research']
      },
      FRONTEND: {
        patterns: [/(ui|component|frontend|react|vue|angular|tailwind)/i],
        keywords: ['ui', 'component', 'frontend', 'react', 'interface', 'tailwind'],
        modelTier: 'inherit',
        skills: ['frontend-patterns']
      },
      SCHEDULE: {
        patterns: [/(schedule|every\s+day|cron|remind|automate)/i],
        keywords: ['schedule', 'remind', 'cron', 'every day', 'automate'],
        modelTier: 'flash',
        skills: ['task-scheduler']
      },
      DEBUGGING: {
        patterns: [/(debug|troubleshoot|diagnose|fix.*bug|error)/i],
        keywords: ['debug', 'troubleshoot', 'diagnose', 'fix bug', 'error', 'issue', 'problem'],
        modelTier: 'inherit',
        skills: ['systematic-debugging']
      },
      MEMORY: {
        patterns: [/(memory|remember|recall|store|retrieve)/i],
        keywords: ['memory', 'remember', 'recall', 'store', 'retrieve'],
        modelTier: 'flash_lite',
        skills: ['memory-management']
      }
    };
  }

  detectTaskType(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
      return 'GENERAL';
    }

    const msg = userMessage.toLowerCase();

    // Check each task type's patterns and keywords
    for (const [taskType, config] of Object.entries(this.taskPatterns)) {
      // Test regex patterns
      if (config.patterns.some(pattern => pattern.test(msg))) {
        this.plugin.memoryEngine.log('TASK_ROUTER', `Detected task type: ${taskType}`, {
          matchType: 'pattern'
        });
        return taskType;
      }

      // Test keywords
      if (config.keywords.some(keyword => msg.includes(keyword.toLowerCase()))) {
        this.plugin.memoryEngine.log('TASK_ROUTER', `Detected task type: ${taskType}`, {
          matchType: 'keyword'
        });
        return taskType;
      }
    }

    // Default to GENERAL if no match
    return 'GENERAL';
  }

  selectModel(taskType, complexity = 'medium') {
    // Memory operations ALWAYS use Haiku 4.5
    if (taskType === 'MEMORY') {
      return this.modelTiers.flash_lite;
    }

    // Get default model tier for task type
    const taskConfig = this.taskPatterns[taskType];
    if (taskConfig && taskConfig.modelTier) {
      const tier = taskConfig.modelTier;
      return this.modelTiers[tier];
    }

    // Fallback to complexity-based selection
    const complexityMap = {
      simple: 'flash',
      medium: 'inherit',
      complex: 'pro'
    };

    const tier = complexityMap[complexity] || 'inherit';
    return this.modelTiers[tier];
  }

  routeToSkill(taskType) {
    const taskConfig = this.taskPatterns[taskType];

    if (taskConfig && taskConfig.skills) {
      return taskConfig.skills;
    }

    // Fallback routing map
    const fallbackMap = {
      ENGINEERING: ['code-review', 'systematic-debugging'],
      ARCHITECTURE: ['architecture-design'],
      RESEARCH: ['deep-research'],
      FRONTEND: ['frontend-patterns'],
      DOCUMENT: ['document-generation'],
      PRESENTATION: ['presentation-generation'],
      SPREADSHEET: ['spreadsheet-generation'],
      PDF: ['pdf-manipulation'],
      SCHEDULE: ['task-scheduler'],
      DEBUGGING: ['systematic-debugging'],
      MEMORY: ['memory-management'],
      GENERAL: ['general-assistant']
    };

    return fallbackMap[taskType] || ['general-assistant'];
  }

  estimateComplexity(userMessage, taskType) {
    const msg = userMessage.toLowerCase();
    let score = 0;

    // Complexity indicators
    const complexityIndicators = {
      simple: ['quick', 'simple', 'basic', 'easy', 'just'],
      medium: ['need', 'want', 'create', 'make', 'build'],
      complex: ['comprehensive', 'detailed', 'complex', 'advanced', 'full', 'complete']
    };

    // Count indicators
    if (complexityIndicators.complex.some(word => msg.includes(word))) {
      score += 3;
    }
    if (complexityIndicators.medium.some(word => msg.includes(word))) {
      score += 2;
    }
    if (complexityIndicators.simple.some(word => msg.includes(word))) {
      score += 1;
    }

    // Message length heuristic
    const words = userMessage.split(/\s+/).length;
    if (words > 50) score += 2;
    else if (words > 20) score += 1;

    // Task type baseline
    const taskComplexity = {
      ARCHITECTURE: 2,
      ENGINEERING: 1,
      DEBUGGING: 1,
      RESEARCH: 1,
      GENERAL: 0
    };

    score += taskComplexity[taskType] || 0;

    // Map score to complexity level
    if (score <= 2) return 'simple';
    if (score <= 4) return 'medium';
    return 'complex';
  }

  shouldUseSubagent(taskType, complexity) {
    // Tasks that benefit from subagent orchestration
    const subagentTasks = ['ENGINEERING', 'ARCHITECTURE', 'RESEARCH', 'DEBUGGING'];

    if (subagentTasks.includes(taskType) && complexity !== 'simple') {
      return true;
    }

    return false;
  }

  getRecommendedSkills(userMessage) {
    const taskType = this.detectTaskType(userMessage);
    const complexity = this.estimateComplexity(userMessage, taskType);
    const modelTier = this.selectModel(taskType, complexity);
    const skills = this.routeToSkill(taskType);
    const useSubagent = this.shouldUseSubagent(taskType, complexity);

    return {
      taskType,
      complexity,
      modelTier,
      skills,
      useSubagent
    };
  }
}

module.exports = TaskRouter;
