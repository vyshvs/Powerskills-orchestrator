# PowerSkills Orchestrator

A master orchestration plugin for Claude Code that provides structured, expert-level implementation with persistent memory, adaptive model selection, and automatic verification.

## Features

### 🎯 7-Gate Implementation Protocol
- **Gate 0**: Pre-processing (Memory, SkillSync, Token Budget, Deduplication)
- **Gate 1**: Skill Router with Adaptive Model Selection
- **Gate 2**: Pre-Task Alignment with Expert Role Declaration
- **Gate 3**: Implementation Planning (MVP, Change Surface, Edge Cases)
- **Gate 4**: Subagent Dispatch with Model Matching
- **Gate 5**: Step-Phased Execution Plan (requires user approval)
- **Gate 6**: Execution with Auto-Troubleshooting
- **Gate 7**: Final Verification with Evidence

### 💾 Persistent Memory System
- **Project Structure Tracking**: Maintains `Memory/Project_Structure.md` with complete project topology
- **Implementation History**: Records successful implementations in `Memory/Memory.md`
- **Session Continuity**: Automatically restores context across sessions
- **Emergency State Save**: Preserves progress when approaching token limits

### 🧠 Adaptive Model Selection
Automatically matches model capability to task complexity:
- **Haiku 4.5** (`flash_lite`): Memory operations only (non-negotiable)
- **Flash**: Simple lookups, single-file implementations
- **Inherit**: Multi-file implementations, cross-component changes
- **Pro**: Architecture decisions, complex debugging, design reviews

### 📊 Token Budget Management
- Phase-level estimation with 30% safety buffer
- Warning thresholds: 70% (advisory), 85% (urgent), 95% (critical)
- Automatic offloading to subagents when budget runs low
- Emergency state preservation on exhaustion

### ✅ Output Verification Loop
Never claims success without proof:
1. **Run** the output (execute, build, render)
2. **Analyze** logs completely (exit codes, errors, warnings)
3. **Fix** issues with targeted changes
4. **Rerun** until working or 3 attempts exhausted
5. **Report** with evidence (command, output, exit code)

### 🔄 Deduplication Registry
- Prevents redundant skill invocations
- Tracks active and completed skills
- Reuses results when possible
- Avoids conflicts between overlapping skills

### 👨‍💻 Expert Role Declaration
Declares world-class expertise for each task type:
- **Engineering**: Staff Software Engineer, PhD in Distributed Systems
- **Architecture**: Principal Architect, PhD in LLM Infrastructure
- **Frontend**: Principal UI Engineer, PhD in Design Systems
- **Research**: Research Scientist, PhD in Knowledge Synthesis
- And more specialized roles for documents, presentations, spreadsheets, etc.

## Installation

### Prerequisites
- [Claude Code](https://claude.ai/code) installed
- Git (for cloning the repository)

### Method 1: Clone to Plugins Directory

```bash
cd ~/.claude/plugins
git clone https://github.com/vyshvs/Powerskills-orchestrator.git PowerSkills
```

### Method 2: Manual Installation

1. Download or clone this repository
2. Copy the `PowerSkills` folder to `~/.claude/plugins/`
3. Ensure the directory structure is:
   ```
   ~/.claude/plugins/PowerSkills/
   ├── plugin.json
   ├── skills/
   │   ├── powerskills-orchestrator/
   │   ├── memory-manager/
   │   ├── token-budget-estimator/
   │   └── output-verifier/
   └── agents/
       └── memory-writer.md
   ```

### Enable the Plugin

Add to your `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "PowerSkills": true
  }
}
```

Or use Claude Code's plugin manager to enable it.

### Restart Claude Code

Close and reopen Claude Code to load the plugin.

## Usage

### Invoke the Orchestrator

For any non-trivial task (more than 3 steps or involving files/code):

```
/powerskills-orchestrator
```

The orchestrator automatically activates for:
- Coding and implementation tasks
- Architecture and design decisions
- Document, presentation, or spreadsheet creation
- Research and analysis
- Frontend development
- Debugging and troubleshooting

### Individual Skills

You can also invoke sub-skills directly:

```bash
/memory-manager          # Read/write project memory
/token-budget-estimator  # Check token usage
/output-verifier         # Verify and troubleshoot outputs
```

### Automatic Memory Management

The plugin automatically:
- Reads memory at session start (Gate 0.1)
- Updates memory after each phase completion
- Creates `Memory/` folder if it doesn't exist
- Maintains project structure and implementation history

## Project Memory Files

The plugin creates and maintains these files in your project root:

```
Memory/
├── Project_Structure.md    # Complete project topology
├── Memory.md               # Chronological implementation history
└── session_handoff.md      # Created on emergency saves only
```

These files enable:
- Context continuity across sessions
- No re-explaining of project structure
- Historical record of implementation decisions
- Recovery from interrupted sessions

## Architecture

### Plugin Structure

```
PowerSkills/
├── plugin.json                              # Plugin manifest
├── skills/
│   ├── powerskills-orchestrator/
│   │   └── SKILL.md                        # Main orchestration logic
│   ├── memory-manager/
│   │   └── SKILL.md                        # Memory operations interface
│   ├── token-budget-estimator/
│   │   └── SKILL.md                        # Context window tracking
│   └── output-verifier/
│       └── SKILL.md                        # Verification loop logic
└── agents/
    └── memory-writer.md                    # Haiku 4.5 memory agent
```

### Workflow

1. **Pre-Processing** (Gate 0): Load memory, initialize budgets, check for skill duplicates
2. **Routing** (Gate 1): Detect task type, select appropriate model tier and skills
3. **Alignment** (Gate 2): Declare expert role, restate goal, surface unknowns
4. **Planning** (Gate 3): Create detailed implementation plan with edge cases
5. **Dispatch** (Gate 4): Spawn subagents with appropriate model tiers
6. **Plan Approval** (Gate 5): Present complete plan and wait for user confirmation
7. **Execution** (Gate 6): Execute phases with verification and auto-troubleshooting
8. **Final Verification** (Gate 7): Run all outputs, verify results, update memory

## Configuration

### Model Selection Override

The plugin automatically selects models based on task complexity. To override for specific phases, edit the model tier in `skills/powerskills-orchestrator/SKILL.md`.

### Token Budget Thresholds

Default thresholds (in `skills/token-budget-estimator/SKILL.md`):
- **70%**: Advisory warning
- **85%**: Mandatory subagent offloading
- **95%**: Emergency save and halt

### Memory Agent Model

The memory agent **must** use Haiku 4.5 (`flash_lite`). This is non-negotiable and enforced throughout the plugin.

## Operational Boundaries

The plugin follows strict discipline:
- ❌ Never runs linters unless explicitly asked
- ❌ Never writes unit tests unless explicitly asked
- ❌ Never refactors code outside scope
- ❌ Never uses non-Haiku models for memory operations
- ❌ Never skips memory reading at session start
- ❌ Never claims output works without running it
- ❌ Never proceeds past Gate 5 without user approval

## Troubleshooting

### Plugin Not Loading

1. Check plugin is in correct directory: `~/.claude/plugins/PowerSkills/`
2. Verify `plugin.json` is valid JSON
3. Confirm plugin is enabled in `~/.claude/settings.json`
4. Restart Claude Code

### Memory Files Not Created

1. Check project root is accessible
2. Verify write permissions on project directory
3. Check memory-writer agent logs for errors
4. Manually create `Memory/` folder if needed

### Token Budget Warnings

1. Offload remaining work to subagents (recommended)
2. Summarize completed phases to free context
3. Save state to Memory and continue in new session

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Credits

Created by [vyshvs](https://github.com/vyshvs)

Built with Claude Opus 5

## Support

- **Issues**: [GitHub Issues](https://github.com/vyshvs/Powerskills-orchestrator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/vyshvs/Powerskills-orchestrator/discussions)
