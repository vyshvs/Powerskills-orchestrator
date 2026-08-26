---
name: output-verifier
description: "Use after any code execution, build, or output generation to analyze logs, detect failures, troubleshoot, and rerun until working"
---

# Output Verifier — Run, Analyze, Fix, Rerun

## Overview

Core principle: NEVER claim an output works without running it and verifying the result.

## The Verification Loop

```
FOR each finished output:
  1. RUN the output (execute command, render file, build project)
  2. CAPTURE full stdout, stderr, exit code
  3. ANALYZE:
     - Exit code == 0? 
     - Any ERROR, WARN, FAIL, Exception in output?
     - Output matches expected behavior?
  4. IF PASS → record success, move on
  5. IF FAIL → enter Troubleshoot Cycle
```

## Troubleshoot Cycle

```
attempt = 0
MAX_ATTEMPTS = 3

WHILE output fails AND attempt < MAX_ATTEMPTS:
  attempt += 1
  
  1. PARSE error completely — read every line
  2. IDENTIFY root cause:
     - Syntax error? → fix exact line
     - Missing dependency? → install it
     - Wrong path? → correct it  
     - Logic error? → trace data flow
     - Permission error? → fix permissions
     - Port conflict? → change port
  3. APPLY targeted fix (smallest possible change)
  4. RERUN output
  5. ANALYZE result again
  
IF attempt >= MAX_ATTEMPTS:
  STOP. Present to user:
  - What was tried (all 3 attempts)
  - What failed each time
  - Current error state
  - Recommended next steps
```

## Log Analysis Protocol

When reading output logs:
1. Read ENTIRE output — do not skim
2. Check exit code FIRST
3. Search for these patterns (case-insensitive):
   - `error`, `Error`, `ERROR`
   - `fail`, `Fail`, `FAIL`  
   - `exception`, `Exception`, `EXCEPTION`
   - `warn`, `Warn`, `WARN`
   - `denied`, `refused`, `timeout`
   - `not found`, `missing`, `undefined`
   - Stack traces (multi-line indented blocks)
4. For EACH found issue:
   - Extract the full error message
   - Note the file and line number
   - Identify the error category
5. Prioritize: errors > failures > warnings
6. Address errors in dependency order (fix upstream first)

## Final Output Guarantee

Before declaring ANY output as "working":
1. It MUST have been executed in this session
2. Its output MUST have been read completely
3. Exit code MUST be 0 (or expected non-zero)
4. No unaddressed errors in output
5. Behavior matches acceptance criteria

NEVER say "should work", "probably works", "looks correct".
ONLY say "works" with evidence: the command, the output, the exit code.

## Integration Points

This skill is automatically invoked by PowerSkills Orchestrator at:
- After each phase execution (Gate 6, step 4-6)
- During final verification (Gate 7, step 2-4)

Manual invocation is appropriate when:
- Testing a fix outside the orchestrator flow
- Verifying legacy code behavior
- Troubleshooting build issues

## Example Usage

```
# After generating a script:
1. Run: bash script.sh
2. Capture output
3. Analyze for errors
4. If errors found:
   - Parse error message
   - Identify root cause
   - Fix the issue
   - Rerun script.sh
   - Verify success
5. Report: "script.sh executed successfully (exit 0, no errors)"

# NOT acceptable:
"The script looks correct and should work."
```

## Error Pattern Recognition

Common patterns and their fixes:

| Pattern | Likely Cause | Typical Fix |
|---------|--------------|-------------|
| `command not found` | Missing dependency | Install package |
| `No such file or directory` | Wrong path | Correct path or create file |
| `Permission denied` | Insufficient permissions | chmod +x or run as admin |
| `Port already in use` | Port conflict | Change port or kill process |
| `Cannot find module` | Missing npm/pip package | Install dependency |
| `Syntax error` | Code typo | Fix syntax at line number |
| `Undefined variable` | Variable not initialized | Add initialization |
| `Connection refused` | Service not running | Start service |

## Automatic Escalation

If 3 consecutive attempts fail with the same error:
1. Do NOT attempt a 4th fix
2. Compile failure report:
   - Original error
   - All attempted fixes
   - Current state
   - Suspected root cause
3. Present to user with: "Unable to resolve after 3 attempts. Recommend: {suggestion}"
