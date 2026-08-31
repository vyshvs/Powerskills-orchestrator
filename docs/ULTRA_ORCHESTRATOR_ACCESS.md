# Ultra Orchestrator - Quick Access Guide

## Problem
The ultra-orchestrator skill exists at `.claude/skills/ultra-orchestrator.md` but may not be auto-discovered by Claude.

## Solutions

### Solution 1: Direct Invocation
You can invoke the ultra-orchestrator functionality directly without the skill by asking Claude to:

```
Discover and activate all available skills, plugins, and MCPs in this project using the Memory Orchestrator plugin.
```

### Solution 2: Manual Skill Registration
Restart your Claude session to reload skills from `.claude/skills/`.

### Solution 3: Use the Plugin Directly
Use the Memory Orchestrator plugin directly:

```bash
cd plugins/memory-orchestrator
node cli.js init --platform claude
```

## What Ultra Orchestrator Does

When invoked, it should:

1. **Discover** all tools in the project:
   - Skills in `.claude/skills/`
   - Plugins in `plugins/`
   - MCPs in `.claude/mcp.json`
   - Workflows in `.claude/workflows/`

2. **Report** what was found with counts and names

3. **Activate** relevant tools based on the task

4. **Orchestrate** execution using Memory Orchestrator plugin for:
   - Phase tracking
   - Memory persistence
   - Quality checks with Qodo
   - Comprehensive reporting

5. **Track** all work in `.memory/ultra-orchestrator/`

## Example Usage

Instead of `/ultra-orchestrator`, try:

```
Please act as the ultra-orchestrator:
1. Discover all available skills, plugins, and MCPs
2. Report what you found
3. Activate relevant tools for [your task]
4. Use the Memory Orchestrator plugin to track phases
```

## Why Skills Might Not Load

- Claude caches skill lists at session start
- Skills must be in the active `.claude/skills/` directory
- Skill format must be valid (frontmatter + markdown)
- Some Claude environments have restricted skill directories

## Verification

Check if skill is visible:
```bash
ls -la .claude/skills/ultra-orchestrator.md
```

Check skill content is valid:
```bash
cat .claude/skills/ultra-orchestrator.md | head -20
```

## Alternative: Create a Workflow

Instead of a skill, you could create a workflow at `.claude/workflows/ultra-orchestrator.js` that directly executes the orchestration logic.
