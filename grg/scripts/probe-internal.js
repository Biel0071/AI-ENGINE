const http = require('http');

async function testFetch(url) {
  return new Promise((resolve) => {
    http.get(url, { timeout: 3000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ url, status: res.statusCode, data: d.slice(0, 50) }));
    }).on('error', err => resolve({ url, error: err.message }));
  });
}

async function main() {
  console.log(await testFetch('http://host.docker.internal:11434/api/tags'));
}
main();
