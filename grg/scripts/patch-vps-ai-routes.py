from pathlib import Path
from datetime import datetime, timezone

stamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
config = Path('/opt/fenix-os/ecosystem.config.js')
source = config.read_text()
old = "        FENIX_AI_DEFAULT_PROVIDER: 'ollama',\n        FENIX_AI_DEFAULT_MODEL: 'qwen2.5:0.5b',"
new = "        FENIX_AI_DEFAULT_PROVIDER: 'aiplatform',\n        FENIX_AI_DEFAULT_MODEL: 'qwen2.5:0.5b',\n        FENIX_AI_PLAN_PROVIDER: 'aiplatform',\n        FENIX_AI_PLAN_MODEL: 'qwen2.5:0.5b',\n        FENIX_AI_GENERATE_PROVIDER: 'aiplatform',\n        FENIX_AI_GENERATE_MODEL: 'qwen2.5:0.5b',"
if source.count(old) != 1:
    raise RuntimeError('AI route config anchor changed')
source = source.replace(old, new)
old = "        GRG_LLM_MODEL: 'qwen2.5:3b',"
if source.count(old) != 1:
    raise RuntimeError('Ollama fallback anchor changed')
source = source.replace(old, "        GRG_LLM_MODEL: 'qwen2.5:0.5b',")
backup = config.with_name(f'{config.name}.bak-ai-routes-{stamp}')
backup.write_text(config.read_text())
backup.chmod(0o600)
config.write_text(source)
config.chmod(0o600)

routes = Path('/opt/fenix-os/grg/src/ai-runtime/provider-registry.js')
source = routes.read_text()
old = "model: env.FENIX_AI_PLAN_MODEL || 'echo-large'"
if source.count(old) != 1:
    raise RuntimeError('plan model anchor changed')
source = source.replace(old, "model: env.FENIX_AI_PLAN_MODEL || env.FENIX_AI_DEFAULT_MODEL || 'echo-large'")
old = "model: env.FENIX_AI_GENERATE_MODEL || 'echo-large'"
if source.count(old) != 1:
    raise RuntimeError('generate model anchor changed')
source = source.replace(old, "model: env.FENIX_AI_GENERATE_MODEL || env.FENIX_AI_DEFAULT_MODEL || 'echo-large'")
backup_routes = routes.with_name(f'{routes.name}.bak-ai-routes-{stamp}')
backup_routes.write_text(routes.read_text())
routes.write_text(source)
print('AI routes patched; backups:', backup.name, backup_routes.name)
