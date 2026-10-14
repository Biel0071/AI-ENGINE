"""Apply the small City API/JobEngine integration to the running VPS checkout.

Run after copying this script and living-city-routes.js to the VPS. Every
replacement is checked so a changed remote checkout fails before mutation.
"""
from pathlib import Path
from shutil import copy2
from datetime import datetime, timezone

root = Path('/opt/fenix-os/grg/src')
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')


def edit(relative, changes):
    path = root / relative
    original = path.read_text()
    updated = original
    for before, after in changes:
        if updated.count(before) != 1:
            raise RuntimeError(f'{relative}: expected one occurrence, got {updated.count(before)}')
        updated = updated.replace(before, after, 1)
    backup = path.with_name(f'{path.name}.before-city-{stamp}')
    copy2(path, backup)
    path.write_text(updated)
    print(f'updated {path}; backup {backup}')


edit('server.js', [
    ("const { handleOrchestrationRoutes } = require('./api/orchestration-routes');",
     "const { handleOrchestrationRoutes } = require('./api/orchestration-routes');\nconst { handleLivingCityRoutes } = require('./api/living-city-routes');"),
    ("      if (orchestrationHandled) return;\n",
     "      if (orchestrationHandled) return;\n\n      if (await handleLivingCityRoutes(req, res, url, app, sendJson, { tenantId, actorId })) return;\n"),
])

edit('runtime/job-engine.js', [
    ("    return Promise.all(claimed.map((job) => this.#execute(job, workerId)));",
     "    return Promise.all(claimed.map(async (job) => {\n      await this.#publish(job, 'runtime.job.started', workerId).catch((error) => console.error('[JobEngine] failed to publish job start:', error));\n      return this.#execute(job, workerId);\n    }));"),
    ("    return claimed ? this.#execute(claimed, workerId) : null;",
     "    if (!claimed) return null;\n    await this.#publish(claimed, 'runtime.job.started', workerId).catch((error) => console.error('[JobEngine] failed to publish job start:', error));\n    return this.#execute(claimed, workerId);"),
    ("attempts: job.attempts, limits: job.limits }, idempotencyKey:",
     "attempts: job.attempts, limits: job.limits, agentId: job.agent?.agentId || null, projectId: job.projectId || null, missionId: job.missionId || null }, idempotencyKey:"),
])
