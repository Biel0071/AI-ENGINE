'use strict';

// Exercises the authenticated City → agent/project conversation contract on VPS.
// Secrets remain in the process and are never logged.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const configured = Object.fromEntries(fs.readFileSync('/opt/fenix-os/grg/.env', 'utf8').split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [match[1], match[2].replace(/^['"]|['"]$/g, '')] : [];
}).filter((item) => item.length === 2));
const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 8000 }));
const env = { ...configured, ...(processes.find((item) => item.name === 'fenix-backend')?.pm2_env || {}) };
const base = 'http://127.0.0.1:4410';

async function main() {
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }), signal: AbortSignal.timeout(12000) });
  const session = await login.json();
  if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  const headers = { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' };
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(15000), ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(`${path} HTTP ${response.status}: ${String(data.error || data.message || 'unknown').slice(0, 120)}`);
    return data;
  };
  try {
    const city = await request('/api/v2/living-city/state');
    const agent = city.agents.find((item) => item.id);
    const project = city.projects.find((item) => item.id);
    if (!agent || !project) throw new Error('City has no registered agent or project');
    const created = await request('/api/chat/conversations', { method: 'POST', body: JSON.stringify({ agentId: agent.id, projectId: project.id, title: 'Verificação Cidade' }) });
    const list = await request('/api/chat/conversations');
    const history = await request(`/api/chat/conversations/${encodeURIComponent(created.id)}`);
    const linked = list.conversations.find((item) => item.id === created.id);
    const streamResponse = await fetch(`${base}/api/chat/stream`, {
      method: 'POST', headers: { ...headers, accept: 'text/event-stream' },
      body: JSON.stringify({ conversationId: created.id, agentId: agent.id, projectId: project.id, message: 'Em uma frase, diga que recebeu esta verificação.' }),
      signal: AbortSignal.timeout(40000),
    });
    const streamBody = await streamResponse.text();
    const eventNames = [...streamBody.matchAll(/^event:\s*([^\r\n]+)/gm)].map((match) => match[1]);
    const routing = [...streamBody.matchAll(/^event:\s*routing\s*\r?\ndata:\s*(\{[^\r\n]+\})/gm)].map((match) => JSON.parse(match[1]));
    const streamErrorMatch = streamBody.match(/^event:\s*error\s*\r?\ndata:\s*(\{[^\r\n]+\})/m);
    const streamError = streamErrorMatch ? String(JSON.parse(streamErrorMatch[1]).message || 'stream error').slice(0, 160) : null;
    const jobMatch = streamBody.match(/^event:\s*job\s*\r?\ndata:\s*(\{[^\r\n]+\})/m);
    const platformJobId = jobMatch ? JSON.parse(jobMatch[1]).jobId : null;
    let platformJobStatus = null;
    if (platformJobId) {
      const platformJob = await request(`/api/chat/jobs/${encodeURIComponent(platformJobId)}`);
      platformJobStatus = platformJob.status || null;
    }
    const after = await request(`/api/chat/conversations/${encodeURIComponent(created.id)}`);
    const ok = linked?.agentId === agent.id && linked?.projectId === project.id && Array.isArray(history.messages)
      && streamResponse.ok && eventNames.includes('done') && (eventNames.includes('token') || Boolean(platformJobId))
      && after.messages.some((item) => item.role === 'user') && after.messages.some((item) => item.role === 'assistant');
    console.log(JSON.stringify({ ok, conversationId: created.id, agentId: agent.id, projectId: project.id, eventNames, routing, streamError, platformJobId, platformJobStatus, historyCount: after.messages?.length }));
    if (!ok) process.exitCode = 2;
  } finally {
    await fetch(`${base}/api/logout`, { method: 'POST', headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}
main().catch((error) => { console.error(JSON.stringify({ ok: false, reason: String(error.message || error).slice(0, 160) })); process.exitCode = 2; });
