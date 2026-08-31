#!/usr/bin/env node

/**
 * Memory Orchestrator CLI
 * Command-line interface for the Memory Orchestrator plugin
 */

import MemoryOrchestrator from './index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = {
  async init(args) {
    const orchestrator = new MemoryOrchestrator({
      platform: args.platform || 'claude',
      autoSkillPick: true
    });

    console.log('🎯 Memory Orchestrator initialized');
    console.log(`📁 Memory directory: ${orchestrator.config.memoryDir}`);
    console.log(`🔧 Platform: ${orchestrator.config.platform}`);

    // Discover available tools
    const tools = await orchestrator.autoPickTools();
    console.log(`\n📦 Discovered tools:`);
    console.log(`  Skills: ${tools.skills.length}`);
    console.log(`  Plugins: ${tools.plugins.length}`);
    console.log(`  MCPs: ${tools.mcps.length}`);

    return orchestrator;
  },

  async phase(args) {
    const orchestrator = await loadOrchestrator(args);

    if (args.action === 'start') {
      orchestrator.startPhase(args.name, args.description);
    } else if (args.action === 'complete') {
      orchestrator.completePhase(args.summary);
    } else if (args.action === 'list') {
      const checklist = orchestrator.generateChecklist();
      console.log('\n📋 Phase Checklist:');
      checklist.forEach(item => {
        const status = item.completed ? '✅' : '⏳';
        const duration = item.duration ? ` (${Math.round(item.duration / 1000)}s)` : '';
        console.log(`  ${status} ${item.phase}${duration}`);
      });
    }

    return orchestrator;
  },

  async memory(args) {
    const orchestrator = await loadOrchestrator(args);

    if (args.action === 'write') {
      orchestrator.writeMemory(args.type, JSON.parse(args.data || '{}'));
      console.log(`✅ Memory written: ${args.type}`);
    } else if (args.action === 'read') {
      const filter = {};
      if (args.type) filter.type = args.type;
      if (args.phase) filter.phase = args.phase;

      const memories = orchestrator.readMemory(filter);
      console.log(`\n📖 Found ${memories.length} memory entries:\n`);
      memories.forEach(mem => {
        console.log(`[${mem.timestamp}] ${mem.type} (Phase: ${mem.phase})`);
        console.log(JSON.stringify(mem.data, null, 2));
        console.log('---');
      });
    }

    return orchestrator;
  },

  async agent(args) {
    const orchestrator = await loadOrchestrator(args);

    if (args.action === 'create') {
      await orchestrator.createSubAgent(args.name, JSON.parse(args.config || '{}'));
    } else if (args.action === 'complete') {
      orchestrator.completeSubAgent(args.name, JSON.parse(args.result || '{}'));
    } else if (args.action === 'list') {
      console.log('\n🤖 Sub-agents:');
      orchestrator.subAgents.forEach((agent, name) => {
        const status = agent.status === 'completed' ? '✅' : '⏳';
        console.log(`  ${status} ${name} - ${agent.status}`);
      });
    }

    return orchestrator;
  },

  async scaffold(args) {
    const orchestrator = await loadOrchestrator(args);

    if (args.action === 'create') {
      orchestrator.createScaffolding(args.name, JSON.parse(args.structure || '{}'));
    } else if (args.action === 'teardown') {
      orchestrator.tearDownScaffolding(args.name);
    } else if (args.action === 'list') {
      console.log('\n🏗️  Scaffolding:');
      orchestrator.scaffolding.forEach((scaffold, name) => {
        console.log(`  📦 ${name} - ${scaffold.status}`);
      });
    }

    return orchestrator;
  },

  async complete(args) {
    const orchestrator = await loadOrchestrator(args);
    const summary = orchestrator.markAllCompleted();

    console.log('\n🎉 All tasks completed!');
    console.log(`  Phases: ${summary.completedPhases}/${summary.totalPhases}`);
    console.log(`  Sub-agents: ${summary.subAgents}`);

    return orchestrator;
  },

  async report(args) {
    const orchestrator = await loadOrchestrator(args);
    const report = orchestrator.generateReport();

    console.log('\n📊 Final Report Generated');
    console.log(`\nSummary:`);
    console.log(`  Total phases: ${report.summary.totalPhases}`);
    console.log(`  Completed: ${report.summary.completedPhases}`);
    console.log(`  Duration: ${Math.round(report.summary.totalDuration / 1000)}s`);
    console.log(`  Sub-agents: ${report.summary.subAgents}`);
    console.log(`  Memory entries: ${report.memory.length}`);

    return orchestrator;
  }
};

function loadOrchestrator(args) {
  return new MemoryOrchestrator({
    platform: args.platform || 'claude',
    memoryDir: args.memoryDir
  });
}

function parseArgs(argv) {
  const args = {
    _: []
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];

      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(arg);
    }
  }

  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const command = args._[0];

  if (!command || command === 'help') {
    console.log(`
Memory Orchestrator CLI

Usage:
  memory-orchestrator <command> [options]

Commands:
  init                    Initialize orchestrator
  phase start             Start new phase
  phase complete          Complete current phase
  phase list              List all phases
  memory write            Write memory entry
  memory read             Read memory entries
  agent create            Create sub-agent
  agent complete          Complete sub-agent
  agent list              List sub-agents
  scaffold create         Create scaffolding
  scaffold teardown       Tear down scaffolding
  scaffold list           List scaffolding
  complete                Mark everything completed
  report                  Generate final report

Options:
  --platform <name>       Platform: claude, openai, antigravity
  --name <name>           Name for phase/agent/scaffold
  --type <type>           Memory entry type
  --data <json>           JSON data
  --phase <name>          Filter by phase
  --memoryDir <path>      Custom memory directory

Examples:
  memory-orchestrator init --platform claude
  memory-orchestrator phase start --name "Setup" --description "Initial setup"
  memory-orchestrator memory write --type "checkpoint" --data '{"step": 1}'
  memory-orchestrator agent create --name "coder" --config '{}'
  memory-orchestrator complete
  memory-orchestrator report
    `);
    return;
  }

  args.action = args._[1];

  if (commands[command]) {
    try {
      await commands[command](args);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.error(`❌ Unknown command: ${command}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
