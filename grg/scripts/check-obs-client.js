const fs = require('fs');
const path = '/opt/fenix-os/public/observatory-client.js';
if (fs.existsSync(path)) {
  console.log(fs.readFileSync(path, 'utf8').slice(0, 1500));
} else {
  console.log('File does not exist');
}
