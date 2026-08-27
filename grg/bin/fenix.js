#!/usr/bin/env node
const { FenixHttpClient } = require('../src/clients/fenix-http-client');

function option(args, name, fallback = null) {
  const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : fallback;
}
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }

async function main(args = process.argv.slice(2), client = new FenixHttpClient()) {
  const [group, action, value] = args;
  if (group === 'status' || group === 'doctor') return print(await client.status());
  if (group !== 'job') throw new Error('usage: fenix job <submit|get|events|cancel|approve|reject|rollback> ... | fenix status');
  if (action === 'submit') {
    if (!value) throw new Error('usage: fenix job submit "prompt" [--workspace PATH] [--risk LEVEL]');
    return print(await client.submit({
      prompt: value, source: option(args, 'source', 'cli'), workspace: option(args, 'workspace'),
      repository: option(args, 'repository'), branch: option(args, 'branch'), riskLevel: option(args, 'risk', 'MEDIUM'),
    }));
  }
  if (!value) throw new Error(`job id is required for ${action || 'command'}`);
  if (action === 'get') return print(await client.get(value));
  if (action === 'events') return print(await client.events(value));
  if (action === 'cancel') return print(await client.cancel(value));
  if (action === 'approve') return print(await client.approve(value));
  if (action === 'reject') return print(await client.reject(value, option(args, 'reason')));
  if (action === 'rollback') return print(await client.rollback(value));
  throw new Error(`unknown job command: ${action}`);
}

if (require.main === module) main().catch((error) => { process.stderr.write(`fenix: ${error.message}\n`); process.exitCode = 1; });
module.exports = { main, option };
