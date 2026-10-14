const http = require('http');

http.get('http://127.0.0.1:3000/api/v2/reality/summary', res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('Status:', res.statusCode, 'Data:', data.slice(0, 300)));
}).on('error', e => console.error('Error:', e.message));

http.get('http://127.0.0.1:4410/api/v2/reality/summary', res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('Backend 4410 Status:', res.statusCode, 'Data:', data.slice(0, 300)));
}).on('error', e => console.error('Backend 4410 Error:', e.message));
