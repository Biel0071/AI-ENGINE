const { execSync } = require('child_process');
const fs = require('fs');

const branches = [
  'main',
  'master',
  'vps-rescue',
  'fenix/stabilize-canonical-frontend',
  'fenix/finalization-real-ai-platform',
  'feat/fenix-rc20-reality-first-flows',
  'feature/executive-brain-rc2',
  'feature/executive-brain-real',
  'feature/fenix-living-organism-foundation'
];

const results = [];

for (const branch of branches) {
  try {
    const commitLog = execSync(`git log -1 --format="%H|%cI|%s" ${branch}`).toString().trim().split('|');
    const files = execSync(`git ls-tree -r --name-only ${branch}`).toString().trim().split('\n');
    
    // Find interesting files
    const interesting = files.filter(f => f.match(/index\.html|unified-app\.js|runtime-cockpit\.js|iso-city\.js|live-runtime\.js|ai-city|agents|jobs|memory|rag|playwright/i));
    
    results.push({
      branch,
      commit: commitLog[0],
      date: commitLog[1],
      message: commitLog[2],
      interestingFiles: interesting
    });
  } catch (e) {
    console.error(`Error on branch ${branch}:`, e.message);
  }
}

fs.writeFileSync('FENIX_BRANCH_MAP.json', JSON.stringify(results, null, 2));
console.log('Archeology complete. Saved to FENIX_BRANCH_MAP.json');
