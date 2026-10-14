const fs = require('fs');

const obs = fs.readFileSync('/opt/fenix-os/public/observatory-client.js', 'utf8');
const start = obs.indexOf('async function loadKnowledgeView');
const end = obs.indexOf('window.switchObservatoryTab', start);

console.log('start:', start, 'end:', end);
console.log(obs.slice(start, end));
