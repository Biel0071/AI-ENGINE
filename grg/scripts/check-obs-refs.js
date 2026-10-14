const fs = require('fs');

const obs = fs.readFileSync('/opt/fenix-os/public/observatory-client.js', 'utf8');

['kosManifest', 'kgList', 'skKnowledgeApiStatus', 'loadTerminalView', 'terminalBtn', 'terminalCmd'].forEach(term => {
  const matches = [...obs.matchAll(new RegExp(term, 'g'))];
  console.log(`Matches for ${term} in observatory-client.js:`, matches.length);
});

