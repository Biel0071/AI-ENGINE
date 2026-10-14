const fs = require('fs');

const file = '/opt/fenix-os/grg/src/api/universal-system-routes.js';
if (fs.existsSync(file)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log(lines.slice(1675, 1715).join('\n'));
} else {
  console.log('File not found:', file);
}
