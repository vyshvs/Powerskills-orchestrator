/**
 * Agent Template Converter
 * Converts YAML agent definitions to JSON templates
 */

const fs = require('fs');
const path = require('path');

class AgentTemplateConverter {
  constructor() {
    this.convertedCount = 0;
    this.templates = {};
  }

  parseYamlSimple(content) {
    // Simple YAML parser for agent templates
    const lines = content.split('\n');
    const template = {};
    let currentKey = null;
    let currentValue = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('#') || trimmed === '') continue;

      if (trimmed.includes(':')) {
        if (currentKey && currentValue) {
          template[currentKey] = currentValue.trim();
        }

        const [key, ...valueParts] = trimmed.split(':');
        currentKey = key.trim();
        currentValue = valueParts.join(':').trim();
      } else if (currentKey) {
        currentValue += ' ' + trimmed;
      }
    }

    if (currentKey && currentValue) {
      template[currentKey] = currentValue.trim();
    }

    return template;
  }

  convertTemplate(yamlPath, skillName) {
    try {
      const content = fs.readFileSync(yamlPath, 'utf8');
      const parsed = this.parseYamlSimple(content);

      const template = {
        name: skillName,
        description: parsed.description || `Agent for ${skillName}`,
        model: this.determineModel(skillName, parsed),
        systemPrompt: parsed.prompt || parsed.systemPrompt || `You are an expert in ${skillName}.`,
        capabilities: this.extractCapabilities(skillName, content),
        maxTokens: parseInt(parsed.maxTokens) || 4096,
        temperature: parseFloat(parsed.temperature) || 0.5
      };

      this.templates[skillName] = template;
      this.convertedCount++;

      return template;
    } catch (error) {
      console.log(`⚠️  Failed to convert ${yamlPath}: ${error.message}`);
      return null;
    }
  }

  determineModel(skillName, parsed) {
    if (skillName.includes('memory')) return 'claude-haiku-4.5';
    if (parsed.model) return parsed.model;
    if (skillName.includes('architecture') || skillName.includes('complex')) return 'claude-opus-5';
    if (skillName.includes('research') || skillName.includes('simple')) return 'claude-haiku-4.5';
    return 'claude-sonnet-5';
  }

  extractCapabilities(skillName, content) {
    const capabilities = [];

    const words = skillName.split('-');
    capabilities.push(...words);

    if (content.includes('review')) capabilities.push('review');
    if (content.includes('research')) capabilities.push('research');
    if (content.includes('design')) capabilities.push('design');
    if (content.includes('implement')) capabilities.push('implementation');
    if (content.includes('test')) capabilities.push('testing');

    return [...new Set(capabilities)];
  }

  convertAllTemplates(refDir) {
    console.log('🔄 Starting agent template conversion...\n');

    const skillsDir = path.join(refDir, '.agents', 'skills');

    if (!fs.existsSync(skillsDir)) {
      console.log(`❌ Skills directory not found: ${skillsDir}`);
      return;
    }

    const skillDirs = fs.readdirSync(skillsDir);

    for (const dir of skillDirs) {
      const yamlPath = path.join(skillsDir, dir, 'agents', 'openai.yaml');

      if (fs.existsSync(yamlPath)) {
        const template = this.convertTemplate(yamlPath, dir);
        if (template) {
          console.log(`✅ Converted template: ${dir}`);
        }
      }
    }

    console.log(`\n📊 Template Conversion Complete:`);
    console.log(`   Converted: ${this.convertedCount}`);
    console.log(`   Total: ${Object.keys(this.templates).length}`);

    return this.templates;
  }

  saveTemplates(templates, outputPath) {
    const templateCode = `/**
 * Auto-generated agent templates
 * Total templates: ${Object.keys(templates).length}
 */

module.exports = ${JSON.stringify(templates, null, 2)};
`;

    fs.writeFileSync(outputPath, templateCode);
    console.log(`\n✅ Saved agent templates to ${outputPath}`);
  }
}

// Run conversion
const converter = new AgentTemplateConverter();
const refDir = path.join(__dirname, '..', 'Ref');
const outputPath = path.join(__dirname, '..', 'core', 'powerskills', 'agent-templates-converted.js');

const templates = converter.convertAllTemplates(refDir);
if (templates && Object.keys(templates).length > 0) {
  converter.saveTemplates(templates, outputPath);
}
