const fs = require('fs');
const files = fs.readdirSync('/tmp/fenix_v2_shots');
console.log('Certified screenshots in /tmp/fenix_v2_shots:');
files.forEach(f => {
  const stat = fs.statSync('/tmp/fenix_v2_shots/' + f);
  console.log(`- ${f} (${stat.size} bytes, modified: ${stat.mtime.toISOString()})`);
});
