---
name: memory-manager
description: "Manages persistent project memory — project structure tracking and implementation history. Delegates to memory-writer agent (Haiku 4.5)."
---

# Memory Manager Skill

## Purpose

This skill serves as the interface for all memory operations. It delegates actual file operations to the `memory-writer` agent (Claude Haiku 4.5).

## When to Use

- Session start: read existing project memory
- After each implementation phase: record what was done
- Before context window exhaustion: save current state
- Project structure changes: update the topology

## Operations

### Read Memory

Invoked at session start (Gate 0.1 of PowerSkills Orchestrator):

```
Agent(
  agent_type: "memory-writer",
  model: "haiku",
  prompt: "MEMORY_READ_MODE: Search for 'Memory' folder in project root. If found, read 'Project_Structure.md' and 'Memory.md'. Return contents of both. If either is missing, CREATE them first (analyze project structure for Project_Structure.md, create empty Memory.md with header), then return contents."
)
```

### Write Memory

Invoked after successful phase completion:

```
Agent(
  agent_type: "memory-writer",
  model: "haiku",
  prompt: "MEMORY_UPDATE_MODE: Update Memory/Memory.md with this implementation summary: {summary}. Also update Memory/Project_Structure.md with these file changes: {file_changes}."
)
```

### Emergency State Save

Invoked when token budget reaches 95%:

```
Agent(
  agent_type: "memory-writer",
  model: "haiku",
  prompt: "MEMORY_EMERGENCY_SAVE: Save current state to Memory/Memory.md. Record: completed phases: {completed}, remaining phases: {remaining}, blockers: {blockers}, last good state: {state}. Also create Memory/session_handoff.md with resume instructions."
)
```

## Memory File Locations

- `{project_root}/Memory/Project_Structure.md` — complete project topology
- `{project_root}/Memory/Memory.md` — chronological implementation history
- `{project_root}/Memory/session_handoff.md` — created only on emergency saves

## Rules

1. **Always use Haiku 4.5** for memory operations (model: "haiku" in Agent calls)
2. **Non-blocking on failure** — if memory ops fail, continue with degraded mode
3. **Append-only history** — never delete previous Memory.md entries, only append
4. **Single file per project** — one Memory.md, one Project_Structure.md per project root
5. **Automatic creation** — if Memory folder doesn't exist, memory-writer creates it

## Integration with PowerSkills Orchestrator

This skill is automatically invoked by the orchestrator at:
- Gate 0.1 (session start)
- After Gate 6 phase completion
- At 95% token budget threshold

Do not invoke manually unless explicitly needed for debugging or recovery.
