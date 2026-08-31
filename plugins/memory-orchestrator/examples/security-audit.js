/**
 * Example: Complete Security Audit Workflow
 * Demonstrates memory tracking, sub-agents, and phase management
 */

import WorkflowEngine from './workflow.js';

async function runSecurityAudit() {
  console.log('🔒 Starting Security Audit Workflow\n');

  const engine = new WorkflowEngine({
    platform: 'claude',
    memoryDir: './.memory/security-audit'
  });

  // Define comprehensive security audit workflow
  engine.defineWorkflow('security-audit', [
    {
      name: 'Discovery',
      description: 'Discover all code files and dependencies',
      handler: async (orchestrator, adapter, context) => {
        orchestrator.writeMemory('discovery-start', { timestamp: new Date() });

        // Simulate file discovery
        const result = {
          files: 450,
          jsFiles: 320,
          dependencies: 0,
          refFiles: 200
        };

        orchestrator.writeMemory('discovery-complete', result);
        return result;
      }
    },
    {
      name: 'Scan',
      description: 'Scan for security vulnerabilities',
      dependencies: [0],
      subAgents: [
        {
          name: 'redos-scanner',
          task: 'Scan for ReDoS vulnerabilities',
          config: { pattern: 'polynomial-regex' }
        },
        {
          name: 'injection-scanner',
          task: 'Scan for command injection',
          config: { pattern: 'exec-with-interpolation' }
        },
        {
          name: 'race-scanner',
          task: 'Scan for race conditions',
          config: { pattern: 'toctou' }
        }
      ]
    },
    {
      name: 'Analysis',
      description: 'Analyze and prioritize vulnerabilities',
      dependencies: [1],
      handler: async (orchestrator, adapter, context) => {
        const analysis = {
          critical: 15,
          high: 89,
          medium: 45,
          low: 120,
          total: 269
        };

        orchestrator.writeMemory('analysis-result', analysis);
        return analysis;
      }
    },
    {
      name: 'Fix',
      description: 'Fix all vulnerabilities',
      dependencies: [2],
      subAgents: [
        {
          name: 'redos-fixer',
          task: 'Fix ReDoS vulnerabilities',
          config: { autoFix: true }
        },
        {
          name: 'injection-fixer',
          task: 'Fix command injection vulnerabilities',
          config: { autoFix: true }
        },
        {
          name: 'race-fixer',
          task: 'Fix race conditions',
          config: { autoFix: true }
        }
      ]
    },
    {
      name: 'Verify',
      description: 'Verify all fixes',
      dependencies: [3],
      handler: async (orchestrator, adapter, context) => {
        const verification = {
          fixed: 269,
          remaining: 0,
          passed: true
        };

        orchestrator.writeMemory('verification-result', verification);
        return verification;
      }
    },
    {
      name: 'Report',
      description: 'Generate comprehensive report',
      dependencies: [4],
      handler: async (orchestrator, adapter, context) => {
        const report = orchestrator.generateReport();
        orchestrator.writeMemory('final-report', report);
        return report;
      }
    }
  ]);

  try {
    // Execute workflow
    const result = await engine.executeWorkflow('security-audit', {
      project: 'Powerskills-orchestrator',
      repository: 'https://github.com/vyshvs/Powerskills-orchestrator'
    });

    console.log('\n✅ Security Audit Completed!\n');

    // Generate checklist
    const checklist = engine.generateWorkflowChecklist('security-audit');
    console.log('📋 Workflow Checklist:');
    checklist.forEach(item => {
      const status = item.completed ? '✅' : '⏳';
      console.log(`  ${status} Phase ${item.index + 1}: ${item.phase}`);
    });

    // Get final status
    const status = engine.getWorkflowStatus('security-audit');
    console.log(`\n📊 Progress: ${status.progress.completed}/${status.progress.total} (${status.progress.percentage}%)`);

    // Complete all workflows
    const summary = engine.completeAllWorkflows();
    console.log('\n🎉 All workflows completed!');
    console.log(`  Total: ${summary.totalWorkflows}`);
    console.log(`  Completed: ${summary.completed}`);
    console.log(`  Failed: ${summary.failed}`);

    return result;

  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
    throw error;
  }
}

// Run the workflow
runSecurityAudit()
  .then(result => {
    console.log('\n✨ Workflow execution successful');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Workflow execution failed');
    process.exit(1);
  });
