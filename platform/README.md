# AI-ENGINE Software House Control Plane

Fundação multitenant para controlar os dez projetos GitHub da conta `Biel0071` sem misturar os seus repositórios.

## Estado do MVP

- catálogo inicial com os 10 repositórios;
- isolamento por `tenantId` em todos os serviços;
- visão consolidada e grafo de projetos/capacidades;
- fila local de solicitações de análise;
- preparação de publicação sem executar deploy externo;
- dashboard responsivo sem dependências de frontend;
- contrato PostgreSQL com Row Level Security para a etapa de produção.

## Executar

Use Node.js 20 ou superior:

```powershell
node src/index.js
```

Abra `http://127.0.0.1:4310`.

O armazenamento local é criado em `.data/state.json`. Para usar outro arquivo:

```powershell
$env:CONTROL_PLANE_DATA_FILE = 'C:\dados\ai-engine-control-plane.json'
node src/index.js
```

## API

Todas as rotas `/api/v1/*` exigem o header:

```text
x-tenant-id: biel0071-software-house
```

Rotas atuais:

- `GET /health`
- `GET /api/v1/overview`
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/graph`
- `POST /api/v1/projects/:id/actions/analyze`
- `POST /api/v1/projects/:id/deployments`

## Limite de segurança

O MVP registra solicitações de análise e publicação, mas não clona repositórios privados, não guarda tokens e não publica na web. Essas ações serão executadas por workers após a instalação de um GitHub App e de provedores de deploy com credenciais criptografadas.
