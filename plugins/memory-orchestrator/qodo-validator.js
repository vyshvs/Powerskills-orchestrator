import { spawn } from 'child_process';
import { writeFile, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Qodo Code Review Validator
 * Integrates Qodo AI for automated code review and quality checks
 */
class QodoValidator {
  constructor(config = {}) {
    this.config = {
      checkCoverage: config.checkCoverage !== false,
      minCoverage: config.minCoverage || 80,
      checkSecurity: config.checkSecurity !== false,
      checkComplexity: config.checkComplexity !== false,
      maxComplexity: config.maxComplexity || 10,
      autoFix: config.autoFix || false,
      ...config
    };
  }

  /**
   * Check if Qodo is available
   */
  async isQodoAvailable() {
    return new Promise((resolve) => {
      const proc = spawn('which', ['qodo'], { shell: false });
      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  }

  /**
   * Run Qodo code review on a file
   */
  async reviewFile(filePath) {
    if (!existsSync(filePath)) {
      return {
        passed: false,
        issues: [`File not found: ${filePath}`],
        suggestions: []
      };
    }

    const tempOutputFile = path.join('.memory', 'qodo-review', `${Date.now()}.json`);

    try {
      // Run Qodo review
      const result = await this.executeQodo(filePath, tempOutputFile);

      // Parse results
      const review = await this.parseQodoOutput(tempOutputFile);

      // Clean up temp file
      if (existsSync(tempOutputFile)) {
        await rm(tempOutputFile, { force: true });
      }

      return review;
    } catch (error) {
      return {
        passed: false,
        issues: [`Qodo review failed: ${error.message}`],
        suggestions: []
      };
    }
  }

  /**
   * Execute Qodo command
   */
  async executeQodo(filePath, outputFile) {
    return new Promise((resolve, reject) => {
      const args = ['review', filePath, '--format', 'json', '--output', outputFile];

      if (this.config.checkSecurity) {
        args.push('--security');
      }

      if (this.config.checkComplexity) {
        args.push('--complexity');
      }

      const proc = spawn('qodo', args, { shell: false });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 || code === 1) {
          // Code 1 might mean issues found, not a failure
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Qodo exited with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse Qodo output
   */
  async parseQodoOutput(outputFile) {
    if (!existsSync(outputFile)) {
      // If no output file, assume no issues
      return {
        passed: true,
        issues: [],
        suggestions: [],
        metrics: {}
      };
    }

    const content = await readFile(outputFile, 'utf8');
    let data;

    try {
      data = JSON.parse(content);
    } catch (error) {
      // Fallback: parse plain text output
      return this.parsePlainTextOutput(content);
    }

    // Extract issues and suggestions
    const issues = data.issues || [];
    const suggestions = data.suggestions || [];
    const metrics = data.metrics || {};

    // Determine if passed based on severity
    const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    const passed = criticalIssues.length === 0;

    return {
      passed,
      issues: issues.map(i => `[${i.severity}] ${i.message} (${i.file}:${i.line})`),
      suggestions: suggestions.map(s => s.message),
      metrics,
      rawData: data
    };
  }

  /**
   * Parse plain text output as fallback
   */
  parsePlainTextOutput(content) {
    const lines = content.split('\n');
    const issues = [];
    const suggestions = [];

    for (const line of lines) {
      if (line.includes('ERROR') || line.includes('CRITICAL')) {
        issues.push(line.trim());
      } else if (line.includes('WARNING') || line.includes('SUGGESTION')) {
        suggestions.push(line.trim());
      }
    }

    return {
      passed: issues.length === 0,
      issues,
      suggestions,
      metrics: {}
    };
  }

  /**
   * Check test coverage
   */
  async checkCoverage(projectPath) {
    if (!this.config.checkCoverage) {
      return { passed: true, coverage: null };
    }

    try {
      // Run coverage tool (assuming npm test with coverage)
      const result = await this.executeCommand('npm', ['run', 'test:coverage'], projectPath);

      // Parse coverage from output
      const coverage = this.parseCoverageFromOutput(result.stdout);

      const passed = coverage.total >= this.config.minCoverage;

      return {
        passed,
        coverage,
        message: passed
          ? `Coverage ${coverage.total}% meets minimum ${this.config.minCoverage}%`
          : `Coverage ${coverage.total}% below minimum ${this.config.minCoverage}%`
      };
    } catch (error) {
      return {
        passed: false,
        coverage: null,
        message: `Coverage check failed: ${error.message}`
      };
    }
  }

  /**
   * Parse coverage from test output
   */
  parseCoverageFromOutput(output) {
    // Look for common coverage patterns
    const patterns = [
      /All files\s+\|\s+([\d.]+)/,
      /Statements\s*:\s*([\d.]+)%/,
      /Coverage:\s*([\d.]+)%/
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return {
          total: parseFloat(match[1]),
          raw: output
        };
      }
    }

    return { total: 0, raw: output };
  }

  /**
   * Execute a command
   */
  async executeCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        shell: false,
        cwd: cwd || process.cwd()
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Create a validator for use with ScaffoldingTree
   */
  createValidator(name = 'qodo-review') {
    const self = this;

    return {
      name,
      type: 'review',
      async execute(node) {
        // Check if Qodo is available
        const qodoAvailable = await self.isQodoAvailable();

        if (!qodoAvailable) {
          console.warn('⚠️  Qodo not available, skipping code review');
          return {
            passed: true,
            message: 'Qodo not available - skipped',
            details: { skipped: true }
          };
        }

        // Get files to review from node metadata
        const filesToReview = node.metadata.filesToReview || [];

        if (filesToReview.length === 0) {
          return {
            passed: true,
            message: 'No files to review',
            details: {}
          };
        }

        // Review each file
        const reviews = [];
        for (const file of filesToReview) {
          const review = await self.reviewFile(file);
          reviews.push({ file, review });
        }

        // Aggregate results
        const allPassed = reviews.every(r => r.review.passed);
        const allIssues = reviews.flatMap(r => r.review.issues);
        const allSuggestions = reviews.flatMap(r => r.review.suggestions);

        return {
          passed: allPassed,
          message: allPassed
            ? `Code review passed for ${filesToReview.length} file(s)`
            : `Code review found ${allIssues.length} issue(s)`,
          details: {
            reviews,
            issues: allIssues,
            suggestions: allSuggestions
          }
        };
      },
      canAutoFix: self.config.autoFix,
      async fix(node, validationResult) {
        if (!self.config.autoFix) {
          throw new Error('Auto-fix not enabled');
        }

        // Apply Qodo suggestions
        const reviews = validationResult.details.reviews || [];

        for (const { file, review } of reviews) {
          if (review.rawData && review.rawData.fixes) {
            await self.applyFixes(file, review.rawData.fixes);
          }
        }
      }
    };
  }

  /**
   * Apply fixes to a file
   */
  async applyFixes(filePath, fixes) {
    const content = await readFile(filePath, 'utf8');
    let updatedContent = content;

    // Apply fixes in reverse order (to preserve line numbers)
    const sortedFixes = fixes.sort((a, b) => b.line - a.line);

    for (const fix of sortedFixes) {
      if (fix.type === 'replace') {
        updatedContent = this.applyReplaceFix(updatedContent, fix);
      } else if (fix.type === 'insert') {
        updatedContent = this.applyInsertFix(updatedContent, fix);
      } else if (fix.type === 'delete') {
        updatedContent = this.applyDeleteFix(updatedContent, fix);
      }
    }

    await writeFile(filePath, updatedContent);
  }

  /**
   * Apply replace fix
   */
  applyReplaceFix(content, fix) {
    const lines = content.split('\n');
    lines[fix.line - 1] = fix.replacement;
    return lines.join('\n');
  }

  /**
   * Apply insert fix
   */
  applyInsertFix(content, fix) {
    const lines = content.split('\n');
    lines.splice(fix.line, 0, fix.content);
    return lines.join('\n');
  }

  /**
   * Apply delete fix
   */
  applyDeleteFix(content, fix) {
    const lines = content.split('\n');
    lines.splice(fix.line - 1, 1);
    return lines.join('\n');
  }
}

export { QodoValidator };
