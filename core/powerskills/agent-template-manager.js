/**
 * PowerSkills Agent Template Manager
 * Manages embedded agent templates from reference materials
 */

class AgentTemplateManager {
  constructor(plugin) {
    this.plugin = plugin;
    this.templates = new Map();
    this.loadEmbeddedTemplates();
  }

  loadEmbeddedTemplates() {
    // Embedded agent templates converted from YAML definitions
    const templates = {
      'code-reviewer': {
        name: 'code-reviewer',
        description: 'Code review specialist with security scanning',
        model: 'claude-sonnet-5',
        systemPrompt: 'You are a world-class code reviewer with expertise in security, performance, and best practices. Review code thoroughly and provide actionable feedback.',
        capabilities: ['security-scan', 'performance-review', 'best-practices', 'refactoring-suggestions'],
        maxTokens: 4096,
        temperature: 0.3
      },
      'deep-researcher': {
        name: 'deep-researcher',
        description: 'Research specialist for multi-source information gathering',
        model: 'claude-haiku-4.5',
        systemPrompt: 'You are a thorough research analyst who synthesizes information from multiple sources with citations.',
        capabilities: ['web-search', 'synthesis', 'citation-generation', 'fact-checking'],
        maxTokens: 8192,
        temperature: 0.5
      },
      'architect': {
        name: 'architect',
        description: 'System architecture designer',
        model: 'claude-opus-5',
        systemPrompt: 'You are a Principal System Architect with deep expertise in distributed systems, scalability, and design patterns.',
        capabilities: ['architecture-design', 'system-modeling', 'trade-off-analysis', 'scalability-planning'],
        maxTokens: 8192,
        temperature: 0.4
      },
      'frontend-designer': {
        name: 'frontend-designer',
        description: 'Frontend component designer',
        model: 'claude-sonnet-5',
        systemPrompt: 'You are a Senior Frontend Engineer specializing in React, Tailwind CSS, and modern UI patterns.',
        capabilities: ['component-design', 'ui-patterns', 'responsive-design', 'accessibility'],
        maxTokens: 4096,
        temperature: 0.5
      },
      'debugger': {
        name: 'debugger',
        description: 'Systematic debugging specialist',
        model: 'claude-sonnet-5',
        systemPrompt: 'You are an expert debugger who follows systematic troubleshooting methodologies.',
        capabilities: ['error-diagnosis', 'root-cause-analysis', 'fix-generation', 'verification'],
        maxTokens: 4096,
        temperature: 0.3
      },
      'memory-writer': {
        name: 'memory-writer',
        description: 'Memory management specialist (Haiku 4.5 ONLY)',
        model: 'claude-haiku-4.5',
        systemPrompt: 'You manage persistent memory. Read/write operations only. Always use Haiku 4.5.',
        capabilities: ['memory-read', 'memory-write', 'session-tracking'],
        maxTokens: 2048,
        temperature: 0.2
      },
      'planner': {
        name: 'planner',
        description: 'Strategic planning and task breakdown',
        model: 'claude-sonnet-5',
        systemPrompt: 'You are a strategic planner who breaks down complex tasks into executable phases.',
        capabilities: ['task-breakdown', 'dependency-analysis', 'risk-assessment', 'timeline-estimation'],
        maxTokens: 8192,
        temperature: 0.4
      },
      'implementer': {
        name: 'implementer',
        description: 'Code implementation specialist',
        model: 'claude-sonnet-5',
        systemPrompt: 'You implement code following plans and specifications precisely.',
        capabilities: ['code-generation', 'testing', 'documentation', 'error-handling'],
        maxTokens: 8192,
        temperature: 0.3
      }
    };

    Object.entries(templates).forEach(([name, template]) => {
      this.templates.set(name, template);
    });

    // Load converted agent templates
    try {
      const convertedTemplates = require('./agent-templates-converted.js');
      Object.entries(convertedTemplates).forEach(([name, template]) => {
        if (!this.templates.has(name)) {
          this.templates.set(name, template);
        }
      });
    } catch (error) {
      this.plugin.memoryEngine.log('AGENT_TEMPLATES', 'No converted templates found', {
        error: error.message
      });
    }

    // Load trading agent templates (specialized financial market agents)
    try {
      const tradingAgents = require('./agent-templates-trading.js');
      Object.entries(tradingAgents).forEach(([name, template]) => {
        if (!this.templates.has(name)) {
          this.templates.set(name, template);
        }
      });

      this.plugin.memoryEngine.log('AGENT_TEMPLATES', 'Trading agents loaded', {
        count: Object.keys(tradingAgents).length,
        agents: Object.keys(tradingAgents)
      });
    } catch (error) {
      this.plugin.memoryEngine.log('AGENT_TEMPLATES', 'No trading agents found', {
        error: error.message
      });
    }

    this.plugin.memoryEngine.log('AGENT_TEMPLATES', 'Templates loaded', {
      totalTemplates: this.templates.size
    });
  }

  getTemplate(templateName) {
    const template = this.templates.get(templateName);

    if (!template) {
      throw new Error(`Agent template not found: ${templateName}`);
    }

    return { ...template }; // Return copy
  }

  instantiateAgent(templateName, config = {}) {
    const template = this.getTemplate(templateName);

    // Merge template with custom config
    const agent = {
      ...template,
      ...config,
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };

    // Enforce memory operations use Haiku 4.5
    if (templateName === 'memory-writer' && config.model !== 'claude-haiku-4.5') {
      agent.model = 'claude-haiku-4.5';
      this.plugin.memoryEngine.log('AGENT_TEMPLATE', 'Enforced Haiku 4.5 for memory-writer', {
        requestedModel: config.model,
        enforcedModel: 'claude-haiku-4.5'
      });
    }

    return agent;
  }

  getCapabilities(templateName) {
    const template = this.getTemplate(templateName);
    return template.capabilities || [];
  }

  listTemplates() {
    return Array.from(this.templates.keys());
  }

  getTemplatesByCapability(capability) {
    return Array.from(this.templates.values())
      .filter(t => t.capabilities && t.capabilities.includes(capability))
      .map(t => t.name);
  }

  templateExists(templateName) {
    return this.templates.has(templateName);
  }

  getTemplateCount() {
    return this.templates.size;
  }
}

module.exports = AgentTemplateManager;
