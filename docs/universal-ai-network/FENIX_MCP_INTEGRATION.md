# Como conectar Claude Code, Codex e Antigravity ao FÊNIX (MCP)

O FÊNIX expõe um servidor MCP por stdio: `grg/bin/fenix-mcp.js`. Cada ferramenta usa **o próprio token** (`fxc_…`), para que o FÊNIX saiba quem fez cada registro.

## 1. Criar o token da ferramenta (uma vez, pelo dono)

Logado como administrador:

```
POST /api/v2/hub/clients
{ "provider": "CLAUDE_CODE", "label": "claude-code-notebook" }
```

Provedores: `CLAUDE_CODE`, `OPENAI_CODEX`, `ANTIGRAVITY`, `OLLAMA_AGENT`, `OTHER_LLM`. A resposta traz o `token` **uma única vez**; guarde-o no gerenciador de senhas. Para revogar: `POST /api/v2/hub/clients/{id}/revoke`.

## 2. Variáveis

- `FENIX_URL` — por exemplo `http://localhost:4400` (local) ou a URL da VPS.
- `FENIX_TOKEN` — o token `fxc_…` daquela ferramenta.

## 3. Configurar cada ferramenta

**Claude Code**

```bash
claude mcp add fenix --env FENIX_URL=http://localhost:4400 --env FENIX_TOKEN=fxc_SEU_TOKEN -- node C:/projetos/ai-engine-core/ai-engine/grg/bin/fenix-mcp.js
```

**OpenAI Codex** (`~/.codex/config.toml`)

```toml
[mcp_servers.fenix]
command = "node"
args = ["C:/projetos/ai-engine-core/ai-engine/grg/bin/fenix-mcp.js"]
env = { FENIX_URL = "http://localhost:4400", FENIX_TOKEN = "fxc_SEU_TOKEN" }
```

**Antigravity e outras IDEs com MCP** (formato JSON `mcpServers`)

```json
{
  "mcpServers": {
    "fenix": {
      "command": "node",
      "args": ["C:/projetos/ai-engine-core/ai-engine/grg/bin/fenix-mcp.js"],
      "env": { "FENIX_URL": "http://localhost:4400", "FENIX_TOKEN": "fxc_SEU_TOKEN" }
    }
  }
}
```

## 4. Ferramentas do hub

| Ferramenta | Para quê |
|---|---|
| `fenix_hub_context` | **Chamar ao entrar num projeto**: decisões, descobertas, caixa de entrada, travas, quem está online |
| `fenix_knowledge_search` | Ver o que outras IAs já descobriram/decidiram |
| `fenix_knowledge_record` | Registrar descoberta, decisão, evidência ou sugestão |
| `fenix_message_send` / `fenix_messages` | Pedir tarefa, revisão, enviar resultado de teste, reportar bug |
| `fenix_lock_file` / `fenix_unlock_file` | Travar arquivo antes de editar |
| `fenix_hub_whoami`, `fenix_hub_clients` | Identidade e presença |

As 12 ferramentas anteriores (jobs, mapa do projeto, status) continuam. Aprovar, rejeitar e desfazer jobs pelo MCP só funcionam com sessão humana — com token de IA o FÊNIX responde 403.

## 5. Instrução sugerida para cada IA

> Ao começar num projeto, chame `fenix_hub_context`. Antes de mexer num módulo, use `fenix_knowledge_search` para ver o que outras ferramentas já fizeram e trave o arquivo com `fenix_lock_file`. Ao terminar, registre o que descobriu ou decidiu com `fenix_knowledge_record` (classe certa e arquivos) e libere a trava.

## Observação sobre a VPS

Para usar a URL pública, o certificado HTTPS precisa ser aceito pelo Node (hoje a VPS usa certificado próprio). Até isso ser resolvido, o uso remoto fica pendente; o uso local já funciona.