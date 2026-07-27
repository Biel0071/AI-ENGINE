# Dependency Inventory

## Runtime principal

O pacote `grg/` declara Node.js >=18 e não possui dependências NPM. Utiliza módulos nativos: `http`, `https`, `fs`, `path`, `crypto`, `child_process` e `vm`.

Vantagem: superfície de supply chain pequena. Limitação: faltam drivers e bibliotecas operacionais necessárias para produção.

## Pacote raiz

Dependências diretas:

- `axios`, `cors`, `dotenv`, `express`, `multer`, `openai`, `web-tree-sitter`;
- desenvolvimento: TypeScript, `tsx`, `ts-node`, Nodemon e tipos Node/Express.

## Frontend legado

React 18, React Router, React Flow, Zustand, Axios, Socket.IO Client, Vite, Tailwind e TypeScript.

## Infraestrutura declarada

- Qdrant via Docker Compose;
- Docling via Docker Compose;
- SQL de PostgreSQL na plataforma anterior, não conectado ao runtime GRG.

## Dependências necessárias por fase

| Capacidade | Dependência candidata | Regra |
|---|---|---|
| PostgreSQL | `pg` | adapter atrás de `StorePort`, pool configurável |
| Redis/session/cache | `ioredis` | TLS e prefixo por ambiente/tenant |
| Jobs | `bullmq` | producers no kernel; workers fora do processo HTTP |
| JWT/OIDC | `jose` | JWKS, issuer/audience e rotação |
| Object storage | AWS SDK S3 client | API S3 compatível; checksums obrigatórios |
| Telemetria | OpenTelemetry packages | inicialização opcional e fail-open controlado |
| Métricas | Prometheus client | labels com cardinalidade limitada |
| Logging | `pino` | JSON estruturado e redaction |
| Rate limit distribuído | Redis-backed limiter | chave por tenant, subject, rota e risco |
| OpenAPI | gerador/schema validator | contrato versionado e testes de contrato |

## Política de dependências

1. Fixar versões no lockfile.
2. Executar auditoria de vulnerabilidades e gerar SBOM.
3. Proibir dependência sem licença compatível ou mantenedor verificável.
4. Nenhum pacote deve ser importado pelo domínio; adapters isolam bibliotecas externas.
5. Falta de serviço externo deve resultar em health `degraded`, circuit breaker ou recusa segura, nunca fallback silencioso para mock em produção.
