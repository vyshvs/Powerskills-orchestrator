/**
 * PowerSkills Command Dispatcher
 * Parses and executes slash commands
 */

class CommandDispatcher {
  constructor(plugin) {
    this.plugin = plugin;
    this.commands = new Map();
    this.registerEmbeddedCommands();
  }

  registerEmbeddedCommands() {
    // Core commands embedded from reference materials
    const commands = {
      '/code-review': {
        name: 'code-review',
        description: 'Comprehensive code review with security scanning',
        usage: '/code-review [file-pattern]',
        handler: async (args) => await this.handleCodeReview(args)
      },
      '/deep-research': {
        name: 'deep-research',
        description: 'Multi-source deep research on any topic',
        usage: '/deep-research <topic>',
        handler: async (args) => await this.handleDeepResearch(args)
      },
      '/debug': {
        name: 'debug',
        description: 'Systematic debugging workflow',
        usage: '/debug [error-description]',
        handler: async (args) => await this.handleDebug(args)
      },
      '/architecture': {
        name: 'architecture',
        description: 'Design system architecture',
        usage: '/architecture <requirements>',
        handler: async (args) => await this.handleArchitecture(args)
      },
      '/frontend': {
        name: 'frontend',
        description: 'Frontend component design',
        usage: '/frontend <component-description>',
        handler: async (args) => await this.handleFrontend(args)
      },
      '/memory-read': {
        name: 'memory-read',
        description: 'Read from persistent memory',
        usage: '/memory-read <key>',
        handler: async (args) => await this.handleMemoryRead(args)
      },
      '/memory-write': {
        name: 'memory-write',
        description: 'Write to persistent memory',
        usage: '/memory-write <key> <value>',
        handler: async (args) => await this.handleMemoryWrite(args)
      },
      '/memory-search': {
        name: 'memory-search',
        description: 'Search persistent memory',
        usage: '/memory-search <query>',
        handler: async (args) => await this.handleMemorySearch(args)
      },
      '/status': {
        name: 'status',
        description: 'Get plugin status and capabilities',
        usage: '/status',
        handler: async (args) => await this.handleStatus(args)
      },
      '/help': {
        name: 'help',
        description: 'Show available commands',
        usage: '/help [command]',
        handler: async (args) => await this.handleHelp(args)
      }
    };

    Object.entries(commands).forEach(([name, command]) => {
      this.commands.set(name, command);
    });

    this.plugin.memoryEngine.log('COMMANDS', 'Commands registered', {
      totalCommands: this.commands.size
    });
  }

  parseCommand(userInput) {
    if (!userInput || typeof userInput !== 'string') {
      return null;
    }

    const trimmed = userInput.trim();

    // Match /command-name followed by optional arguments
    const match = trimmed.match(/^\/([a-z-]+)(?:\s+(.*))?$/i);

    if (!match) {
      return null;
    }

    return {
      command: `/${match[1].toLowerCase()}`,
      args: match[2]?.trim() || ''
    };
  }

  async executeCommand(commandName, args = '') {
    const command = this.commands.get(commandName);

    if (!command) {
      throw new Error(`Unknown command: ${commandName}. Type /help for available commands.`);
    }

    this.plugin.memoryEngine.log('COMMAND_EXECUTE', `Executing command: ${commandName}`, {
      args: args.substring(0, 100)
    });

    try {
      const result = await command.handler(args);

      this.plugin.memoryEngine.log('COMMAND_COMPLETE', `Command completed: ${commandName}`, {
        success: true
      });

      return result;
    } catch (error) {
      this.plugin.memoryEngine.log('COMMAND_ERROR', `Command failed: ${commandName}`, {
        error: error.message
      });
      throw error;
    }
  }

  // Command handlers
  async handleCodeReview(args) {
    const pattern = args || '**/*.js';

    return await this.plugin.skillRegistry.executeSkill('code-review', {
      userMessage: `Review code matching ${pattern}`,
      files: pattern
    });
  }

  async handleDeepResearch(args) {
    if (!args) {
      throw new Error('Usage: /deep-research <topic>');
    }

    return await this.plugin.skillRegistry.executeSkill('deep-research', {
      userMessage: `Research ${args}`
    });
  }

  async handleDebug(args) {
    return await this.plugin.skillRegistry.executeSkill('systematic-debugging', {
      userMessage: args || 'Debug the current issue',
      error: { message: args }
    });
  }

  async handleArchitecture(args) {
    if (!args) {
      throw new Error('Usage: /architecture <requirements>');
    }

    return await this.plugin.skillRegistry.executeSkill('architecture-design', {
      userMessage: `Design architecture for: ${args}`
    });
  }

  async handleFrontend(args) {
    if (!args) {
      throw new Error('Usage: /frontend <component-description>');
    }

    return await this.plugin.skillRegistry.executeSkill('frontend-patterns', {
      userMessage: `Design frontend component: ${args}`
    });
  }

  async handleMemoryRead(args) {
    if (!args) {
      throw new Error('Usage: /memory-read <key>');
    }

    const result = await this.plugin.memoryEngine.read(args);

    return {
      type: 'memory-read',
      key: args,
      value: result
    };
  }

  async handleMemoryWrite(args) {
    if (!args) {
      throw new Error('Usage: /memory-write <key> <value>');
    }

    const parts = args.split(' ');
    const key = parts[0];
    const value = parts.slice(1).join(' ');

    if (!value) {
      throw new Error('Value required. Usage: /memory-write <key> <value>');
    }

    await this.plugin.memoryEngine.write(key, value);

    return {
      type: 'memory-write',
      key,
      value,
      success: true
    };
  }

  async handleMemorySearch(args) {
    if (!args) {
      throw new Error('Usage: /memory-search <query>');
    }

    const results = await this.plugin.memoryEngine.search(args);

    return {
      type: 'memory-search',
      query: args,
      results
    };
  }

  async handleStatus(args) {
    const memoryStats = this.plugin.memoryEngine.getStats();
    const agentStats = await this.plugin.orchestrator.getStatus();

    return {
      type: 'status',
      plugin: {
        name: this.plugin.config.name,
        version: this.plugin.config.version,
        sessionActive: this.plugin.sessionActive
      },
      skills: {
        total: this.plugin.skillRegistry.getSkillCount(),
        loaded: this.plugin.skillRegistry.getSkillCount()
      },
      agents: {
        templates: this.plugin.agentTemplateManager.getTemplateCount(),
        active: agentStats.activeAgents
      },
      commands: {
        total: this.commands.size,
        available: Array.from(this.commands.keys())
      },
      memory: memoryStats
    };
  }

  async handleHelp(args) {
    if (args) {
      // Show help for specific command
      const commandName = args.startsWith('/') ? args : `/${args}`;
      const command = this.commands.get(commandName);

      if (!command) {
        throw new Error(`Unknown command: ${commandName}`);
      }

      return {
        type: 'help',
        command: commandName,
        description: command.description,
        usage: command.usage
      };
    }

    // Show all commands
    const commandList = Array.from(this.commands.values()).map(cmd => ({
      name: `/${cmd.name}`,
      description: cmd.description,
      usage: cmd.usage
    }));

    return {
      type: 'help',
      commands: commandList,
      totalCommands: commandList.length
    };
  }

  listCommands() {
    return Array.from(this.commands.keys());
  }

  getCommand(commandName) {
    return this.commands.get(commandName);
  }

  commandExists(commandName) {
    return this.commands.has(commandName);
  }
}

module.exports = CommandDispatcher;
