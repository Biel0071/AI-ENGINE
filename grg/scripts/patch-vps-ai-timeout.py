from pathlib import Path
from datetime import datetime, timezone

path = Path('/opt/fenix-os/grg/src/ai-runtime/aiplatform-provider.js')
source = path.read_text()
old = "      bruto = await request(this.baseUrl, '/v1/chat', this.#apiKey, { messages: [{ role: 'user', content: prompt }], ...(model ? { model } : {}) });"
new = "      bruto = await request(this.baseUrl, '/v1/chat', this.#apiKey, { messages: [{ role: 'user', content: prompt }], ...(model ? { model } : {}) }, this.requestTimeoutMs, this.requestMaxRetries);"
if source.count(old) != 1:
    raise RuntimeError('provider timeout anchor changed')
backup = path.with_name(f'{path.name}.bak-timeout-{datetime.now(timezone.utc):%Y%m%d%H%M%S}')
backup.write_text(source)
path.write_text(source.replace(old, new))
print('Provider timeout patched; backup:', backup.name)
