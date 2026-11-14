#!/usr/bin/env node
'use strict';
// Entrega A — coletor de evidências da certificação. Roda NA VPS e só LÊ o documento de estado
// do Postgres de produção (SELECT); não escreve nada. A URL do banco vem do ambiente do processo
// fenix-backend (/proc/<pid>/environ) e nunca é impressa.
// Uso: node entrega-a-evidence.js <pid-fenix-backend> <missionId | --latest-code | --blocked> [saida.json]
const fs = require('node:fs');
const path = require('node:path');

function envOf(pid) {
  return Object.fromEntries(fs.readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0').filter(Boolean)
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
}

function loadPg() {
  for (const base of [process.cwd(), '/opt/fenix-os/grg']) {
    try { return require(require.resolve('pg', { paths: [base] })); } catch { /* next */ }
  }
  throw new Error('pg module not found (run from /opt/fenix-os/grg)');
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj && obj[k] !== undefined).map((k) => [k, obj[k]]));

(async () => {
  const [pid, target, out] = process.argv.slice(2);
  if (!pid || !target) throw new Error('usage: entrega-a-evidence.js <pid> <missionId|--latest-code|--blocked> [out.json]');
  const url = new URL(envOf(pid).DATABASE_URL);
  const schema = url.searchParams.get('schema') || 'public';
  url.searchParams.delete('schema');
  const { Client } = loadPg();
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const { rows } = await client.query(`SELECT version, updated_at,
      document->'missions' AS missions, document->'missionSteps' AS steps, document->'missionEvents' AS events,
      document->'runtimeJobs' AS jobs, document->'workerHeartbeats' AS workers, document->'deadLetters' AS dead
      FROM ${schema}.kernel_state WHERE state_key = 'global'`);
    const row = rows[0];
    const missions = row.missions || [];
    let mission;
    if (target === '--latest-code') mission = missions.filter((m) => m.mode === 'CODE' || m.delivery).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    else if (target === '--blocked') mission = missions.filter((m) => m.status === 'BLOCKED').sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    else mission = missions.find((m) => m.id === target);
    if (!mission) throw new Error(`mission not found for ${target}`);
    const steps = (row.steps || []).filter((s) => s.missionId === mission.id);
    const jobs = (row.jobs || []).filter((j) => j.missionId === mission.id);
    const events = (row.events || []).filter((e) => e.missionId === mission.id).sort((a, b) => String(a.createdAt || a.at).localeCompare(String(b.createdAt || b.at)));
    const evidence = {
      collectedAt: new Date().toISOString(),
      store: { stateVersion: Number(row.version), updatedAt: row.updated_at },
      mission: pick(mission, ['id', 'tenantId', 'title', 'mode', 'status', 'requestedBy', 'createdAt', 'updatedAt', 'progress']),
      delivery: mission.delivery ? { ...pick(mission.delivery, ['deliveryStatus', 'stepOutcome', 'model', 'modelOk', 'attempts', 'testKind', 'managerAgentId', 'subAgentId', 'workerId', 'jobId', 'metrics', 'completedAt', 'reason']), tests: mission.delivery.sandbox ? pick(mission.delivery.sandbox, ['passed', 'passedCount', 'total', 'isolation', 'results']) : null, codeBytes: mission.delivery.code ? Buffer.byteLength(mission.delivery.code) : 0, code: mission.delivery.code || null } : null,
      steps: steps.map((s) => pick(s, ['id', 'key', 'type', 'status', 'jobId', 'repairCount', 'startedAt', 'updatedAt'])),
      jobs: jobs.map((j) => pick(j, ['id', 'type', 'status', 'attempts', 'maxAttempts', 'workerId', 'lastWorkerId', 'blockedOn', 'blockedSince', 'blockedCount', 'scheduledFor', 'createdAt', 'startedAt', 'completedAt', 'error', 'currentStage'])),
      events: events.map((e) => pick(e, ['type', 'status', 'stepKey', 'actorId', 'createdAt', 'at', 'data'])),
      workers: (row.workers || []).map((w) => pick(w, ['workerId', 'lastSeenAt', 'activeJobs'])),
      duplicateCodeJobs: jobs.filter((j) => j.type === 'code.deliver').length,
    };
    const text = JSON.stringify(evidence, null, 2);
    if (out) fs.writeFileSync(path.resolve(out), text);
    console.log(text);
  } finally { await client.end(); }
})().catch((error) => { console.error('[entrega-a-evidence]', error.message); process.exit(1); });