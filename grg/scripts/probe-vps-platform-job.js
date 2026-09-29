'use strict';

// Read-only status check for an API Platform job. Never emits credentials or result text.
const { resolveAIProviderKey, resolveAIPlatformUrl } = require('/opt/fenix-os/grg/src/security/secret-resolver');
const jobId = process.argv[2];
if (!jobId) throw new Error('job ID required');
fetch(`${resolveAIPlatformUrl()}/v1/jobs/${encodeURIComponent(jobId)}`, {
  headers: { authorization: `Bearer ${resolveAIProviderKey()}` }, signal: AbortSignal.timeout(12000),
}).then(async (response) => {
  const job = await response.json();
  console.log(JSON.stringify({ http: response.status, jobId, status: job.status, populationStatus: job.populationStatus,
    hasResult: Boolean(job.result), error: String(job.error?.message || job.error || '').slice(0, 160) }));
  if (!response.ok) process.exitCode = 2;
}).catch((error) => { console.error(JSON.stringify({ ok: false, reason: String(error.message || error).slice(0, 160) })); process.exitCode = 2; });
