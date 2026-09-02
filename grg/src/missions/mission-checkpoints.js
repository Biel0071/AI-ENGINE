const { uuid } = require('../kernel/ids');
const { NotFoundError } = require('../kernel/errors');

const CHECKPOINT_EVENTS = new Set([
  'mission.created', 'mission.started', 'mission.paused', 'mission.cancelled', 'mission.completed',
  'runtime.job.started', 'runtime.job.succeeded', 'runtime.job.failed', 'runtime.job.dead_letter',
  'runtime.job.cancelled', 'runtime.job.cancel-requested', 'runtime.job.pause-requested', 'runtime.job.paused',
]);

class MissionCheckpointsService {
  constructor({ store, events, controlPlane }) { this.store = store; this.events = events; this.cp = controlPlane; this.unsubscribe = []; }

  attach() {
    if (!this.events?.subscribe || this.unsubscribe.length) return this;
    for (const type of CHECKPOINT_EVENTS) this.unsubscribe.push(this.events.subscribe(type, (event) => this.capture(event).catch(() => {})));
    return this;
  }

  async capture(event, metadata = {}) {
    const missionId = event.data?.missionId || event.missionId || null;
    const jobId = event.data?.jobId || event.subject || null;
    if (!missionId && !jobId) return null;
    const state = await this.store.read();
    const mission = missionId ? state.missions.find((item) => item.id === missionId) : state.missionSteps.find((item) => item.jobId === jobId);
    const resolvedMissionId = missionId || mission?.missionId;
    if (!resolvedMissionId) return null;
    const job = jobId ? state.runtimeJobs.find((item) => item.id === jobId) : null;
    const checkpoint = { id: uuid(), missionId: resolvedMissionId, jobId: job?.id || jobId || null, type: classify(event.type), status: 'VALID', createdAt: new Date().toISOString(), branch: job?.branch || null, headCommit: null, workspaceState: { workspace: job?.workspace || null }, jobState: job ? { status: job.status, progress: job.progress, attempts: job.attempts, currentStage: job.currentStage } : null, metadata: { eventType: event.type, ...metadata } };
    await this.store.update((next) => { next.missionCheckpoints.push(checkpoint); return next; });
    return checkpoint;
  }

  async listForMission(tenantId, actorId, missionId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); if (!state.missions.some((item) => item.tenantId === tenantId && item.id === missionId)) throw new NotFoundError(`mission not found: ${missionId}`); return state.missionCheckpoints.filter((item) => item.missionId === missionId); }
  async listForJob(tenantId, actorId, jobId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); const job = state.runtimeJobs.find((item) => item.tenantId === tenantId && item.id === jobId); if (!job) throw new NotFoundError(`job not found: ${jobId}`); return state.missionCheckpoints.filter((item) => item.jobId === jobId); }
  async get(tenantId, actorId, id) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); const item = state.missionCheckpoints.find((checkpoint) => checkpoint.id === id && (state.missions.find((mission) => mission.id === checkpoint.missionId)?.tenantId === tenantId)); if (!item) throw new NotFoundError(`checkpoint not found: ${id}`); return item; }
}

function classify(type) { if (type === 'mission.created') return 'AUTO'; if (type.includes('cancel') || type.includes('pause')) return 'RECOVERY'; if (type.includes('succeeded') || type === 'mission.completed') return 'POST_VALIDATION'; return 'AUTO'; }
module.exports = { MissionCheckpointsService };
