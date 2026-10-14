const fs = require('fs');

const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

function findMatches(pattern) {
  const matches = [];
  let m;
  while ((m = pattern.exec(html)) !== null) {
    matches.push({ index: m.index, text: m[0], context: html.slice(Math.max(0, m.index - 50), Math.min(html.length, m.index + 200)) });
  }
  return matches;
}

console.log('=== dispatchLoader full context ===');
const dispatchIdx = html.indexOf('const dispatchLoader =');
if (dispatchIdx !== -1) {
  console.log(html.slice(dispatchIdx - 50, dispatchIdx + 1200));
}

console.log('\n=== loadCityView occurrences ===');
console.log(findMatches(/loadCityView/g));

console.log('\n=== loadIdeView occurrences ===');
console.log(findMatches(/loadIdeView/g));

console.log('\n=== loadTerminalView occurrences ===');
console.log(findMatches(/loadTerminalView/g));

console.log('\n=== loadInfrastructureView occurrences ===');
console.log(findMatches(/loadInfrastructureView/g));

console.log('\n=== loadKnowledgeView occurrences ===');
console.log(findMatches(/loadKnowledgeView/g));
