const http = require('http');

http.get('http://127.0.0.1:3000/api/v2/reality/summary', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const json = JSON.parse(d);
    console.log('reality.dockerContainers:', json.dockerContainers?.length, json.dockerContainers?.[0]);
    console.log('reality.pm2Processes:', json.pm2Processes?.length, json.pm2Processes?.[0]);
    console.log('reality.hostTelemetry:', json.hostTelemetry);
  });
});

http.get('http://127.0.0.1:3000/api/v2/runtime/full-status', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const json = JSON.parse(d);
    console.log('runtime.services:', Object.keys(json.services || {}));
    console.log('runtime.overall:', json.overall);
  });
});
