/**
 * Generate skill markdown manifests from JavaScript implementations
 * Creates skills/*.md files that Claude Code UI can discover
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'core', 'powerskills', 'skills');
const OUTPUT_DIR = path.join(__dirname, '..', 'skills');

// Skill metadata extracted from files
const skillMetadata = {
  'agent-introspection-debugging': {
    description: 'Debug agent behavior and decision-making processes',
    category: 'engineering',
    triggers: ['debug agent', 'introspect', 'agent behavior']
  },
  'agent-sort': {
    description: 'Sort and organize agent execution results',
    category: 'engineering',
    triggers: ['sort agents', 'organize results']
  },
  'api-design': {
    description: 'Design RESTful APIs with best practices',
    category: 'engineering',
    triggers: ['api design', 'rest api', 'endpoint design']
  },
  'article-writing': {
    description: 'Write comprehensive technical articles',
    category: 'research',
    triggers: ['write article', 'blog post', 'technical writing']
  },
  'backend-patterns': {
    description: 'Implement backend architecture patterns',
    category: 'engineering',
    triggers: ['backend', 'server design', 'api patterns']
  },
  'benchmark-methodology': {
    description: 'Design and execute performance benchmarks',
    category: 'engineering',
    triggers: ['benchmark', 'performance test', 'measure performance']
  },
  'brand-discovery': {
    description: 'Discover and analyze brand positioning',
    category: 'architecture',
    triggers: ['brand discovery', 'brand analysis']
  },
  'brand-voice': {
    description: 'Define and maintain consistent brand voice',
    category: 'research',
    triggers: ['brand voice', 'tone guidelines']
  },
  'bun-runtime': {
    description: 'Work with Bun JavaScript runtime',
    category: 'engineering',
    triggers: ['bun', 'bun runtime']
  },
  'coding-standards': {
    description: 'Enforce coding standards and style guides',
    category: 'engineering',
    triggers: ['coding standards', 'style guide', 'code quality']
  },
  'competitive-platform-analysis': {
    description: 'Analyze competitive platforms and features',
    category: 'research',
    triggers: ['competitive analysis', 'competitor research']
  },
  'competitive-report-structure': {
    description: 'Structure competitive analysis reports',
    category: 'research',
    triggers: ['competitive report', 'analysis structure']
  },
  'content-engine': {
    description: 'Generate and manage content at scale',
    category: 'research',
    triggers: ['content generation', 'content engine']
  },
  'crosspost': {
    description: 'Cross-post content across multiple platforms',
    category: 'research',
    triggers: ['crosspost', 'multi-platform']
  },
  'deep-research': {
    description: 'Multi-source deep research with synthesis',
    category: 'research',
    triggers: ['research', 'investigate', 'deep dive']
  },
  'dmux-workflows': {
    description: 'Demultiplex and manage parallel workflows',
    category: 'engineering',
    triggers: ['workflow', 'dmux', 'parallel tasks']
  },
  'documentation-lookup': {
    description: 'Search and reference documentation',
    category: 'engineering',
    triggers: ['docs', 'documentation', 'lookup']
  },
  'e2e-testing': {
    description: 'End-to-end testing with Playwright/Cypress',
    category: 'engineering',
    triggers: ['e2e test', 'integration test', 'end to end']
  },
  'eval-harness': {
    description: 'Evaluate and benchmark AI model performance',
    category: 'engineering',
    triggers: ['eval', 'evaluation', 'benchmark model']
  },
  'everything-claude-code': {
    description: 'Comprehensive guide to Claude Code features',
    category: 'research',
    triggers: ['claude code', 'guide']
  },
  'exa-search': {
    description: 'Search using Exa API for research',
    category: 'research',
    triggers: ['exa search', 'search api']
  },
  'fal-ai-media': {
    description: 'Generate media using Fal AI',
    category: 'frontend',
    triggers: ['fal ai', 'generate image', 'ai media']
  },
  'frontend-patterns': {
    description: 'Frontend component design patterns',
    category: 'engineering',
    triggers: ['frontend', 'component', 'ui design']
  },
  'git-workflows': {
    description: 'Git workflows and best practices',
    category: 'engineering',
    triggers: ['git', 'git workflow', 'version control']
  },
  'investor-outreach': {
    description: 'Investor outreach and pitch preparation',
    category: 'architecture',
    triggers: ['investor', 'pitch', 'fundraising']
  },
  'iterative-refine': {
    description: 'Iteratively refine code and design',
    category: 'engineering',
    triggers: ['refine', 'iterate', 'improve']
  },
  'market-research': {
    description: 'Conduct market research and analysis',
    category: 'research',
    triggers: ['market research', 'market analysis']
  },
  'mcp-server-patterns': {
    description: 'Model Context Protocol server patterns',
    category: 'engineering',
    triggers: ['mcp', 'protocol', 'server patterns']
  },
  'mle-workflow': {
    description: 'Machine learning engineering workflow',
    category: 'engineering',
    triggers: ['ml', 'machine learning', 'mle']
  },
  'playwright-testing': {
    description: 'Playwright browser automation testing',
    category: 'engineering',
    triggers: ['playwright', 'browser test', 'automation']
  },
  'portfolio-generation': {
    description: 'Generate professional portfolios',
    category: 'engineering',
    triggers: ['portfolio', 'generate portfolio']
  },
  'pr-review': {
    description: 'Review pull requests comprehensively',
    category: 'engineering',
    triggers: ['pr review', 'pull request', 'code review']
  },
  'python-ds': {
    description: 'Python data science workflows',
    category: 'engineering',
    triggers: ['python', 'data science', 'pandas']
  },
  'rollout-guardrails': {
    description: 'Deploy with safety guardrails',
    category: 'engineering',
    triggers: ['rollout', 'deploy', 'guardrails']
  },
  'security-review': {
    description: 'Security audit and vulnerability scanning',
    category: 'engineering',
    triggers: ['security', 'audit', 'vulnerability']
  },
  'strategic-compact': {
    description: 'Create strategic compact documents',
    category: 'research',
    triggers: ['strategic compact', 'strategy']
  },
  'structured-docs': {
    description: 'Generate structured documentation',
    category: 'engineering',
    triggers: ['docs', 'documentation', 'structured']
  },
  'tdd-workflow': {
    description: 'Test-driven development workflow',
    category: 'engineering',
    triggers: ['tdd', 'test driven', 'testing']
  },
  'test-gen': {
    description: 'Generate comprehensive test suites',
    category: 'engineering',
    triggers: ['test gen', 'generate tests']
  },
  'trading-analysis': {
    description: 'Multi-agent trading analysis and recommendations',
    category: 'trading',
    triggers: ['trading', 'analyze trade', 'market analysis']
  },
  'video-creation': {
    description: 'Create and edit video content',
    category: 'engineering',
    triggers: ['video', 'create video']
  }
};

function generateSkillManifest(skillName, metadata) {
  const { description, category, triggers } = metadata;

  return `---
name: ${skillName}
description: ${description}
category: ${category}
triggers:
${triggers.map(t => `  - ${t}`).join('\n')}
---

# ${skillName}

${description}

## Usage

Invoke by typing one of the trigger phrases in chat, or let Claude use automatically for relevant tasks.

## Triggers

${triggers.map(t => `- \`${t}\``).join('\n')}

## Category

${category}

## Implementation

This skill is implemented in \`core/powerskills/skills/${skillName}.js\` as part of the PowerSkills framework.
`;
}

function main() {
  console.log('Generating skill manifests...\n');

  let created = 0;
  let skipped = 0;

  // Generate manifests for all skills
  Object.entries(skillMetadata).forEach(([skillName, metadata]) => {
    const outputPath = path.join(OUTPUT_DIR, `${skillName}.md`);

    // Use exclusive file creation flag to prevent race condition
    try {
      const manifest = generateSkillManifest(skillName, metadata);
      fs.writeFileSync(outputPath, manifest, { encoding: 'utf8', flag: 'wx' });
      console.log(`✅ Created: ${skillName}`);
      created++;
    } catch (error) {
      if (error.code === 'EEXIST') {
        console.log(`⏭️  Skipped: ${skillName} (already exists)`);
        skipped++;
      } else {
        throw error;
      }
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${Object.keys(skillMetadata).length}`);
}

main();
