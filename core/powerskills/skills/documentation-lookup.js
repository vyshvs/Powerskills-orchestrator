/**
 * Skill: documentation-lookup
 * Use up-to-date library and framework docs via Context7 MCP instead of training data. Activates for setup questions, API references, code examples, or when the user names a framework (e.g. React, Next.js, Prisma).
 * Auto-generated from SKILL.md
 */

module.exports = {
  name: 'documentation-lookup',
  description: `Use up-to-date library and framework docs via Context7 MCP instead of training data. Activates for setup questions, API references, code examples, or when the user names a framework (e.g. React, Next.js, Prisma).`,
  category: 'engineering',
  triggers: [
  "documentation lookup",
  "documentation-lookup"
],
  priority: 8,
  modelTier: 'inherit',

  async execute(context) {
    const { plugin, userMessage } = context;

    plugin.memoryEngine.log('SKILL_EXECUTE', 'Executing documentation-lookup', {
      userMessage: userMessage?.substring(0, 100)
    });

    try {
      // Execute skill workflow
      const result = await this.executeWorkflow(context);

      return {
        type: 'documentation-lookup',
        success: true,
        output: result
      };
    } catch (error) {
      plugin.memoryEngine.log('SKILL_ERROR', 'Skill execution failed: documentation-lookup', {
        error: error.message
      });

      return {
        type: 'documentation-lookup',
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
