# Próximos passos

Implementação local-first dos 7 planos concluída em `grg/` (8 arquivos de teste, todos verdes).
Rodar: `cd grg && "/c/Program Files/Adobe/Adobe Photoshop 2023/node.exe" --test test/`
Painel: `node src/server.js` → http://127.0.0.1:4400

## Substituir adapters mock por reais (sem tocar no domínio)
1. **Store** Memory/File → Postgres + RLS (`grg/src/kernel/store.js` é o port).
2. **Git host** Local → GitHub App + webhooks (`grg/src/repo-intel/ports.js`).
3. **AI provider** Echo → LiteLLM/OpenAI/Anthropic (`grg/src/ai-runtime/providers.js`).
4. **Deploy** Mock → Cloudflare/AWS/K8s/VPS (`grg/src/runtime/deployer.js`).
5. **Packager** Mock → gradle/xcode/electron-builder/tauri/web-ext (`grg/src/app-factory/app-factory.js`).
6. **Auth** headers simulados → OAuth/OIDC/JWT no `grg/src/server.js`.
7. **Scanner** regex → tree-sitter AST real (`grg/src/repo-intel/scanner.js`).

## Integrar com o que já existia
- Migrar dados do control plane `platform/` (seed dos 10 repos) para o `grg/` quando o adapter
  Postgres estiver pronto, ou manter `platform/` como legado e `grg/` como a plataforma nova.
- Popular `ai-os/CAPABILITIES/` e `ai-os/REPOSITORIES/` a partir da análise real dos repos.

## Ambiente
- Node não está no PATH; usar o runtime do Photoshop (v18) para rodar/testar.
- Deleções não commitadas no working tree (crm/, src/, core/) — decisão: ignorar, construir por cima.
