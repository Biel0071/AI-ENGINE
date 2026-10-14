const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

function findAndPrint(name) {
  let idx = 0;
  while ((idx = html.indexOf(name, idx)) !== -1) {
    console.log(`\n=== Occurrence of ${name} at ${idx} ===`);
    console.log(html.slice(Math.max(0, idx - 100), Math.min(html.length, idx + 1200)));
    idx += name.length;
  }
}

findAndPrint('updateV9CityStatus');
findAndPrint('initV9City');
