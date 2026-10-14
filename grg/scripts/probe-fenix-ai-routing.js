'use strict';
const { execFileSync } = require('node:child_process');
const { buildProvidersFromEnv, loadRoutes } = require('/opt/fenix-os/grg/src/ai-runtime/provider-registry');

async function main() {
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 5000 }));
  const env = processes.find((entry) => entry.name === 'fenix-backend')?.pm2_env || {};
  const providers = buildProvidersFromEnv(env, { production: true });
  const routes = loadRoutes(env, { production: true });
  const available = providers.aiplatform ? await providers.aiplatform.availableFast() : false;
  console.log(JSON.stringify({ providers: Object.keys(providers), routes, apiPlatformAvailable: available }));
  if (!available) process.exitCode = 2;
}
main().catch((error) => { console.error(JSON.stringify({ reason: String(error.message || error).slice(0, 150) })); process.exitCode = 2; });
