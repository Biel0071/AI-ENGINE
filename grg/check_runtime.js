const fs = require('fs');

async function check() {
  let backendPort = 4400;
  let frontendPort = 4400;
  let status = 'ONLINE';

  try {
    const health = await fetch(`http://localhost:${backendPort}/health`).then(res => res.json());
    console.log('Health:', health);
  } catch (e) {
    status = 'OFFLINE';
    console.log('Error fetching health:', e.message);
  }

  const truth = {
    frontendPort,
    backendPort,
    appRoute: 'http://localhost:4400/index.html',
    healthRoute: '/health',
    websocketRoute: 'ws://localhost:4400/events',
    qwenEndpoint: 'http://209.50.241.22 (Assumed via API)',
    jobEngine: 'GRG Server Process',
    missionKernel: 'FENIX_KERNEL inside GRG',
    processIds: [process.pid],
    status
  };

  fs.writeFileSync('../FENIX_RUNTIME_TRUTH.json', JSON.stringify(truth, null, 2));
  console.log('FENIX_RUNTIME_TRUTH.json created.');
}

setTimeout(check, 3000); // Give server a bit of time
