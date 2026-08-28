# PowerSkills Memory Orchestrator - Standalone Configuration

## Important Notice

**This plugin is completely standalone and does not share any content, configuration, or dependencies with external repositories.**

All reference materials in the `Ref/` folder are for documentation purposes only and are NOT used by the plugin code.

## Plugin Isolation Principles

### 1. No Shared Dependencies
- Zero npm dependencies
- All functionality implemented internally
- No external package requirements

### 2. No Shared Configuration
- Independent configuration system
- No reliance on external config files
- Self-contained settings management

### 3. No Shared Content
- All code is original and standalone
- Reference materials are isolated in `Ref/` folder
- No imports from external sources

### 4. No Shared State
- Each session has unique isolated state
- No global state pollution
- Clean session boundaries

## Reference Folder (`Ref/`)

The `Ref/` folder contains reference materials from other projects for inspiration and documentation purposes ONLY:

```
Ref/
├── .agents/          # Reference: Agent patterns (NOT USED)
├── .github/          # Reference: GitHub workflows (NOT USED)
├── .kiro/            # Reference: Kiro configs (NOT USED)
└── ...               # Other reference materials (NOT USED)
```

**Important**: 
- None of these files are imported or executed by the plugin
- They serve as documentation and examples only
- The plugin is 100% self-contained and independent
- You can safely delete the `Ref/` folder without affecting plugin functionality

## Plugin Structure (Standalone)

```
Powerskills-orchestrator/
├── core/                          # Core plugin modules
│   ├── memory-engine.js           # Memory management (standalone)
│   ├── platform-adapter.js        # Platform integration (standalone)
│   └── sub-agent-orchestrator.js  # Agent orchestration (standalone)
├── examples/                      # Usage examples
│   ├── basic-usage.js
│   └── demo.js
├── test/                          # Test suite
│   └── test-suite.js
├── index.js                       # Main entry point
├── package.json                   # Package config (zero dependencies)
├── plugin-manifest.json           # Plugin manifest
├── README.md                      # Documentation
├── ARCHITECTURE.md                # Architecture guide
└── Ref/                           # Reference only (can be deleted)
```

## Usage Without External Dependencies

```javascript
// No require() statements from external packages
// All functionality is self-contained

const PowerSkillsPlugin = require('powerskills-memory-orchestrator');

// Initialize with configuration
const plugin = new PowerSkillsPlugin({
  // Your configuration here
});

// Use the plugin
const api = plugin.getAPI();
```

## Platform Compatibility

The plugin works with multiple AI platforms but does NOT depend on their SDKs:

- **OpenAI**: Uses standard HTTP API (no openai package)
- **Claude**: Uses standard HTTP API (no @anthropic-ai/sdk package)
- **Antigravity**: Uses standard HTTP API (no antigravity package)

All API calls are made using native Node.js capabilities (or fetch in browser environments).

## Data Isolation

### Session Isolation
Each session is completely isolated:
- Unique session ID
- Independent memory store
- Separate agent instances
- Isolated execution context

### Platform Isolation
Platform credentials and configurations are isolated:
- Separate API keys per platform
- Independent rate limiting
- No credential sharing
- No cross-platform data leakage

### Memory Isolation
Memory operations are scoped:
- Session-specific storage
- No global memory space
- Clean separation between sessions
- Optional encryption per session

## Security Considerations

### No External Code Execution
- No dynamic imports from URLs
- No eval() or Function() constructor usage
- All code is statically included

### No Telemetry or Phone Home
- No data sent to external servers
- No analytics or tracking
- No automatic updates
- Completely offline-capable (except platform API calls)

### No Shared Secrets
- API keys stored per-session
- No global credential store
- No credential caching across sessions

## Verification

To verify the plugin is standalone:

1. **Check Dependencies**:
```bash
cat package.json | grep dependencies
# Should show: "dependencies": {}
```

2. **Check Imports**:
```bash
grep -r "require\|import" core/ index.js
# Should only show internal requires (./core/...)
```

3. **Check External Calls**:
```bash
grep -r "http\|fetch\|axios" core/ index.js
# Only platform API calls, no external packages
```

## Maintenance

### Adding New Features
- Keep all code self-contained
- No external dependencies
- Maintain isolation principles

### Updating Reference Materials
- Reference materials in `Ref/` can be updated
- They do NOT affect plugin functionality
- They serve as documentation only

### Testing Isolation
Run the test suite to verify isolation:
```bash
npm test
```

Tests verify:
- No external dependencies loaded
- All operations work standalone
- Proper session isolation
- Platform independence

## FAQ

**Q: Can I use this plugin without the Ref/ folder?**
A: Yes! The `Ref/` folder can be completely deleted without affecting the plugin.

**Q: Does this plugin share data with other services?**
A: No. It only makes API calls to the configured AI platforms (OpenAI, Claude, Antigravity).

**Q: Can I use this plugin offline?**
A: Yes, for all operations except platform API calls. Memory and agent orchestration work completely offline.

**Q: Are there any hidden dependencies?**
A: No. Check `package.json` - dependencies object is empty.

**Q: Does this plugin modify global state?**
A: No. All state is contained within the plugin instance and session.

**Q: Can I run multiple instances simultaneously?**
A: Yes! Each instance is completely isolated from others.

## License

MIT License - See LICENSE file for full text.

This plugin is provided as-is, with complete source code, no hidden dependencies, and full transparency.
