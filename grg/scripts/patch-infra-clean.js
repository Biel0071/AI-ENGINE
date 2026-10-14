const fs = require('fs');

const file = '/opt/fenix-os/public/index.html';
let html = fs.readFileSync(file, 'utf8');

const oldStart = 'window.loadInfrastructureView = async function() {';
const oldEnd = '  // Real Job Details Modal';

const startIdx = html.indexOf(oldStart);
const endIdx = html.indexOf(oldEnd, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find loadInfrastructureView boundaries in index.html');
  process.exit(1);
}

const templatePath = process.argv[2] || '/tmp/infra-loader-template.js';
const newLoader = fs.readFileSync(templatePath, 'utf8') + '\n\n';

html = html.slice(0, startIdx) + newLoader + html.slice(endIdx);
fs.writeFileSync(file, html, 'utf8');
console.log('Successfully patched loadInfrastructureView in index.html!');
