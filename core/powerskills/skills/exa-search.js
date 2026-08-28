/**
 * Skill: exa-search
 * Neural search via Exa MCP for web, code, and company research. Use when the user needs web search, code examples, company intel, people lookup, or AI-powered deep research with Exa's neural search engine.
 * Auto-generated from SKILL.md
 */

module.exports = {
  name: 'exa-search',
  description: `Neural search via Exa MCP for web, code, and company research. Use when the user needs web search, code examples, company intel, people lookup, or AI-powered deep research with Exa's neural search engine.`,
  category: 'research',
  triggers: [
  "exa search",
  "exa-search",
  "search for",
  "look up",
  "find",
  "what's the latest on"
],
  priority: 8,
  modelTier: 'flash',

  async execute(context) {
    const { plugin, userMessage } = context;

    plugin.memoryEngine.log('SKILL_EXECUTE', 'Executing exa-search', {
      userMessage: userMessage?.substring(0, 100)
    });

    try {
      // Execute skill workflow
      const result = await this.executeWorkflow(context);

      return {
        type: 'exa-search',
        success: true,
        output: result
      };
    } catch (error) {
      plugin.memoryEngine.log('SKILL_ERROR', 'Skill execution failed: exa-search', {
        error: error.message
      });

      return {
        type: 'exa-search',
        success: false,
        error: error.message
      };
    }
  },

  async executeWorkflow(context) {
    const { plugin, userMessage } = context;

    // Generic workflow implementation
    // TODO: Parse workflow steps from SKILL.md and implement

    return {
      message: 'Skill executed successfully',
      details: 'This is a placeholder implementation'
    };
  }
};
