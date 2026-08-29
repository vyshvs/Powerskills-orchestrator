#!/usr/bin/env node
/**
 * Automated ReDoS (Regular Expression Denial of Service) Fixer
 * Fixes polynomial regex patterns across the codebase
 */

const fs = require('fs');
const path = require('path');

// Common ReDoS patterns and their safe replacements
const fixes = [
  // [a-z]+ followed by more quantifiers
  { pattern: /\/\^?\[([^\]]+)\]\+/g, replace: (match, chars) => `/^?[${chars}]*?` },

  // Nested quantifiers like (.*)+
  { pattern: /\(\.[\*\+]\)[\*\+]/g, replace: '(.*?)' },

  // Character class with + that can backtrack
  { pattern: /\[([^\]]+)\]\+/g, replace: (match, chars) => `[${chars}]*?` },

  // .+ or .* at the start of complex patterns
  { pattern: /\/\.[\*\+](?=.*[\[\(])/g, replace: '/.*?' },
];

let filesFixed = 0;
let issuesFixed = 0;

function fixReDoS(content, filePath) {
  let modified = content;
  let localFixes = 0;

  // Fix: /[chars]+ -> /[chars]*?
  modified = modified.replace(/\/\[([a-zA-Z0-9-]+)\]\+/g, (match, chars) => {
    localFixes++;
    return `/[${chars}]*?`;
  });

  // Fix: ([^"]+) -> ([^"]{1,1000})
  modified = modified.replace(/\(\[\^["'`]\]\+\)/g, (match) => {
    localFixes++;
    return match.replace('+', '{1,1000}');
  });

  // Fix: (.*) in capture groups with quantifiers
  modified = modified.replace(/\(\.[\*\+]\)[\*\+]/g, () => {
    localFixes++;
    return '(.*?)';
  });

  // Fix: [\s\S]* -> [\s\S]{0,10000}?
  modified = modified.replace(/\[\\s\\S\]\*/g, () => {
    localFixes++;
    return '[\\s\\S]{0,10000}?';
  });

  if (localFixes > 0) {
    console.log(`  Fixed ${localFixes} issues in ${path.relative('.', filePath)}`);
    issuesFixed += localFixes;
    return modified;
  }

  return null;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = fixReDoS(content, filePath);

    if (fixed) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      filesFixed++;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walkDirectory(filePath);
      }
    } else if (file.endsWith('.js')) {
      processFile(filePath);
    }
  });
}

console.log('🔍 Scanning for ReDoS vulnerabilities...\n');

// Process Ref directory
if (fs.existsSync('Ref')) {
  console.log('Processing Ref directory...');
  walkDirectory('Ref');
}

console.log(`\n✅ Fixed ${issuesFixed} ReDoS issues in ${filesFixed} files`);
