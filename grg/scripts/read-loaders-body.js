const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

function printFunction(name, startPattern, endPattern) {
  const startIdx = html.indexOf(startPattern);
  if (startIdx === -1) {
    console.log(`Could not find ${startPattern}`);
    return;
  }
  const endIdx = endPattern ? html.indexOf(endPattern, startIdx) : startIdx + 3000;
  console.log(`\n=================== ${name} ===================`);
  console.log(html.slice(startIdx, endIdx !== -1 ? endIdx : startIdx + 3000));
}

printFunction('loadIdeView', 'window.loadIdeView = async function()', 'window.ideOpenFile =');
printFunction('loadTerminalView', 'window.loadTerminalView = async function()', 'if (fileSaveBtn)');
printFunction('loadKnowledgeView', 'window.loadKnowledgeView = async function()', 'window.loadMcpView =');
printFunction('loadInfrastructureView', 'window.loadInfrastructureView = async function()', 'window.loadVisualQaDashboard =');
