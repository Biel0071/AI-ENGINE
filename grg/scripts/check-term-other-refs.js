const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

['gitCloneForm', 'aiEditBtn', 'movePathBtn', 'devAgentBtn'].forEach(id => {
  const matches = [...html.matchAll(new RegExp(id, 'g'))];
  console.log(`Matches for ${id}:`, matches.length);
});
