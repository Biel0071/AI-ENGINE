const fs = require('fs');

const f1 = '/opt/fenix-os/FENIX_FRONTEND_BROWSER_CERTIFICATION.md';
if (fs.existsSync(f1)) {
  console.log('=== FENIX_FRONTEND_BROWSER_CERTIFICATION.md ===');
  console.log(fs.readFileSync(f1, 'utf8'));
} else {
  console.log('File 1 not found');
}

const f2 = '/opt/fenix-os/FENIX_EVOLUTION_METRICS.md';
if (fs.existsSync(f2)) {
  console.log('=== FENIX_EVOLUTION_METRICS.md ===');
  console.log(fs.readFileSync(f2, 'utf8'));
} else {
  console.log('File 2 not found');
}
