from pathlib import Path
from datetime import datetime, timezone

root = Path('/opt/fenix-os/grg/src')
stamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')

route = root / 'api/product-experience-routes.js'
source = route.read_text()
start = source.index('  // 6. POST /api/v2/agents/orchestrate')
end = source.index('  // 7. POST /api/v2/factory/rebuild', start)
replacement = '''  // 6. POST /api/v2/agents/orchestrate (canonical agent job)
  if (req.method === 'POST' && url.pathname === '/api/v2/agents/orchestrate') {
    try {
      const payload = await readJsonBody(req);
      const { projectId, prompt } = payload;
      if (!String(projectId || '').trim()) throw new Error('projectId is required');
      if (!String(prompt || '').trim()) throw new Error('prompt is required');
      const project = await app.projectKernel.state(context.tenantId, context.actorId, projectId);
      if (!project.workspace) throw new Error('project requires a registered Git workspace');
      const job = await app.jobs.submit(context.tenantId, context.actorId, {
        type: 'agent.execute', source: 'api', projectId,
        prompt: String(prompt).trim(),
        requiredCapabilities: payload.requiredCapabilities || [],
        riskLevel: payload.riskLevel || 'MEDIUM',
        policy: payload.policy || {},
        payload: { projectId, prompt: String(prompt).trim() }
      });
      sendJson(res, 202, { jobId: job.id, status: job.status, agent: job.agent?.agentId || null });
    } catch (err) {
      sendError(res, 400, err.message);
    }
    return true;
  }

'''
backup = route.with_name(f'{route.name}.bak-agent-{stamp}')
backup.write_text(source)
route.write_text(source[:start] + replacement + source[end:])

runtime = root / 'agents/agent-execution-runtime.js'
source = runtime.read_text()
old = "    let plan; try { plan = JSON.parse(model.text); } catch { throw new Error('agent provider did not return the required JSON tool plan'); }"
new = old + "\n    if (!plan || typeof plan !== 'object' || Array.isArray(plan) || (!Array.isArray(plan.operations) && !Array.isArray(plan.tests)) || !(plan.operations?.length || plan.tests?.length)) throw new Error('agent provider returned an empty execution plan');"
if source.count(old) != 1:
    raise RuntimeError('agent plan anchor changed')
source = source.replace(old, new)
old = '      const result = await this.workspace.execute(tenantId, actorId, { ...plan, projectId: input.projectId, missionId: input.missionId, jobId: input.jobId, agentId: agent.agentId, context: { ...context, skillContext } });'
new = old + "\n      if (result.testsPassed === false) throw new Error('agent execution tests failed');"
if source.count(old) != 1:
    raise RuntimeError('workspace result anchor changed')
backup_runtime = runtime.with_name(f'{runtime.name}.bak-agent-{stamp}')
backup_runtime.write_text(runtime.read_text())
runtime.write_text(source.replace(old, new))
print('Patched agent route and execution guard; backups:', backup.name, backup_runtime.name)
