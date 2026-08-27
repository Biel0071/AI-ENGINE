# FÊNIX Universal Orchestrator

O contrato canônico é a API autenticada `/api/v2`. IDE, CLI, MCP e painel são clientes do mesmo `JobEngine`; nenhum adaptador possui fila, worker ou pipeline próprio.

## Fluxo

1. `POST /api/v2/jobs` persiste o job e o publica em `fenix-runtime` no BullMQ.
2. O worker BullMQ faz claim do mesmo `jobId` persistido. Entrega duplicada não reexecuta o job.
3. `development.execute` cria branch/worktree isolado, carrega contexto, chama o `AIGateway`, valida os arquivos permitidos e executa gates reais.
4. Eventos e evidências ficam disponíveis em `GET /api/v2/jobs/:id/events`.
5. Jobs `HIGH` e `CRITICAL` ficam em `AWAITING_APPROVAL`. Outro administrador usa `/approve` ou `/reject`.
6. O resultado fica no worktree para revisão. `/rollback` remove o worktree isolado e sua branch; não apaga o workspace principal.

## Autenticação

Faça login em `POST /api/login` e use o token retornado como `Authorization: Bearer ...`. Tokens e chaves não devem ser gravados no repositório.

```bash
export FENIX_URL=http://127.0.0.1:4400
export FENIX_TOKEN='<token-da-sessao>'
```

## API

```bash
curl -X POST "$FENIX_URL/api/v2/jobs" \
  -H "authorization: Bearer $FENIX_TOKEN" \
  -H "content-type: application/json" \
  -d '{"source":"vscode","prompt":"Analise e corrija a autenticação","workspace":"/repos/app","riskLevel":"HIGH"}'

curl -H "authorization: Bearer $FENIX_TOKEN" "$FENIX_URL/api/v2/jobs/JOB_ID"
curl -H "authorization: Bearer $FENIX_TOKEN" "$FENIX_URL/api/v2/jobs/JOB_ID/events"
curl -H "authorization: Bearer $FENIX_TOKEN" "$FENIX_URL/api/v2/system/status"
```

`GET /api/jobs` combina o registro persistido com os estados reais do BullMQ. `GET /api/workers` combina clientes conectados à fila com heartbeat persistido; registro antigo não conta como online.

## CLI

```bash
fenix job submit "Analise o sistema de autenticação" --workspace /repos/app --risk HIGH
fenix job get JOB_ID
fenix job events JOB_ID
fenix job approve JOB_ID
fenix job cancel JOB_ID
fenix job rollback JOB_ID
fenix status
```

## MCP/stdio

Execute `npm run mcp` ou `fenix-mcp` com `FENIX_URL` e `FENIX_TOKEN` no ambiente do cliente MCP. Ferramentas expostas:

- `fenix_submit_job`
- `fenix_get_job`
- `fenix_get_job_events`
- `fenix_get_system_status`
- `fenix_cancel_job`
- `fenix_approve_job`
- `fenix_reject_job`
- `fenix_rollback_job`

Exemplo de configuração genérica:

```json
{
  "mcpServers": {
    "fenix": {
      "command": "node",
      "args": ["C:/caminho/ai-engine/grg/bin/fenix-mcp.js"],
      "env": {
        "FENIX_URL": "http://127.0.0.1:4400",
        "FENIX_TOKEN": "fornecer-pelo-secret-store-da-IDE"
      }
    }
  }
}
```

## AI Platform e diagnóstico da VPS

O provider usa `POST /v1/text`, `POST /v1/chat` e, quando recebe `202`, consulta `GET /v1/jobs/:id`. O health executa inferência mínima e recusa respostas fabricadas. `GRG_AIPLATFORM_URL`, `GRG_AIPLATFORM_KEY` e `GRG_AIPLATFORM_MODEL` devem vir do ambiente/secret manager.

Em 2026-08-27, `209.50.241.215` respondeu o HTML do dashboard para `GET /v1/health` e nginx `405` para `POST /v1/text`; portas 3000/8080 não forneceram o backend. Isso indica upstream/proxy da AI Platform indisponível, não erro no payload do FÊNIX. O provider agora expõe esse motivo em `ai-providers.aiplatform.error`; corrigir o proxy da VPS é necessário antes de declarar inferência externa operacional.

## Limites de segurança

- Apenas worktrees filhas de `FENIX_WORKTREE_ROOT` são criadas/removidas.
- `.git`, `.env`, `node_modules` e paths fora do repositório são bloqueados.
- A IA só pode propor arquivos completos em JSON; exclusão não é aceita.
- Gates usam executáveis permitidos (`node`, `npm`, `npx`) sem shell.
- Não há merge ou deploy automático. Aprovação de job não equivale a autorização de produção.
