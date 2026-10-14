const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const funcs = ['switchObservatoryTab', 'skProjectTwinsList', 'skScreenTwinsList', 'askSelfKnowledge'];
funcs.forEach(name => {
  const idx = html.indexOf(name);
  console.log(`=== ${name} at ${idx} ===`);
  if (idx !== -1) {
    console.log(html.slice(idx, idx + 800));
  }
});
