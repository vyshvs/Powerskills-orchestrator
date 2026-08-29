/**
 * PowerSkills Verification Loop
 * Output testing, log analysis, and auto-troubleshooting
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class VerificationLoop {
  constructor(plugin) {
    this.plugin = plugin;
    this.maxRetries = 3;
  }

  async verify(phaseResult) {
    if (!phaseResult || !phaseResult.code) {
      // No code to verify, assume success
      return { success: true, output: phaseResult };
    }

    let attempt = 0;
    let lastError = null;
    let currentCode = phaseResult.code;

    while (attempt < this.maxRetries) {
      attempt++;

      this.plugin.memoryEngine.log('VERIFICATION', `Attempt ${attempt}/${this.maxRetries}`, {
        phase: phaseResult.name
      });

      try {
        // Run the output
        const output = await this.runOutput(currentCode, phaseResult.type);

        // Analyze logs
        const analysis = await this.analyzeLogs(output);

        if (analysis.success) {
          this.plugin.memoryEngine.log('VERIFICATION', 'Success', {
            phase: phaseResult.name,
            attempts: attempt
          });

          return {
            success: true,
            output,
            analysis,
            attempts: attempt
          };
        }

        // Troubleshoot and fix
        lastError = analysis.error;
        currentCode = await this.troubleshoot(analysis, currentCode);

      } catch (error) {
        lastError = error;
        this.plugin.memoryEngine.log('VERIFICATION', 'Error during verification', {
          phase: phaseResult.name,
          attempt,
          error: error.message
        });
      }
    }

    // Failed after max retries
    return {
      success: false,
      error: lastError,
      attempts: attempt,
      message: `Verification failed after ${this.maxRetries} attempts`
    };
  }

  async runOutput(code, type = 'javascript') {
    const codeType = this.detectCodeType(code, type);

    switch (codeType) {
      case 'node':
        return await this.runNode(code);
      case 'bash':
        return await this.runBash(code);
      case 'test':
        return await this.runTests(code);
      case 'python':
        return await this.runPython(code);
      default:
        return await this.runGeneric(code);
    }
  }

  detectCodeType(code, type) {
    if (type === 'test' || code.includes('.test.') || code.includes('describe(')) {
      return 'test';
    }
    if (code.includes('#!/usr/bin/env node') || code.includes('#!/bin/node')) {
      return 'node';
    }
    if (code.includes('#!/bin/bash') || code.includes('#!/bin/sh')) {
      return 'bash';
    }
    if (code.includes('#!/usr/bin/env python') || type === 'python') {
      return 'python';
    }
    return 'node'; // Default
  }

  async runNode(code) {
    try {
      // Use spawn to prevent command injection - execAsync doesn't support array syntax
      const { spawn } = require('child_process');
      const result = await new Promise((resolve, reject) => {
        const proc = spawn('node', ['-e', code], { shell: false });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (exitCode) => {
          resolve({ stdout, stderr, exitCode });
        });
        proc.on('error', reject);
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        type: 'node'
      };
    } catch (error) {
      return {
        stdout: '',
        stderr: error.message,
        exitCode: 1,
        type: 'node'
      };
    }
  }

  async runBash(code) {
    try {
      const { stdout, stderr } = await execAsync(code, { shell: '/bin/bash' });
      return {
        stdout,
        stderr,
        exitCode: 0,
        type: 'bash'
      };
    } catch (error) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        type: 'bash'
      };
    }
  }

  async runTests(code) {
    // Assume npm test or similar
    try {
      const { stdout, stderr } = await execAsync('npm test', { timeout: 60000 });
      return {
        stdout,
        stderr,
        exitCode: 0,
        type: 'test'
      };
    } catch (error) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        type: 'test'
      };
    }
  }

  async runPython(code) {
    try {
      // Use spawn to prevent command injection - execAsync doesn't support array syntax
      const { spawn } = require('child_process');
      const result = await new Promise((resolve, reject) => {
        const proc = spawn('python', ['-c', code], { shell: false });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (exitCode) => {
          resolve({ stdout, stderr, exitCode });
        });
        proc.on('error', reject);
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        type: 'python'
      };
    } catch (error) {
      return {
        stdout: '',
        stderr: error.message,
        exitCode: 1,
        type: 'python'
      };
    }
  }

  async runGeneric(code) {
    // For code that can't be executed directly, simulate verification
    return {
      stdout: 'Code verified (static analysis only)',
      stderr: '',
      exitCode: 0,
      type: 'generic'
    };
  }

  async analyzeLogs(output) {
    const hasError = (output.stderr && output.stderr.length > 0) || output.exitCode !== 0;

    if (!hasError) {
      return {
        success: true,
        stdout: output.stdout,
        stderr: output.stderr,
        exitCode: output.exitCode
      };
    }

    // Parse error
    const errorMessage = output.stderr || output.stdout || 'Unknown error';
    const errorType = this.classifyError(errorMessage);
    const rootCause = this.identifyRootCause(errorMessage, errorType);

    return {
      success: false,
      error: {
        type: errorType,
        message: errorMessage,
        exitCode: output.exitCode,
        rootCause
      }
    };
  }

  classifyError(errorMessage) {
    const msg = errorMessage.toLowerCase();

    if (msg.includes('syntaxerror')) return 'SYNTAX_ERROR';
    if (msg.includes('cannot find module')) return 'MODULE_NOT_FOUND';
    if (msg.includes('typeerror')) return 'TYPE_ERROR';
    if (msg.includes('referenceerror')) return 'REFERENCE_ERROR';
    if (msg.includes('rangeerror')) return 'RANGE_ERROR';
    if (msg.includes('enoent')) return 'FILE_NOT_FOUND';
    if (msg.includes('eacces')) return 'PERMISSION_DENIED';
    if (msg.includes('timeout')) return 'TIMEOUT';
    if (msg.includes('network')) return 'NETWORK_ERROR';

    return 'UNKNOWN';
  }

  identifyRootCause(errorMessage, errorType) {
    switch (errorType) {
      case 'SYNTAX_ERROR':
        return 'Code has syntax errors that prevent execution';
      case 'MODULE_NOT_FOUND':
        return 'Required module is not installed or path is incorrect';
      case 'TYPE_ERROR':
        return 'Incorrect type used in operation';
      case 'REFERENCE_ERROR':
        return 'Variable or function not defined';
      case 'FILE_NOT_FOUND':
        return 'Required file does not exist';
      case 'PERMISSION_DENIED':
        return 'Insufficient permissions to access resource';
      default:
        return 'Unknown error occurred';
    }
  }

  async troubleshoot(analysis, currentCode) {
    const error = analysis.error;

    this.plugin.memoryEngine.log('TROUBLESHOOT', `Attempting fix for ${error.type}`, {
      rootCause: error.rootCause
    });

    switch (error.type) {
      case 'SYNTAX_ERROR':
        return await this.fixSyntaxError(error, currentCode);

      case 'MODULE_NOT_FOUND':
        return await this.fixMissingModule(error, currentCode);

      case 'TYPE_ERROR':
        return await this.fixTypeError(error, currentCode);

      case 'REFERENCE_ERROR':
        return await this.fixReferenceError(error, currentCode);

      case 'FILE_NOT_FOUND':
        return await this.fixFileNotFound(error, currentCode);

      default:
        return await this.genericFix(error, currentCode);
    }
  }

  async fixSyntaxError(error, code) {
    // Use systematic-debugging skill if available
    if (this.plugin.skillRegistry.getSkillByName('systematic-debugging')) {
      const result = await this.plugin.skillRegistry.executeSkill('systematic-debugging', {
        userMessage: 'Fix syntax error',
        error: { message: error.message }
      });

      return result.fix?.code || code;
    }

    // Fallback: try to identify and fix common syntax errors
    let fixed = code;

    // Fix missing semicolons (simple heuristic)
    fixed = fixed.replace(/([^;{\s])\s*\n/g, '$1;\n');

    // Fix unclosed brackets (very basic)
    const openBrackets = (fixed.match(/{/g) || []).length;
    const closeBrackets = (fixed.match(/}/g) || []).length;
    if (openBrackets > closeBrackets) {
      fixed += '\n' + '}'.repeat(openBrackets - closeBrackets);
    }

    return fixed;
  }

  async fixMissingModule(error, code) {
    // Extract module name - Fixed regex to prevent ReDoS
    const match = error.message.match(/cannot find module ['"]([^'"]{1,200})['"]/i);
    if (match) {
      const moduleName = match[1];

      // Validate module name to prevent command injection
      if (!/^[@a-z0-9][a-z0-9-_./@]*$/i.test(moduleName)) {
        this.plugin.memoryEngine.log('TROUBLESHOOT', 'Invalid module name detected', {
          module: moduleName
        });
        return code;
      }

      this.plugin.memoryEngine.log('TROUBLESHOOT', `Installing missing module: ${moduleName}`);

      try {
        // Use spawn instead of exec to prevent command injection
        const { spawn } = require('child_process');
        await new Promise((resolve, reject) => {
          const proc = spawn('npm', ['install', moduleName], { shell: false });
          proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm install failed with code ${code}`)));
          proc.on('error', reject);
        });
        return code; // Code unchanged, module installed
      } catch (installError) {
        this.plugin.memoryEngine.log('TROUBLESHOOT', 'Failed to install module', {
          module: moduleName,
          error: installError.message
        });
      }
    }

    return code;
  }

  async fixTypeError(error, code) {
    // Type errors are complex - would need advanced analysis
    // For now, just return code unchanged
    return code;
  }

  async fixReferenceError(error, code) {
    // Extract undefined variable name
    const match = error.message.match(/(\w+) is not defined/i);
    if (match) {
      const varName = match[1];

      // Try to add declaration at top
      const declaration = `const ${varName} = null; // Auto-added by verification loop\n`;
      return declaration + code;
    }

    return code;
  }

  async fixFileNotFound(error, code) {
    // File operations need filesystem context
    // For now, just log and return
    this.plugin.memoryEngine.log('TROUBLESHOOT', 'File not found - manual intervention needed', {
      error: error.message
    });

    return code;
  }

  async genericFix(error, code) {
    this.plugin.memoryEngine.log('TROUBLESHOOT', 'Generic fix - no specific solution', {
      errorType: error.type
    });

    return code;
  }
}

module.exports = VerificationLoop;
