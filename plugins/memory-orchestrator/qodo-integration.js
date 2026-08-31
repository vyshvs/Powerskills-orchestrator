/**
 * Qodo Integration Module for Memory Orchestrator
 * Automatically reviews and tests code at phase completion
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

export class QodoIntegration {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      qodoCommand: config.qodoCommand || 'qodo',
      autoFix: config.autoFix !== false,
      testCommand: config.testCommand || 'npm test',
      reviewTimeout: config.reviewTimeout || 300000, // 5 minutes
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
   * Run Qodo code review on specified files
   */
  async reviewCode(files = []) {
    if (!this.config.enabled) {
      return { skipped: true, reason: 'Qodo integration disabled' };
    }

    const qodoAvailable = await this.isQodoAvailable();
    if (!qodoAvailable) {
      console.warn('⚠️  Qodo not available, skipping code review');
      return { skipped: true, reason: 'Qodo not installed' };
    }

    console.log('🔍 Running Qodo code review...');

    const results = {
      reviewed: 0,
      issues: [],
      fixed: 0,
      passed: false,
      timestamp: new Date().toISOString()
    };

    for (const file of files) {
      try {
        const review = await this.reviewFile(file);
        results.reviewed++;

        if (review.issues && review.issues.length > 0) {
          results.issues.push(...review.issues);

          if (this.config.autoFix && review.fixable) {
            const fixed = await this.applyFixes(file, review);
            if (fixed) {
              results.fixed++;
            }
          }
        }
      } catch (error) {
        console.error(`Failed to review ${file}:`, error.message);
        results.issues.push({
          file,
          type: 'review-error',
          message: error.message
        });
      }
    }

    results.passed = results.issues.length === 0;

    console.log(`✅ Qodo review complete: ${results.reviewed} files, ${results.issues.length} issues, ${results.fixed} fixed`);

    return results;
  }

  /**
   * Review a single file with Qodo
   */
  async reviewFile(filePath) {
    return new Promise((resolve, reject) => {
      const args = ['review', filePath, '--format', 'json'];
      const proc = spawn(this.config.qodoCommand, args, { shell: false });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      const timeout = setTimeout(() => {
        proc.kill();
        reject(new Error('Qodo review timeout'));
      }, this.config.reviewTimeout);

      proc.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          reject(new Error(`Qodo review failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          // Fallback if JSON parsing fails
          resolve({
            file: filePath,
            issues: stderr ? [{ message: stderr }] : [],
            fixable: false
          });
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Apply automated fixes from Qodo
   */
  async applyFixes(filePath, review) {
    return new Promise((resolve, reject) => {
      const args = ['fix', filePath, '--auto'];
      const proc = spawn(this.config.qodoCommand, args, { shell: false });

      proc.on('close', (code) => {
        resolve(code === 0);
      });

      proc.on('error', (error) => {
        console.error(`Failed to apply fixes to ${filePath}:`, error.message);
        resolve(false);
      });
    });
  }

  /**
   * Run tests using configured test command
   */
  async runTests() {
    if (!this.config.testCommand) {
      return { skipped: true, reason: 'No test command configured' };
    }

    console.log('🧪 Running tests...');

    return new Promise((resolve) => {
      const [command, ...args] = this.config.testCommand.split(' ');
      const proc = spawn(command, args, {
        shell: false,
        stdio: 'inherit'
      });

      proc.on('close', (code) => {
        const passed = code === 0;
        console.log(passed ? '✅ Tests passed' : '❌ Tests failed');

        resolve({
          passed,
          exitCode: code,
          timestamp: new Date().toISOString()
        });
      });

      proc.on('error', (error) => {
        console.error('Test execution error:', error.message);
        resolve({
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  /**
   * Run comprehensive code quality check
   */
  async runQualityCheck(files = []) {
    const results = {
      review: null,
      tests: null,
      passed: false,
      timestamp: new Date().toISOString()
    };

    // Run code review
    results.review = await this.reviewCode(files);

    // Run tests
    results.tests = await this.runTests();

    // Overall pass/fail
    results.passed =
      (results.review.skipped || results.review.passed) &&
      (results.tests.skipped || results.tests.passed);

    return results;
  }

  /**
   * Generate quality report
   */
  async generateQualityReport(results, outputPath) {
    const report = {
      summary: {
        passed: results.passed,
        timestamp: results.timestamp,
        reviewStatus: results.review.skipped ? 'skipped' : (results.review.passed ? 'passed' : 'failed'),
        testStatus: results.tests.skipped ? 'skipped' : (results.tests.passed ? 'passed' : 'failed')
      },
      review: results.review,
      tests: results.tests,
      recommendations: this.generateRecommendations(results)
    };

    try {
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
      console.log(`📊 Quality report saved: ${outputPath}`);
    } catch (error) {
      console.error('Failed to save quality report:', error.message);
    }

    return report;
  }

  /**
   * Generate recommendations based on review results
   */
  generateRecommendations(results) {
    const recommendations = [];

    if (!results.review.skipped && !results.review.passed) {
      recommendations.push({
        priority: 'high',
        message: `Found ${results.review.issues.length} code issues that need attention`,
        action: 'Review and fix code issues before proceeding'
      });
    }

    if (!results.tests.skipped && !results.tests.passed) {
      recommendations.push({
        priority: 'high',
        message: 'Tests are failing',
        action: 'Fix failing tests before completing phase'
      });
    }

    if (results.review.fixed > 0) {
      recommendations.push({
        priority: 'medium',
        message: `Auto-fixed ${results.review.fixed} issues`,
        action: 'Review auto-fixes and commit changes'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        message: 'All quality checks passed',
        action: 'Proceed with confidence'
      });
    }

    return recommendations;
  }
}

export default QodoIntegration;
