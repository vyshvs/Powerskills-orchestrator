---
name: ultra-orchestrator
description: Activate and orchestrate all available skills, plugins, and MCPs with comprehensive scaffolding
tags: [orchestration, automation, meta, ultra]
---

# Ultra Orchestrator

Automatically discovers, activates, and orchestrates all available skills, plugins, and MCPs in the project with full scaffolding management and memory tracking.

## What This Does

This skill acts as a meta-orchestrator that:
1. Discovers all available skills, plugins, and MCPs
2. Creates comprehensive scaffolding for the task
3. Activates and coordinates all tools automatically
4. Tracks progress with phase-based memory
5. Tears down scaffolding when complete

## When to Use

- Complex multi-tool workflows requiring coordination
- Tasks that benefit from multiple skills/plugins working together
- Large-scale operations needing comprehensive orchestration
- When you want maximum capability activation

## Instructions

When this skill is invoked:

1. **Discovery Phase**: Scan the project for available tools
   - Check `.claude/skills/` for skill files (*.md)
   - Check `plugins/` for plugin directories
   - Check `.claude/mcp.json` for MCP configurations
   - Check `.claude/workflows/` for workflow files

2. **Report Available Tools**: List all discovered capabilities
   ```
   📦 Discovered Tools:
     Skills: X - [skill1, skill2, ...]
     Plugins: Y - [plugin1, plugin2, ...]
     MCPs: Z - [mcp1, mcp2, ...]
   ```

3. **Activate Based on Task**: Use the Memory Orchestrator plugin to:
   - Create orchestration scaffolding
   - Track phases with memory persistence
   - Coordinate multiple tools for the task
   - Generate comprehensive reports

4. **Execute Workflow**:
   - Phase 1: Discovery - Find all tools
   - Phase 2: Scaffolding - Create structure
   - Phase 3: Activation - Enable relevant tools
   - Phase 4: Orchestration - Coordinate execution
   - Phase 5: Execution - Run coordinated workflow
   - Phase 6: Teardown - Clean up scaffolding

5. **Track and Report**: Use memory tracking to maintain state across phases

## Integration

This skill integrates with:
- **Memory Orchestrator Plugin** (`plugins/memory-orchestrator/`) for state management
- All available skills in `.claude/skills/`
- All installed plugins in `plugins/`
- All configured MCPs in `.claude/mcp.json`

## Example Usage

```
User: /ultra-orchestrator analyze and fix all security issues

Response:
🚀 Ultra Orchestrator - Activating All Tools

📦 Discovered Tools:
  Skills: 15
  Plugins: 3  
  MCPs: 5

🏗️  Scaffolding Created

✅ Activating relevant tools for security analysis:
  - git-code-review skill
  - security-scanner plugin
  - github MCP

🎯 Orchestrating security workflow...
[Executes coordinated security audit using all available tools]

✅ All tasks completed with full audit trail
```

## Output

- Comprehensive tool discovery report
- Activation status for each relevant tool
- Phase-by-phase execution log
- Memory-tracked state in `.memory/ultra-orchestrator/`
- Final summary with results from all tools

## Best Practices

- Use for complex tasks requiring multiple capabilities
- Review discovered tools before proceeding
- Check memory logs in `.memory/ultra-orchestrator/` for audit trail
- All phases tracked with timestamps and results
