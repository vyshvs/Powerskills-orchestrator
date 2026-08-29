/**
 * Security Scanner for PowerSkills Orchestrator
 * Identifies common security vulnerabilities in JavaScript code
 */

const fs = require('fs');
const path = require('path');

class SecurityScanner {
  constructor() {
    this.findings = [];
    this.scannedFiles = 0;
  }

  /**
   * Scan directory recursively for security issues
   */
  scanDirectory(dir, excludeDirs = ['node_modules', '.git', 'test', 'examples']) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          this.scanDirectory(fullPath, excludeDirs);
        }
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        this.scanFile(fullPath);
      }
    }
  }

  /**
   * Scan individual file for security vulnerabilities
   */
  scanFile(filePath) {
    this.scannedFiles++;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(process.cwd(), filePath);

    // Check for unsafe JSON.parse without try-catch
    this.checkUnsafeJSONParse(relativePath, content, lines);

    // Check for command injection vulnerabilities
    this.checkCommandInjection(relativePath, content, lines);

    // Check for path traversal vulnerabilities
    this.checkPathTraversal(relativePath, content, lines);

    // Check for prototype pollution
    this.checkPrototypePollution(relativePath, content, lines);

    // Check for RegEx DoS
    this.checkRegexDoS(relativePath, content, lines);

    // Check for insecure randomness
    this.checkInsecureRandom(relativePath, content, lines);
  }

  checkUnsafeJSONParse(file, content, lines) {
    const jsonParseRegex = /JSON\.parse\(/g;
    let match;

    while ((match = jsonParseRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const line = lines[lineNum - 1];

      // Check if JSON.parse is in a try-catch block
      const contextStart = Math.max(0, lineNum - 5);
      const contextEnd = Math.min(lines.length, lineNum + 5);
      const context = lines.slice(contextStart, contextEnd).join('\n');

      if (!context.includes('try') && !context.includes('catch')) {
        this.addFinding({
          severity: 'medium',
          category: 'error-handling',
          file,
          line: lineNum,
          code: line.trim(),
          message: 'JSON.parse() without try-catch can cause unhandled exceptions',
          recommendation: 'Wrap JSON.parse() in try-catch block or use a safe parsing utility'
        });
      }
    }
  }

  checkCommandInjection(file, content, lines) {
    const patterns = [
      { regex: /exec\([^)]*\+/g, desc: 'String concatenation in exec()' },
      { regex: /execSync\([^)]*\+/g, desc: 'String concatenation in execSync()' },
      { regex: /spawn\([^)]*\+/g, desc: 'String concatenation in spawn()' },
      { regex: /exec\([^)]*\$\{/g, desc: 'Template literal in exec()' },
      { regex: /execSync\([^)]*\$\{/g, desc: 'Template literal in execSync()' }
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNum - 1];

        this.addFinding({
          severity: 'high',
          category: 'command-injection',
          file,
          line: lineNum,
          code: line.trim(),
          message: `Potential command injection: ${pattern.desc}`,
          recommendation: 'Use array syntax for command arguments or sanitize input'
        });
      }
    }
  }

  checkPathTraversal(file, content, lines) {
    const patterns = [
      /fs\.readFileSync\([^)]*\+/g,
      /fs\.writeFileSync\([^)]*\+/g,
      /fs\.readFile\([^)]*\+/g,
      /fs\.writeFile\([^)]*\+/g,
      /path\.join\([^)]*req\./g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNum - 1];

        // Skip if using path.resolve or path.normalize
        if (line.includes('path.resolve') || line.includes('path.normalize')) {
          continue;
        }

        this.addFinding({
          severity: 'high',
          category: 'path-traversal',
          file,
          line: lineNum,
          code: line.trim(),
          message: 'Potential path traversal vulnerability with user input',
          recommendation: 'Validate and sanitize file paths, use path.resolve() to prevent traversal'
        });
      }
    }
  }

  checkPrototypePollution(file, content, lines) {
    const patterns = [
      /Object\.assign\(/g,
      /\.\.\.\s*req\./g,
      /\[.*req\./g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNum - 1];

        if (line.includes('__proto__') || line.includes('constructor') || line.includes('prototype')) {
          this.addFinding({
            severity: 'high',
            category: 'prototype-pollution',
            file,
            line: lineNum,
            code: line.trim(),
            message: 'Potential prototype pollution vulnerability',
            recommendation: 'Sanitize object keys, avoid direct object merging with user input'
          });
        }
      }
    }
  }

  checkRegexDoS(file, content, lines) {
    const dangerousPatterns = [
      /new RegExp\([^)]*\+/g,
      /\/\(.*\+.*\)\+\//g,
      /\/\(.*\*.*\)\+\//g
    ];

    for (const pattern of dangerousPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNum - 1];

        this.addFinding({
          severity: 'medium',
          category: 'regex-dos',
          file,
          line: lineNum,
          code: line.trim(),
          message: 'Potential Regular Expression Denial of Service (ReDoS)',
          recommendation: 'Avoid nested quantifiers in regex, use simpler patterns'
        });
      }
    }
  }

  checkInsecureRandom(file, content, lines) {
    const randomRegex = /Math\.random\(\)/g;
    let match;

    while ((match = randomRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const line = lines[lineNum - 1];

      // Check context for security-sensitive operations
      const contextStart = Math.max(0, lineNum - 3);
      const contextEnd = Math.min(lines.length, lineNum + 3);
      const context = lines.slice(contextStart, contextEnd).join('\n').toLowerCase();

      if (context.includes('token') || context.includes('session') ||
          context.includes('key') || context.includes('password')) {
        this.addFinding({
          severity: 'high',
          category: 'insecure-randomness',
          file,
          line: lineNum,
          code: line.trim(),
          message: 'Math.random() used for security-sensitive operation',
          recommendation: 'Use crypto.randomBytes() or crypto.randomUUID() for security tokens'
        });
      }
    }
  }

  addFinding(finding) {
    this.findings.push(finding);
  }

  generateReport() {
    console.log('\n='.repeat(80));
    console.log('SECURITY SCAN REPORT - PowerSkills Orchestrator');
    console.log('='.repeat(80));
    console.log(`\nScanned ${this.scannedFiles} files`);
    console.log(`Found ${this.findings.length} potential security issues\n`);

    const bySeverity = {
      high: this.findings.filter(f => f.severity === 'high'),
      medium: this.findings.filter(f => f.severity === 'medium'),
      low: this.findings.filter(f => f.severity === 'low')
    };

    console.log(`🔴 High:   ${bySeverity.high.length}`);
    console.log(`🟡 Medium: ${bySeverity.medium.length}`);
    console.log(`🟢 Low:    ${bySeverity.low.length}`);

    // Group by category
    const byCategory = {};
    this.findings.forEach(f => {
      if (!byCategory[f.category]) byCategory[f.category] = [];
      byCategory[f.category].push(f);
    });

    console.log('\n' + '-'.repeat(80));
    console.log('FINDINGS BY CATEGORY');
    console.log('-'.repeat(80));

    for (const [category, findings] of Object.entries(byCategory)) {
      console.log(`\n[${category.toUpperCase()}] - ${findings.length} issue(s)\n`);

      findings.forEach((f, idx) => {
        console.log(`  ${idx + 1}. ${f.file}:${f.line}`);
        console.log(`     Severity: ${f.severity.toUpperCase()}`);
        console.log(`     Issue: ${f.message}`);
        console.log(`     Code: ${f.code}`);
        console.log(`     Fix: ${f.recommendation}`);
        console.log('');
      });
    }

    console.log('='.repeat(80));
    console.log('END OF REPORT');
    console.log('='.repeat(80));

    return {
      scannedFiles: this.scannedFiles,
      totalFindings: this.findings.length,
      bySeverity,
      byCategory,
      findings: this.findings
    };
  }
}

// Run scanner
const scanner = new SecurityScanner();
scanner.scanDirectory('./core');
const report = scanner.generateReport();

// Save JSON report
fs.writeFileSync(
  './security-report.json',
  JSON.stringify(report, null, 2)
);

console.log('\n✅ Detailed report saved to: security-report.json\n');

// Exit with code 1 if high severity issues found
if (report.bySeverity.high.length > 0) {
  process.exit(1);
}
