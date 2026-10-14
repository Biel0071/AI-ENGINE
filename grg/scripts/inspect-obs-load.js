const fs = require('fs');

const obs = fs.readFileSync('/opt/fenix-os/public/observatory-client.js', 'utf8');
console.log('observatory-client.js length:', obs.length);

const loadKnowledgeIdx = obs.indexOf('async function loadKnowledgeView');
console.log(obs.slice(loadKnowledgeIdx, loadKnowledgeIdx + 2000));
