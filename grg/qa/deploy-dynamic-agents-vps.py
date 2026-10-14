"""Patch only the two VPS entrypoints that differ from the local checkout."""
from pathlib import Path
from shutil import copy2
from datetime import datetime, timezone

root = Path('/opt/fenix-os/grg/src')
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')


def edit(relative, before, after):
    path = root / relative
    source = path.read_text()
    if source.count(before) != 1:
        raise RuntimeError(f'{relative}: expected exactly one insertion point, found {source.count(before)}')
    backup = path.with_name(f'{path.name}.before-dynamic-agents-{stamp}')
    copy2(path, backup)
    path.write_text(source.replace(before, after, 1))
    print(f'updated {path}; backup {backup}')


before_assignment = '  const agentAssignment = new AgentJobAssignment({ store, registry: agentRegistry, memory: engineeringMemory });'
edit('app.js', before_assignment, '  const agentAssignment = new AgentJobAssignment({ store, registry: agentRegistry, memory: engineeringMemory, hierarchy });')

before_workspace = "      if (req.method === 'GET' && cognitiveWorkspace) return sendJson(res, 200, await app.hierarchy.workspace(tenantId, actorId, cognitiveWorkspace[1]), requestId);"
after_workspace = before_workspace + "\n      const cognitiveAgents = url.pathname.match(/^\\/api\\/cognitive\\/entities\\/([^/]+)\\/agents$/);\n      if (req.method === 'GET' && cognitiveAgents) return sendJson(res, 200, { agents: await app.hierarchy.listAgents(tenantId, actorId, cognitiveAgents[1]) }, requestId);\n      if (req.method === 'POST' && cognitiveAgents) return sendJson(res, 201, await app.hierarchy.createAgent(tenantId, actorId, { ...(await readJson(req)), entityId: cognitiveAgents[1] }), requestId);"
edit('server.js', before_workspace, after_workspace)
