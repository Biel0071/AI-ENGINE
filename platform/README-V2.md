# AI-ENGINE Control Plane v2

Esta camada acrescenta controle de acesso e memória progressiva ao MVP sem alterar os arquivos originais.

## Executar

```powershell
node src/index-v2.js
```

Dashboard: `http://127.0.0.1:4310`

## Papéis

- `master_admin`: controle integral, inclusive outros administradores;
- `admin`: projetos, análises, publicações, memória e membros;
- `subadmin`: leitura, análises e memória, sem publicar ou administrar acesso;
- `employee`: leitura dos projetos e da memória liberada.

Toda rota `/api/v2/*` exige:

```text
x-tenant-id: biel0071-software-house
x-user-id: biel0071
```

No MVP local os headers simulam uma sessão autenticada. Na produção eles serão preenchidos por autenticação real e nunca aceitos diretamente do navegador sem validação.

## Memória progressiva

Análises e solicitações de publicação geram `memoryEvents` append-only. Cada evento possui projeto, autor, evidência, confiança e data. Eventos sem evidência são rejeitados. O grafo compartilhado cria relações `LEARNED` apenas a partir desses eventos comprovados.

Rotas novas:

- `GET /api/v2/members`
- `POST /api/v2/members`
- `GET /api/v2/memory?projectId=...`
- `POST /api/v2/projects/:id/memory`
- `GET /api/v2/graph`
- `POST /api/v2/projects/:id/actions/analyze`
- `POST /api/v2/projects/:id/deployments`

## Próxima integração

O próximo worker deverá receber webhooks de um GitHub App, gerar snapshots por commit e registrar somente fatos com `source_location`, revisão Git e confiança. Isso fará mudanças futuras aparecerem automaticamente no painel e na memória do projeto.
