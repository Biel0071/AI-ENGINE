const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const target = 'switchObservatoryTab =';
const idx = html.indexOf(target);
console.log('switchObservatoryTab definition at:', idx);
if (idx !== -1) {
  console.log(html.slice(idx - 20, idx + 1500));
}
