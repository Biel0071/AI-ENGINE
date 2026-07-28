const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testDir = path.join(__dirname, '..', 'test');
const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.js'));
const nodePath = 'C:\\projetos\\ZAPAI-FINAL\\node.exe';

let total = 0;
let passed = 0;
let failed = 0;
const failedFiles = [];

for (const file of files) {
  total++;
  const fullPath = path.join(testDir, file);
  try {
    execSync(`"${nodePath}" --test "${fullPath}"`, { stdio: 'pipe' });
    passed++;
  } catch (err) {
    failed++;
    failedFiles.push({ file, output: err.stdout?.toString() || err.stderr?.toString() || err.message });
  }
}

console.log(`\n========================================`);
console.log(`TEST SUMMARY: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================\n`);

if (failedFiles.length > 0) {
  console.log('FAILED FILES:');
  for (const f of failedFiles) {
    console.log(`- ${f.file}:`);
    console.log(f.output.slice(-500));
  }
  process.exit(1);
} else {
  console.log('ALL TEST FILES PASSED CLEANLY (100%)!');
  process.exit(0);
}
