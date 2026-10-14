const fs = require('fs');
const path = require('path');

const dir = '/opt/fenix-os/public';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

console.log('JS files in public:', files);
for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  if (content.includes('initV9City') || content.includes('updateV9CityStatus') || content.includes('loadCityView')) {
    console.log(`Found in ${f}`);
  }
}
