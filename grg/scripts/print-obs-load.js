const fs = require('fs');

const obs = fs.readFileSync('/opt/fenix-os/public/observatory-client.js', 'utf8');
const start = obs.indexOf('async function loadKnowledgeView');
console.log(obs.slice(start, start + 3000));
