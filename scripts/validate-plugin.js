#!/usr/bin/env node
/**
 * Plugin install validator
 *
 * Checks the repo against Claude Code plugin requirements so install
 * failures can be caught locally instead of in the UI.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NAME_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

const errors = [];
const warnings = [];
const passed = [];

function readJson(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing required file: ${rel}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    errors.push(`${rel} is not valid JSON: ${err.message}`);
    return null;
  }
}

function parseFrontmatter(abs) {
  // Normalize CRLF so frontmatter parses identically on Windows and POSIX.
  const raw = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n').replace(/^﻿/, '');
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return null;

  const body = raw.slice(3, end);
  const fields = {};
  for (const line of body.split('\n')) {
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (match) {
      fields[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return fields;
}

// 1. plugin.json
const plugin = readJson('.claude-plugin/plugin.json');
if (plugin) {
  if (!plugin.name) {
    errors.push('.claude-plugin/plugin.json: "name" is required');
  } else if (!NAME_RE.test(plugin.name)) {
    errors.push(
      `.claude-plugin/plugin.json: "name" must be kebab-case ` +
      `(lowercase letters, digits, - or _). Got: "${plugin.name}"`
    );
  } else {
    passed.push(`plugin name valid: ${plugin.name}`);
  }

  if (plugin.author && typeof plugin.author !== 'string' && !plugin.author.name) {
    errors.push('.claude-plugin/plugin.json: "author" object requires a "name" field');
  }

  if (Array.isArray(plugin.agents)) {
    for (const entry of plugin.agents) {
      if (typeof entry !== 'string') {
        errors.push(
          '.claude-plugin/plugin.json: "agents" must be an array of path strings, not objects'
        );
        break;
      }
    }
  }
}

// 2. marketplace.json
const marketplace = readJson('.claude-plugin/marketplace.json');
if (marketplace) {
  if (!marketplace.name || !NAME_RE.test(marketplace.name)) {
    errors.push(
      `.claude-plugin/marketplace.json: "name" must be kebab-case. Got: "${marketplace.name}"`
    );
  }
  if (!marketplace.owner || !marketplace.owner.name) {
    errors.push('.claude-plugin/marketplace.json: "owner.name" is required');
  }
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    errors.push('.claude-plugin/marketplace.json: "plugins" must be a non-empty array');
  } else {
    marketplace.plugins.forEach((entry, i) => {
      const label = `marketplace.json plugins[${i}]`;
      if (!entry.name || !NAME_RE.test(entry.name)) {
        errors.push(`${label}: "name" must be kebab-case. Got: "${entry.name}"`);
      }
      if (!entry.source) {
        errors.push(`${label}: "source" is required`);
      }
      if (plugin && entry.source === './' && entry.name !== plugin.name) {
        errors.push(
          `${label}: name "${entry.name}" must match plugin.json name "${plugin.name}"`
        );
      }
    });
    if (errors.length === 0) passed.push('marketplace entries valid');
  }
}

// 3. Skills
const skillsDir = path.join(ROOT, 'skills');
if (fs.existsSync(skillsDir)) {
  const dirs = fs.readdirSync(skillsDir).filter((d) =>
    fs.statSync(path.join(skillsDir, d)).isDirectory()
  );

  for (const dir of dirs) {
    const skillFile = path.join(skillsDir, dir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) {
      errors.push(`skills/${dir}: missing SKILL.md`);
      continue;
    }
    const fm = parseFrontmatter(skillFile);
    if (!fm) {
      errors.push(`skills/${dir}/SKILL.md: missing YAML frontmatter`);
    } else if (!fm.name || !fm.description) {
      errors.push(`skills/${dir}/SKILL.md: frontmatter needs both "name" and "description"`);
    } else if (!NAME_RE.test(fm.name)) {
      errors.push(`skills/${dir}/SKILL.md: name "${fm.name}" must be kebab-case`);
    }
  }
  passed.push(`${dirs.length} skill(s) checked`);
}

// 4. Agents
const agentsDir = path.join(ROOT, 'agents');
if (fs.existsSync(agentsDir)) {
  const files = fs.readdirSync(agentsDir).filter(
    (f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md'
  );

  for (const file of files) {
    const fm = parseFrontmatter(path.join(agentsDir, file));
    if (!fm) {
      errors.push(`agents/${file}: missing YAML frontmatter (needs name + description)`);
    } else if (!fm.name || !fm.description) {
      errors.push(`agents/${file}: frontmatter needs both "name" and "description"`);
    } else if (!NAME_RE.test(fm.name)) {
      errors.push(`agents/${file}: name "${fm.name}" must be kebab-case`);
    }
  }
  passed.push(`${files.length} agent(s) checked`);
}

// 5. Version consistency
if (plugin) {
  const pkg = readJson('package.json');
  if (pkg && pkg.version !== plugin.version) {
    warnings.push(
      `Version mismatch: package.json ${pkg.version} vs plugin.json ${plugin.version}`
    );
  }
}

// Report
console.log('\nPlugin validation\n' + '='.repeat(50));
for (const p of passed) console.log(`  ok    ${p}`);
for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  FAIL  ${e}`);

console.log('='.repeat(50));
if (errors.length > 0) {
  console.log(`${errors.length} error(s) — plugin will fail to install.\n`);
  process.exit(1);
}
console.log(`Passed${warnings.length ? ` with ${warnings.length} warning(s)` : ''}. Plugin is installable.\n`);
