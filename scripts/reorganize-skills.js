/**
 * Reorganize skills into subdirectories with SKILL.md files
 * Claude Code expects skills/skill-name/SKILL.md structure
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');

function main() {
  console.log('Reorganizing skills into subdirectories...\n');

  let moved = 0;
  let skipped = 0;

  // Get all root-level skill markdown files
  const files = fs.readdirSync(SKILLS_DIR);

  files.forEach(file => {
    if (!file.endsWith('.md')) return;
    if (file === 'README.md') return;

    const skillName = file.replace('.md', '');
    const sourcePath = path.join(SKILLS_DIR, file);
    const targetDir = path.join(SKILLS_DIR, skillName);
    const targetPath = path.join(targetDir, 'SKILL.md');

    // Skip if directory already exists
    if (fs.existsSync(targetDir)) {
      console.log(`⏭️  Skipped: ${skillName} (directory exists)`);
      skipped++;
      return;
    }

    // Create directory
    fs.mkdirSync(targetDir, { recursive: true });

    // Move file
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(targetPath, content, 'utf8');
    fs.unlinkSync(sourcePath);

    console.log(`✅ Moved: ${skillName}`);
    moved++;
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Moved: ${moved}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${moved + skipped}`);
}

main();
