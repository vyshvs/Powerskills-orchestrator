---
name: token-budget-estimator
description: "Use during phased execution to track token consumption per phase and warn before context window exhaustion"
---

# Token Budget Estimator

## Overview

Tracks token consumption across execution phases and provides early warnings before context window exhaustion.

## Estimation Heuristics

```
Token estimates by operation type:
- File read (small, <100 lines):     ~500 tokens
- File read (medium, 100-500 lines): ~2000 tokens
- File read (large, 500+ lines):     ~5000 tokens
- grep_search result:                ~300-1000 tokens
- list_dir result:                   ~200-500 tokens
- Code generation (per file):        ~1000-3000 tokens
- Subagent dispatch + response:      ~2000-5000 tokens
- Memory read/write cycle:           ~1000 tokens
- User interaction round:            ~500 tokens
- Plan generation:                   ~3000-5000 tokens
- Review cycle:                      ~2000-4000 tokens
```

## Phase Budget Calculation

```
Before each phase:
  1. Count planned operations (reads, writes, searches, generations)
  2. Sum estimated tokens using heuristics above
  3. Add 30% buffer for unexpected operations
  4. Compare against remaining context window

  phase_estimate = sum(operation_estimates) * 1.3
  
  IF phase_estimate > remaining_tokens * 0.8:
    WARN — phase may exhaust context
  IF phase_estimate > remaining_tokens:
    BLOCK — must offload to subagent or save state
```

## Warning Protocol

Three escalation levels:

1. **ADVISORY (70% consumed):**
   - Log warning to user
   - Suggest summarization of completed phases
   - Continue execution

2. **URGENT (85% consumed):**
   - Log urgent warning
   - MANDATORY: Offload remaining work to subagents
   - Summarize current state for subagent context
   - Do NOT attempt inline execution of remaining phases

3. **CRITICAL (95% consumed):**
   - Log critical warning
   - IMMEDIATELY save all state to Memory file
   - Update Project_Structure.md
   - Write current progress to task.md
   - Instruct user: "Context window nearly exhausted. All progress saved to Memory/. Please start a new session — Memory Reading will restore context automatically."
   - HALT execution

## Context Preservation on Exhaustion

When CRITICAL threshold reached:
1. Dispatch Memory Writer with current state summary
2. Create/update implementation_plan.md with remaining phases marked as TODO
3. Write a `Memory/session_handoff.md` with:
   - What was completed
   - What remains
   - Current blockers
   - Last known good state
   - Exact command to resume

## Usage

Initialize at Gate 0.3:
```
CONTEXT_WINDOW = 200000  # or model's actual limit
USED_TOKENS = <current usage from system>
REMAINING = CONTEXT_WINDOW - USED_TOKENS

Emit: [TokenBudget] Initialized | Window: {CONTEXT_WINDOW} | Used: {USED_TOKENS} | Available: {REMAINING}
```

Before each phase (Gate 6):
```
phase_estimate = estimate_phase_tokens(phase_operations)
IF phase_estimate > REMAINING * 0.8:
  [TokenBudget] ⚠️ Phase {N} may exceed remaining budget ({phase_estimate} estimated, {REMAINING} available)
```

After each phase:
```
USED_TOKENS += actual_tokens_consumed
REMAINING = CONTEXT_WINDOW - USED_TOKENS

IF REMAINING < CONTEXT_WINDOW * 0.30:  # 70% consumed
  [TokenBudget] ⚠️ 70% context consumed
ELIF REMAINING < CONTEXT_WINDOW * 0.15:  # 85% consumed
  [TokenBudget] 🚨 85% context consumed — offloading to subagents
ELIF REMAINING < CONTEXT_WINDOW * 0.05:  # 95% consumed
  [TokenBudget] 🛑 CRITICAL — saving state and halting
```

## Integration

This skill is automatically used by PowerSkills Orchestrator. Do not invoke manually.
