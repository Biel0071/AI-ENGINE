from pathlib import Path
from shutil import copy2

app = Path('/opt/fenix-os/grg/src/app.js')
old = app.read_text()
needle = '  const agentWorkspaceExecutor = new AgentWorkspaceExecutor({ store, controlPlane, gitWrite: gitWorkspaceWrite, gitRead, gitCommit, tools });'
if old.count(needle) != 1 or 'agentTestSandboxFactory' in old:
    raise SystemExit('Unexpected app agent sandbox wiring')
replacement = '''  const agentTestSandboxFactory = options.agentTestSandboxFactory || (runtimeEnv.FENIX_SANDBOX_DRIVER === 'docker-rootless'
    ? ({ workspaceRoot: testWorkspaceRoot }) => new DockerRootlessSandbox({ workspaceRoot: testWorkspaceRoot, dockerHost: runtimeEnv.DOCKER_HOST, enforceRootless: true, cpuMode: runtimeEnv.FENIX_SANDBOX_CPU_MODE || 'quota' })
    : null);
  const agentWorkspaceExecutor = new AgentWorkspaceExecutor({ store, controlPlane, gitWrite: gitWorkspaceWrite, gitRead, gitCommit, tools, testSandboxFactory: agentTestSandboxFactory, testImage: options.agentTestImage || runtimeEnv.FENIX_AGENT_TEST_IMAGE });'''
backup = app.with_name('app.js.pre-agent-test-sandbox-20260924')
if backup.exists():
    raise SystemExit('Backup already exists')
copy2(app, backup)
app.write_text(old.replace(needle, replacement, 1))
print('Wired isolated agent test runner')
