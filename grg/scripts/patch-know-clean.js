const fs = require('fs');

const file = '/opt/fenix-os/public/index.html';
let html = fs.readFileSync(file, 'utf8');

// 1. Ensure <div id="skKnowledgeApiStatus"></div> is in #view-knowledge header
if (!html.includes('id="skKnowledgeApiStatus"')) {
  const headerEnd = '</header>';
  const viewKnowIdx = html.indexOf('id="view-knowledge"');
  const headerIdx = html.indexOf(headerEnd, viewKnowIdx);
  if (headerIdx !== -1) {
    const insertPos = headerIdx + headerEnd.length;
    html = html.slice(0, insertPos) + '\n          <div id="skKnowledgeApiStatus" style="margin-top:14px;"></div>' + html.slice(insertPos);
    console.log('Added #skKnowledgeApiStatus container to index.html');
  }
}

// 2. Replace loadKnowledgeView
const oldStart = 'window.loadKnowledgeView = async function() {';
const oldEnd = '  // 5. MCP Hub View Loader';

const startIdx = html.indexOf(oldStart);
const endIdx = html.indexOf(oldEnd, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find loadKnowledgeView boundaries');
  process.exit(1);
}

const templatePath = process.argv[2] || '/tmp/knowledge-loader-template.js';
const newLoader = fs.readFileSync(templatePath, 'utf8') + '\n\n';

html = html.slice(0, startIdx) + newLoader + html.slice(endIdx);
fs.writeFileSync(file, html, 'utf8');
console.log('Successfully patched loadKnowledgeView in index.html!');
