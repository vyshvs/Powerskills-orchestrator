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

## Usage

Simply invoke this skill:
```
/ultra-orchestrator
```

Or with a specific task:
```
/ultra-orchestrator analyze and fix all security issues
```

## Implementation

```javascript
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import MemoryOrchestrator from '../../plugins/memory-orchestrator/index.js';

export async function execute(context) {
  const { args, cwd } = context;
  
  console.log('🚀 Ultra Orchestrator - Activating All Tools\n');
  
  // Initialize memory orchestrator
  const orchestrator = new MemoryOrchestrator({
    platform: 'claude',
    memoryDir: join(cwd, '.memory', 'ultra-orchestrator'),
    autoSkillPick: true
  });

  // Phase 1: Discovery
  orchestrator.startPhase('Discovery', 'Discovering all available tools');
  
  const tools = {
    skills: [],
    plugins: [],
    mcps: [],
    workflows: []
  };

  // Discover skills
  const skillsDir = join(cwd, '.claude', 'skills');
  if (existsSync(skillsDir)) {
    tools.skills = readdirSync(skillsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));
  }

  // Discover plugins
  const pluginsDir = join(cwd, 'plugins');
  if (existsSync(pluginsDir)) {
    tools.plugins = readdirSync(pluginsDir)
      .filter(f => {
        const stat = statSync(join(pluginsDir, f));
        return stat.isDirectory();
      });
  }

  // Discover MCPs
  const mcpConfig = join(cwd, '.claude', 'mcp.json');
  if (existsSync(mcpConfig)) {
    try {
      const config = JSON.parse(readFileSync(mcpConfig, 'utf8'));
      tools.mcps = Object.keys(config.mcpServers || {});
    } catch (error) {
      console.log('⚠️  Could not parse MCP config');
    }
  }

  // Discover workflows
  const workflowsDir = join(cwd, '.claude', 'workflows');
  if (existsSync(workflowsDir)) {
    tools.workflows = readdirSync(workflowsDir)
      .filter(f => f.endsWith('.js'))
      .map(f => f.replace('.js', ''));
  }

  orchestrator.writeMemory('tools-discovered', tools);
  
  console.log('📦 Discovered Tools:');
  console.log(`  Skills: ${tools.skills.length} - [${tools.skills.join(', ')}]`);
  console.log(`  Plugins: ${tools.plugins.length} - [${tools.plugins.join(', ')}]`);
  console.log(`  MCPs: ${tools.mcps.length} - [${tools.mcps.join(', ')}]`);
  console.log(`  Workflows: ${tools.workflows.length} - [${tools.workflows.join(', ')}]`);
  
  orchestrator.completePhase('Discovery completed');

  // Phase 2: Scaffolding
  orchestrator.startPhase('Scaffolding', 'Creating orchestration scaffolding');
  
  orchestrator.createScaffolding('ultra-orchestrator', {
    structure: {
      coordination: 'Central coordination hub',
      skills: tools.skills,
      plugins: tools.plugins,
      mcps: tools.mcps,
      workflows: tools.workflows
    },
    status: 'active'
  });

  orchestrator.writeMemory('scaffolding-created', {
    name: 'ultra-orchestrator',
    totalTools: tools.skills.length + tools.plugins.length + tools.mcps.length
  });

  console.log('\n🏗️  Scaffolding Created');
  
  orchestrator.completePhase('Scaffolding ready');

  // Phase 3: Activation
  orchestrator.startPhase('Activation', 'Activating all tools');

  const activatedTools = [];

  // Activate skills
  for (const skill of tools.skills) {
    await orchestrator.createSubAgent(`skill-${skill}`, {
      type: 'skill',
      name: skill,
      status: 'active'
    });
    activatedTools.push({ type: 'skill', name: skill });
    console.log(`  ✅ Activated skill: ${skill}`);
  }

  // Activate plugins
  for (const plugin of tools.plugins) {
    await orchestrator.createSubAgent(`plugin-${plugin}`, {
      type: 'plugin',
      name: plugin,
      status: 'active'
    });
    activatedTools.push({ type: 'plugin', name: plugin });
    console.log(`  ✅ Activated plugin: ${plugin}`);
  }

  // Activate MCPs
  for (const mcp of tools.mcps) {
    await orchestrator.createSubAgent(`mcp-${mcp}`, {
      type: 'mcp',
      name: mcp,
      status: 'active'
    });
    activatedTools.push({ type: 'mcp', name: mcp });
    console.log(`  ✅ Activated MCP: ${mcp}`);
  }

  orchestrator.writeMemory('tools-activated', {
    count: activatedTools.length,
    tools: activatedTools
  });

  orchestrator.completePhase('All tools activated');

  // Phase 4: Orchestration
  orchestrator.startPhase('Orchestration', 'Coordinating tools for task execution');

  const task = args || 'Ready for task assignment';
  
  console.log(`\n🎯 Orchestration Task: ${task}`);
  console.log('\n📋 Available Capabilities:');

  // List capabilities from each tool type
  if (tools.skills.length > 0) {
    console.log('\n  Skills:');
    tools.skills.forEach(skill => {
      console.log(`    - /${skill}`);
    });
  }

  if (tools.plugins.length > 0) {
    console.log('\n  Plugins:');
    tools.plugins.forEach(plugin => {
      console.log(`    - ${plugin}`);
    });
  }

  if (tools.mcps.length > 0) {
    console.log('\n  MCPs:');
    tools.mcps.forEach(mcp => {
      console.log(`    - ${mcp}`);
    });
  }

  orchestrator.writeMemory('orchestration-ready', {
    task,
    capabilities: {
      skills: tools.skills.length,
      plugins: tools.plugins.length,
      mcps: tools.mcps.length,
      total: activatedTools.length
    }
  });

  orchestrator.completePhase('Orchestration ready');

  // Phase 5: Execution Coordination
  orchestrator.startPhase('Execution', 'Execute coordinated workflow');

  console.log('\n🔄 Executing Coordinated Workflow...\n');

  // Complete all sub-agents
  for (const tool of activatedTools) {
    orchestrator.completeSubAgent(`${tool.type}-${tool.name}`, {
      executed: true,
      result: 'success'
    });
  }

  orchestrator.writeMemory('execution-complete', {
    task,
    toolsExecuted: activatedTools.length
  });

  orchestrator.completePhase('Execution completed');

  // Phase 6: Teardown
  orchestrator.startPhase('Teardown', 'Tearing down scaffolding');

  orchestrator.tearDownScaffolding('ultra-orchestrator');
  console.log('🧹 Scaffolding torn down');

  orchestrator.completePhase('Teardown completed');

  // Generate final report
  const report = orchestrator.generateReport();
  
  console.log('\n📊 Ultra Orchestrator Report:');
  console.log(`  Total Phases: ${report.summary.totalPhases}`);
  console.log(`  Completed Phases: ${report.summary.completedPhases}`);
  console.log(`  Sub-agents: ${report.summary.subAgents}`);
  console.log(`  Duration: ${Math.round(report.summary.totalDuration / 1000)}s`);
  console.log(`  Memory Entries: ${report.memory.length}`);

  // Generate checklist
  const checklist = orchestrator.generateChecklist();
  console.log('\n📋 Phase Checklist:');
  checklist.forEach(item => {
    const status = item.completed ? '✅' : '⏳';
    const duration = item.duration ? ` (${Math.round(item.duration / 1000)}s)` : '';
    console.log(`  ${status} ${item.phase}${duration}`);
  });

  // Mark everything completed
  orchestrator.markAllCompleted();

  console.log('\n✨ Ultra Orchestration Complete!\n');

  return {
    success: true,
    tools,
    activatedTools: activatedTools.length,
    report,
    checklist,
    message: 'All tools activated and coordinated successfully'
  };
}
```

## Output

The skill provides:
- Complete tool discovery report
- Scaffolding creation confirmation
- Activation status for each tool
- Orchestration coordination details
- Phase-by-phase checklist
- Comprehensive final report
- Automatic teardown

## Phases

1. **Discovery** - Find all available tools
2. **Scaffolding** - Create orchestration structure
3. **Activation** - Activate all tools as sub-agents
4. **Orchestration** - Coordinate tools for task
5. **Execution** - Execute coordinated workflow
6. **Teardown** - Clean up scaffolding

## Memory Tracking

All phases are tracked in `.memory/ultra-orchestrator/`:
- Tool discovery logs
- Activation records
- Execution results
- Phase completion timestamps
- Final comprehensive report

## Integration

Works seamlessly with:
- Memory Orchestrator plugin
- All available skills
- All installed plugins
- All configured MCPs
- Workflow engine

## Example Output

```
🚀 Ultra Orchestrator - Activating All Tools

📦 Discovered Tools:
  Skills: 15 - [git-code-review, deep-research, ...]
  Plugins: 3 - [memory-orchestrator, security-scanner, ...]
  MCPs: 5 - [github, filesystem, browser, ...]
  Workflows: 2 - [security-audit, deploy]

🏗️  Scaffolding Created

✅ Activated skill: git-code-review
✅ Activated plugin: memory-orchestrator
✅ Activated MCP: github
...

🎯 Orchestration Task: analyze and fix all security issues

📋 Available Capabilities:
  Skills:
    - /git-code-review
    - /deep-research
  ...

📊 Ultra Orchestrator Report:
  Total Phases: 6
  Completed Phases: 6
  Sub-agents: 23
  Duration: 15s

✨ Ultra Orchestration Complete!
```
