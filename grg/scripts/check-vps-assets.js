const fs = require('fs');
const http = require('http');

const html = fs.readFileSync('public/index.html', 'utf8');
const regex = /(?:href|src)=["'](\/[^"']+)["']/g;
const links = [];
let match;
while ((match = regex.exec(html)) !== null) {
  links.push(match[1]);
}
console.log('Total local resources linked in index.html:', links.length);

Promise.all(links.map(f => new Promise(resolve => {
  http.get('http://209.50.241.22:3000' + f, (res) => {
    resolve({ file: f, status: res.statusCode, type: res.headers['content-type'], length: res.headers['content-length'] });
  }).on('error', err => resolve({ file: f, error: err.message }));
}))).then(results => {
  const bad = results.filter(r => r.type && r.type.includes('text/html') && !r.file.endsWith('.html'));
  console.log('BAD RESOURCES (Returning HTML instead of asset):', bad);
  const good = results.filter(r => !r.type || !r.type.includes('text/html'));
  console.log('GOOD RESOURCES count:', good.length);
});
