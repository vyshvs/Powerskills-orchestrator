/**
 * Generate agent markdown files from JavaScript templates
 * Creates agents/*.md files that Claude Code UI can discover
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const TEMPLATE_MANAGER = path.join(__dirname, '..', 'core', 'powerskills', 'agent-template-manager.js');

// Load agent templates
const AgentTemplateManager = require('../core/powerskills/agent-template-manager.js');

// Mock plugin for template manager
const mockPlugin = {
  memoryEngine: {
    log: () => {}
  }
};

const templateManager = new AgentTemplateManager(mockPlugin);
const templates = Array.from(templateManager.templates.values());

function generateAgentManifest(template) {
  const { name, description, model, systemPrompt, capabilities } = template;

  return `---
name: ${name}
description: ${description}
model: ${model}
---

# ${name}

${description}

## System Prompt

${systemPrompt}

## Capabilities

${capabilities.map(c => `- ${c}`).join('\n')}

## Configuration

- **Model**: ${model}
- **Max Tokens**: ${template.maxTokens || 4096}
- **Temperature**: ${template.temperature || 0.5}

## Usage

This agent is available as a template for sub-agent orchestration. Invoke through the PowerSkills framework.
`;
}

function main() {
  console.log('Generating agent manifests...\n');

  let created = 0;
  let skipped = 0;

  templates.forEach(template => {
    const outputPath = path.join(AGENTS_DIR, `${template.name}.md`);

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  Skipped: ${template.name} (already exists)`);
      skipped++;
      return;
    }

    const manifest = generateAgentManifest(template);
    fs.writeFileSync(outputPath, manifest, 'utf8');
    console.log(`✅ Created: ${template.name}`);
    created++;
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${templates.length}`);
}

main();
