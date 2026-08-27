#!/usr/bin/env node
const readline = require('node:readline');
const { FenixHttpClient } = require('../src/clients/fenix-http-client');

const TOOLS = [
  tool('fenix_submit_job', 'Submit a prompt/job to the canonical FENIX queue', { prompt: str(true), source: str(), workspace: str(), repository: str(), branch: str(), riskLevel: str() }),
  tool('fenix_get_job', 'Get the persisted state of a FENIX job', { jobId: str(true) }),
  tool('fenix_get_job_events', 'Get the durable event stream of a FENIX job', { jobId: str(true) }),
  tool('fenix_get_system_status', 'Get real FENIX API, infrastructure, workers and provider status', {}),
  tool('fenix_cancel_job', 'Request safe cancellation of a FENIX job', { jobId: str(true) }),
  tool('fenix_approve_job', 'Approve a HIGH/CRITICAL FENIX job as a separate approver', { jobId: str(true) }),
  tool('fenix_reject_job', 'Reject a HIGH/CRITICAL FENIX job', { jobId: str(true), reason: str() }),
  tool('fenix_rollback_job', 'Remove the isolated worktree and mark a FENIX job rolled back', { jobId: str(true) }),
  tool('fenix_project_map', 'Get the FENIX Project Mirror map (files, routes, APIs, screens)', {}),
  tool('fenix_get_screen', 'Get details of a specific UI screen (components, APIs)', { name: str(true) }),
  tool('fenix_generate_screen', 'Submit a job to generate a new screen from prompt', { prompt: str(true) }),
  tool('fenix_get_context', 'Get the active system and project context', {}),
];

function str(required = false) { return { type: 'string', ...(required ? { required: true } : {}) }; }
function tool(name, description, properties) {
  const required = Object.entries(properties).filter(([, spec]) => spec.required).map(([key]) => key);
  return { name, description, inputSchema: { type: 'object', properties: Object.fromEntries(Object.entries(properties).map(([key, spec]) => [key, { type: spec.type }])), ...(required.length ? { required } : {}), additionalProperties: false } };
}
function result(value) { return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }; }

async function callTool(client, name, args = {}) {
  if (name === 'fenix_submit_job') return client.submit({ ...args, source: args.source || 'mcp' });
  if (name === 'fenix_get_job') return client.get(args.jobId);
  if (name === 'fenix_get_job_events') return client.events(args.jobId);
  if (name === 'fenix_get_system_status') return client.status();
  if (name === 'fenix_cancel_job') return client.cancel(args.jobId);
  if (name === 'fenix_approve_job') return client.approve(args.jobId);
  if (name === 'fenix_reject_job') return client.reject(args.jobId, args.reason);
  if (name === 'fenix_rollback_job') return client.rollback(args.jobId);
  if (name === 'fenix_project_map') return client.projectMap();
  if (name === 'fenix_get_screen') return client.getScreen(args.name);
  if (name === 'fenix_generate_screen') return client.generateScreen(args);
  if (name === 'fenix_get_context') return { project: await client.projectMap().catch(()=>({})), status: await client.status().catch(()=>({})) };
  throw new Error(`unknown MCP tool: ${name}`);
}

async function handleRpc(message, client) {
  if (message.method === 'initialize') return { jsonrpc: '2.0', id: message.id, result: { protocolVersion: message.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fenix-universal-orchestrator', version: '1.0.0' } } };
  if (message.method === 'notifications/initialized') return null;
  if (message.method === 'tools/list') return { jsonrpc: '2.0', id: message.id, result: { tools: TOOLS } };
  if (message.method === 'tools/call') {
    try { return { jsonrpc: '2.0', id: message.id, result: result(await callTool(client, message.params?.name, message.params?.arguments || {})) }; }
    catch (error) { return { jsonrpc: '2.0', id: message.id, result: { ...result({ error: error.message }), isError: true } }; }
  }
  return { jsonrpc: '2.0', id: message.id ?? null, error: { code: -32601, message: `Method not found: ${message.method}` } };
}

async function main(client = new FenixHttpClient()) {
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    if (!line.trim()) continue;
    let response;
    try { response = await handleRpc(JSON.parse(line), client); }
    catch (error) { response = { jsonrpc: '2.0', id: null, error: { code: -32700, message: error.message } }; }
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}

if (require.main === module) main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
module.exports = { TOOLS, callTool, handleRpc, main };
