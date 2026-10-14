const fs = require('fs');

const uRoutes = fs.readFileSync('/opt/fenix-os/universal-system-routes.js', 'utf8');

// Find where routes are attached: e.g. function registerRoutes(app) or router.get
const appMatches = [...uRoutes.matchAll(/\b(?:app|router)\.(get|post|put|delete|use)\s*\(\s*['"]([^'"]+)['"]/g)];
console.log('universal-system-routes.js matched routes:', appMatches.length);
appMatches.slice(0, 50).forEach(m => console.log(m[1].toUpperCase(), m[2]));

// Also check backend server entry point
const serverFiles = ['/opt/fenix-os/server.js', '/opt/fenix-os/src/server.js', '/opt/fenix-os/grg/src/server.js'];
serverFiles.forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`\n=== Found server file: ${f} ===`);
    const c = fs.readFileSync(f, 'utf8');
    const rMatches = [...c.matchAll(/\b(?:app|router)\.(get|post|put|delete|use)\s*\(\s*['"]([^'"]+)['"]/g)];
    console.log(`Routes in ${f}:`, rMatches.length);
    rMatches.slice(0, 30).forEach(m => console.log(m[1].toUpperCase(), m[2]));
  }
});
