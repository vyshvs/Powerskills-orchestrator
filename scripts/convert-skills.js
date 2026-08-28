/**
 * Automated Skill Converter
 * Converts SKILL.md files to JavaScript modules
 */

const fs = require('fs');
const path = require('path');

class SkillConverter {
  constructor() {
    this.convertedCount = 0;
    this.failedCount = 0;
    this.skills = [];
  }

  parseFrontmatter(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const frontmatter = {};
    const lines = frontmatterMatch[1].split('\n');

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        frontmatter[key.trim()] = valueParts.join(':').trim();
      }
    }

    return frontmatter;
  }

  extractTriggers(content, name) {
    // Extract trigger keywords from content
    const triggers = [];

    // From skill name
    triggers.push(name.replace(/-/g, ' '));
    triggers.push(name);

    // From "When to Activate" section
    const activateMatch = content.match(/## When to Activate\n([\s\S]*?)(?=\n##|$)/);
    if (activateMatch) {
      const text = activateMatch[1].toLowerCase();
      const keywords = text.match(/"([^"]+)"/g);
      if (keywords) {
        keywords.forEach(k => triggers.push(k.replace(/"/g, '')));
      }
    }

    return [...new Set(triggers)]; // Deduplicate
  }

  determineCategory(name, content) {
    const categoryMap = {
      research: ['research', 'investigate', 'analyze'],
      engineering: ['code', 'implement', 'build', 'fix', 'debug'],
      architecture: ['architecture', 'design', 'system'],
      frontend: ['frontend', 'ui', 'component', 'react'],
      testing: ['test', 'e2e', 'eval'],
      documentation: ['doc', 'guide', 'writing'],
      devops: ['deploy', 'docker', 'kubernetes'],
      data: ['data', 'sql', 'database']
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(k => name.includes(k) || content.toLowerCase().includes(k))) {
        return category;
      }
    }

    return 'general';
  }

  determinePriority(category, name) {
    // Higher priority for more specific/important skills
    if (name.includes('security') || name.includes('audit')) return 10;
    if (category === 'engineering') return 8;
    if (category === 'research') return 8;
    if (category === 'architecture') return 9;
    return 7;
  }

  determineModelTier(category, name) {
    if (name.includes('memory')) return 'flash_lite';
    if (category === 'architecture' || name.includes('complex')) return 'pro';
    if (category === 'research' || category === 'data') return 'flash';
    return 'inherit';
  }

  generateSkillModule(frontmatter, content, skillName) {
    const name = frontmatter.name || skillName;
    const description = frontmatter.description || 'No description available';
    const triggers = this.extractTriggers(content, name);
    const category = this.determineCategory(name, content);
    const priority = this.determinePriority(category, name);
    const modelTier = this.determineModelTier(category, name);

    return `/**
 * Skill: ${name}
 * ${description}
 * Auto-generated from SKILL.md
 */

module.exports = {
  name: '${name}',
  description: \`${description}\`,
  category: '${category}',
  triggers: ${JSON.stringify(triggers, null, 2)},
  priority: ${priority},
  modelTier: '${modelTier}',

  async execute(context) {
    const { plugin, userMessage } = context;

    plugin.memoryEngine.log('SKILL_EXECUTE', 'Executing ${name}', {
      userMessage: userMessage?.substring(0, 100)
    });

    try {
      // Execute skill workflow
      const result = await this.executeWorkflow(context);

      return {
        type: '${name}',
        success: true,
        output: result
      };
    } catch (error) {
      plugin.memoryEngine.log('SKILL_ERROR', 'Skill execution failed: ${name}', {
        error: error.message
      });

      return {
        type: '${name}',
        success: false,
        error: error.message
      };
    }
  },

  async executeWorkflow(context) {
    const { plugin, userMessage } = context;

    // Generic workflow implementation
    // TODO: Parse workflow steps from SKILL.md and implement

    return {
      message: 'Skill executed successfully',
      details: 'This is a placeholder implementation'
    };
  }
};
`;
  }

  convertSkill(skillMdPath, outputDir) {
    try {
      const content = fs.readFileSync(skillMdPath, 'utf8');
      const frontmatter = this.parseFrontmatter(content);

      if (!frontmatter) {
        console.log(`⚠️  No frontmatter in ${skillMdPath}`);
        this.failedCount++;
        return null;
      }

      const skillName = frontmatter.name || path.basename(path.dirname(skillMdPath));
      const moduleCode = this.generateSkillModule(frontmatter, content, skillName);

      const outputPath = path.join(outputDir, `${skillName}.js`);
      fs.writeFileSync(outputPath, moduleCode);

      this.convertedCount++;
      this.skills.push(skillName);

      return skillName;
    } catch (error) {
      console.log(`❌ Failed to convert ${skillMdPath}: ${error.message}`);
      this.failedCount++;
      return null;
    }
  }

  convertAllSkills(refDir, outputDir) {
    console.log('🔄 Starting skill conversion...\n');

    // Find all SKILL.md files
    const skillsDir = path.join(refDir, '.agents', 'skills');

    if (!fs.existsSync(skillsDir)) {
      console.log(`❌ Skills directory not found: ${skillsDir}`);
      return;
    }

    const skillDirs = fs.readdirSync(skillsDir);

    for (const dir of skillDirs) {
      const skillMdPath = path.join(skillsDir, dir, 'SKILL.md');

      if (fs.existsSync(skillMdPath)) {
        const skillName = this.convertSkill(skillMdPath, outputDir);
        if (skillName) {
          console.log(`✅ Converted: ${skillName}`);
        }
      }
    }

    console.log(`\n📊 Conversion Complete:`);
    console.log(`   Converted: ${this.convertedCount}`);
    console.log(`   Failed: ${this.failedCount}`);
    console.log(`   Total: ${this.convertedCount + this.failedCount}`);

    return this.skills;
  }

  generateIndex(skills, outputDir) {
    const indexCode = `/**
 * Auto-generated skill index
 * Total skills: ${skills.length}
 */

module.exports = {
${skills.map(skill => `  '${skill}': require('./${skill}'),`).join('\n')}
};
`;

    fs.writeFileSync(path.join(outputDir, 'index.js'), indexCode);
    console.log(`\n✅ Generated index.js with ${skills.length} skills`);
  }
}

// Run conversion
const converter = new SkillConverter();
const refDir = path.join(__dirname, '..', 'Ref');
const outputDir = path.join(__dirname, '..', 'core', 'powerskills', 'skills');

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const skills = converter.convertAllSkills(refDir, outputDir);
if (skills && skills.length > 0) {
  converter.generateIndex(skills, outputDir);
}
