# Coding Standards for Memory Orchestrator Plugin

## Overview
This document defines coding standards to prevent security vulnerabilities and maintain code quality based on CodeQL security scanning results.

## Security Standards

### 1. File System Operations

#### ❌ AVOID: Race Conditions (TOCTOU)
```javascript
// BAD: Check-then-act pattern
if (fs.existsSync(file)) {
  fs.writeFileSync(file, data);
}
```

#### ✅ USE: Atomic Operations
```javascript
// GOOD: Atomic file operations
try {
  await fs.writeFile(file, data, { flag: 'wx' }); // Fails if exists
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}

// GOOD: Temp file + rename (atomic on most systems)
const tempFile = `${file}.tmp`;
await fs.writeFile(tempFile, data);
await fs.rename(tempFile, file);
```

### 2. Regular Expressions

#### ❌ AVOID: Polynomial Regex (ReDoS)
```javascript
// BAD: Nested quantifiers
const regex = /^(a+)+$/;
const regex2 = /(\w+)*\s*$/;
```

#### ✅ USE: Linear-time Regex
```javascript
// GOOD: Atomic groups or possessive quantifiers
const regex = /^a+$/;
const regex2 = /\w*\s*$/;

// GOOD: Explicit limits
const regex3 = /^(\w{1,100})\s*$/;
```

### 3. Command Execution

#### ❌ AVOID: Shell Injection
```javascript
// BAD: Shell interpretation enabled
execSync(`npm install ${userInput}`);
spawn(command, args, { shell: true });
```

#### ✅ USE: Safe Execution
```javascript
// GOOD: Array arguments, no shell
import { spawn } from 'child_process';

const proc = spawn('npm', ['install', userInput], {
  shell: false,
  stdio: 'inherit'
});

// GOOD: Input validation
function validatePackageName(name) {
  if (!/^[@a-z0-9][a-z0-9-_./@]*$/i.test(name)) {
    throw new Error('Invalid package name');
  }
  return name;
}
```

### 4. Input Validation

#### ❌ AVOID: Trusting User Input
```javascript
// BAD: No validation
function createFile(filename) {
  fs.writeFileSync(filename, data);
}
```

#### ✅ USE: Strict Validation
```javascript
// GOOD: Whitelist validation
function validateFilename(filename) {
  // Only alphanumeric, dash, underscore, dot
  if (!/^[a-z0-9._-]+$/i.test(filename)) {
    throw new Error('Invalid filename');
  }
  
  // Prevent path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Path traversal not allowed');
  }
  
  return filename;
}
```

### 5. Asynchronous Operations

#### ❌ AVOID: Blocking Operations
```javascript
// BAD: Blocks event loop
const data = fs.readFileSync(file);
fs.writeFileSync(output, data);
```

#### ✅ USE: Async/Await
```javascript
// GOOD: Non-blocking
import { promises as fs } from 'fs';

const data = await fs.readFile(file, 'utf8');
await fs.writeFile(output, data, 'utf8');
```

## Code Quality Standards

### 1. Error Handling

```javascript
// Create custom error classes
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
  }
}

// Use try-catch with specific error handling
async function processFile(path) {
  try {
    await fs.access(path, fs.constants.R_OK);
    return await fs.readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new ValidationError(`File not found: ${path}`);
    }
    throw new FileSystemError(`Failed to read file: ${error.message}`, error);
  }
}
```

### 2. Input Sanitization

```javascript
// Sanitize user input
function sanitizeInput(input, maxLength = 100) {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }
  
  // Trim and limit length
  const sanitized = input.trim().slice(0, maxLength);
  
  // Remove dangerous characters
  return sanitized.replace(/[<>\"'`]/g, '');
}
```

### 3. Type Checking

```javascript
// Validate types and structure
function validateConfig(config) {
  if (typeof config !== 'object' || config === null) {
    throw new ValidationError('Config must be an object');
  }
  
  if (config.platform && typeof config.platform !== 'string') {
    throw new ValidationError('Platform must be a string');
  }
  
  const validPlatforms = ['claude', 'openai', 'antigravity'];
  if (config.platform && !validPlatforms.includes(config.platform)) {
    throw new ValidationError(`Invalid platform: ${config.platform}`);
  }
}
```

### 4. Resource Management

```javascript
// Use proper cleanup
async function processLargeFile(path) {
  const stream = fs.createReadStream(path);
  
  try {
    // Process stream
    for await (const chunk of stream) {
      await processChunk(chunk);
    }
  } finally {
    // Always close stream
    stream.destroy();
  }
}
```

## Testing Standards

### 1. Unit Tests

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

describe('Feature Name', () => {
  before(async () => {
    // Setup
  });
  
  after(async () => {
    // Cleanup
  });
  
  it('should handle valid input', async () => {
    const result = await myFunction('valid');
    assert.strictEqual(result, expected);
  });
  
  it('should reject invalid input', async () => {
    await assert.rejects(
      async () => await myFunction('invalid'),
      { name: 'ValidationError' }
    );
  });
});
```

### 2. Security Tests

```javascript
describe('Security', () => {
  it('should prevent path traversal', async () => {
    await assert.rejects(
      async () => await readFile('../../../etc/passwd'),
      { code: 'VALIDATION_ERROR' }
    );
  });
  
  it('should prevent command injection', async () => {
    await assert.rejects(
      async () => await runCommand('npm install; rm -rf /'),
      { code: 'VALIDATION_ERROR' }
    );
  });
  
  it('should handle ReDoS patterns', () => {
    const start = Date.now();
    const result = regex.test('a'.repeat(1000));
    const duration = Date.now() - start;
    assert.ok(duration < 100, 'Regex should complete quickly');
  });
});
```

## Documentation Standards

### 1. JSDoc Comments

```javascript
/**
 * Process user input with validation
 * @param {string} input - User provided input
 * @param {object} options - Processing options
 * @param {number} options.maxLength - Maximum length
 * @param {boolean} options.strict - Enable strict mode
 * @returns {Promise<string>} Processed and sanitized input
 * @throws {ValidationError} When input is invalid
 * @throws {ProcessingError} When processing fails
 */
async function processInput(input, options = {}) {
  // Implementation
}
```

### 2. Security Notes

```javascript
/**
 * Execute external command
 * 
 * SECURITY: This function validates input to prevent command injection.
 * Only alphanumeric, dash, underscore, and dot characters are allowed.
 * Shell interpretation is explicitly disabled.
 * 
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
async function safeExec(command, args) {
  // Implementation
}
```

## Code Review Checklist

### Before Committing

- [ ] All inputs are validated
- [ ] No shell=true in spawn/exec calls
- [ ] No synchronous file operations in async code
- [ ] No TOCTOU race conditions (check-then-act)
- [ ] Regex patterns are tested for ReDoS
- [ ] Error handling is comprehensive
- [ ] Resources are properly cleaned up
- [ ] Tests cover security scenarios
- [ ] Documentation includes security notes
- [ ] No hardcoded secrets or credentials

### Regular Expression Audit

```bash
# Find potentially vulnerable regex patterns
grep -r "(\w\+)\+" .
grep -r "(\.*)\*" .
grep -r "(\w{1,}\+)" .
```

### File Operation Audit

```bash
# Find TOCTOU patterns
grep -r "existsSync.*writeFile" .
grep -r "existsSync.*mkdirSync" .

# Find sync operations
grep -r "Sync(" .
```

### Command Execution Audit

```bash
# Find shell execution
grep -r "shell.*true" .
grep -r "execSync" .
grep -r "exec(" .
```

## Automated Tools

### ESLint Configuration

```json
{
  "rules": {
    "no-sync": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "security/detect-non-literal-regexp": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-child-process": "error"
  }
}
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run security checks
npm run lint
npm run test
npm run security-check

# Check for secrets
git diff --cached --name-only | xargs grep -l "password\|secret\|key" && exit 1

exit 0
```

## Incident Response

### If Security Issue Found

1. **Assess Impact**: Determine severity and affected versions
2. **Create Fix**: Implement secure alternative
3. **Test Thoroughly**: Add security tests
4. **Document**: Update SECURITY.md
5. **Release**: Create security advisory if needed
6. **Notify**: Inform users if data exposure risk

## References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE Top 25: https://cwe.mitre.org/top25/
- Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security/
- CodeQL Documentation: https://codeql.github.com/docs/

## Version History

- v1.0.0 (2026-09-01): Initial coding standards
- Addresses: ReDoS, Command Injection, TOCTOU, Input Validation
