const fs = require('fs');
const path = require('path');

function walk(dir, arr = []) {
  try {
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      try {
        const s = fs.statSync(fp);
        if (s.isDirectory() && !['node_modules', '.git', 'coverage', 'public'].includes(f)) {
          walk(fp, arr);
        } else if (f.endsWith('.js')) {
          arr.push(fp);
        }
      } catch (e) {}
    }
  } catch (e) {}
  return arr;
}

const srcDir = path.join(__dirname, '..', 'src');
const files = walk(srcDir);

let todos = [], fixmes = [], mocks = [], simulated = [], brokenRequires = [];
let allRequires = {};

files.forEach(fp => {
  try {
    const src = fs.readFileSync(fp, 'utf8');
    const lines = src.split('\n');
    const relPath = fp.replace(srcDir + path.sep, '');

    lines.forEach((l, i) => {
      const loc = relPath + '#L' + (i + 1);
      if (/\bTODO\b/.test(l)) todos.push(loc + ' :: ' + l.trim().substring(0, 80));
      if (/\bFIXME\b/.test(l)) fixmes.push(loc + ' :: ' + l.trim().substring(0, 80));
      if (/Simulated|SIMULATED/.test(l) && !l.trim().startsWith('*') && !l.trim().startsWith('//')) {
        simulated.push(loc + ' :: ' + l.trim().substring(0, 80));
      }
      if (/mock data|MOCK_DATA|placeholder/i.test(l)) {
        mocks.push(loc + ' :: ' + l.trim().substring(0, 80));
      }
    });

    // Check requires
    const requirePattern = /require\(['"]([^'"]+)['"]\)/g;
    let m;
    while ((m = requirePattern.exec(src)) !== null) {
      const dep = m[1];
      if (dep.startsWith('.')) {
        const depPath = path.resolve(path.dirname(fp), dep);
        const exists = fs.existsSync(depPath) || fs.existsSync(depPath + '.js') || fs.existsSync(depPath + '/index.js');
        if (!exists) {
          brokenRequires.push({ file: relPath, require: dep, resolved: depPath });
        }
      }
    }
  } catch (e) {}
});

const report = {
  totalFiles: files.length,
  todos: { count: todos.length, items: todos.slice(0, 50) },
  fixmes: { count: fixmes.length, items: fixmes.slice(0, 20) },
  simulated: { count: simulated.length, items: simulated.slice(0, 40) },
  mocks: { count: mocks.length, items: mocks.slice(0, 20) },
  brokenRequires: { count: brokenRequires.length, items: brokenRequires.slice(0, 30) }
};

fs.writeFileSync(path.join(__dirname, 'scan-report.json'), JSON.stringify(report, null, 2));
console.log('SCAN COMPLETE');
console.log('Files:', report.totalFiles);
console.log('TODOs:', report.todos.count);
console.log('FIXMEs:', report.fixmes.count);
console.log('Simulated:', report.simulated.count);
console.log('Mocks:', report.mocks.count);
console.log('Broken requires:', report.brokenRequires.count);
console.log('\n--- SIMULATED (mocks to fix) ---');
report.simulated.items.forEach(s => console.log(' ', s));
console.log('\n--- BROKEN REQUIRES ---');
report.brokenRequires.items.forEach(b => console.log(' ', b.file, '->', b.require));
