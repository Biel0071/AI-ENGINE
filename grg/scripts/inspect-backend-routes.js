const fs = require('fs');

const routesFile = '/opt/fenix-os/universal-system-routes.js';
if (fs.existsSync(routesFile)) {
  const content = fs.readFileSync(routesFile, 'utf8');
  const routes = [...content.matchAll(/(app|router)\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g)]
    .map(m => `${m[2].toUpperCase()} ${m[3]}`);
  console.log('Routes in universal-system-routes.js:');
  console.log(routes.join('\n'));
}

const gatewayFile = '/opt/fenix-os/frontend-gateway.js';
if (fs.existsSync(gatewayFile)) {
  const gwContent = fs.readFileSync(gatewayFile, 'utf8');
  const gwRoutes = [...gwContent.matchAll(/(app|router)\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g)]
    .map(m => `${m[2].toUpperCase()} ${m[3]}`);
  console.log('\nRoutes in frontend-gateway.js:');
  console.log(gwRoutes.join('\n'));
}
