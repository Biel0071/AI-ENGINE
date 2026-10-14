const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:4400/events', {
  headers: {
    'x-tenant-id': 'grg',
    'x-user-id': 'grg-admin'
  }
});

ws.on('open', function open() {
  console.log('connected');
  // Trigger a test event via HTTP to see if it is broadcasted over WS
  const http = require('http');
  const req = http.request({
    hostname: '127.0.0.1',
    port: 4400,
    path: '/api/test/event',
    method: 'POST',
    headers: {
      'x-tenant-id': 'grg',
      'x-user-id': 'grg-admin',
      'Content-Type': 'application/json'
    }
  }, (res) => {
    console.log('test event HTTP status:', res.statusCode);
  });
  req.write(JSON.stringify({ type: 'test.broadcast' }));
  req.end();
});

ws.on('message', function message(data) {
  console.log('received: %s', data);
  try {
    const msg = JSON.parse(data);
    if (msg.type === 'test.broadcast') {
      console.log('Successfully received broadcast event over WebSocket!');
      process.exit(0);
    }
  } catch(e) {}
});

ws.on('close', function close() {
  console.log('disconnected');
});

ws.on('error', function error(err) {
  console.error('error:', err);
});
