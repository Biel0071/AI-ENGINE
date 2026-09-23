# CLAUDE.md — FÊNIX OS INSTRUCTIONS FOR CLAUDE CODE

> **CONTRATO OPERACIONAL IMUTÁVEL PARA O CLAUDE**
> Ao atuar no projeto `ai-engine`, você deve obrigatoriamente respeitar a fonte única da verdade e as 5 Regras de Ouro. É proibido inventar arquivos paralelos de frontend ou adicionar mocks.

---

## 1. Localização Canônica do Frontend (Single Source of Truth)
- O **ÚNICO** frontend oficial do sistema é:
  `grg/public/index.html` (com scripts associados em `grg/public/`).
- Servidor local: `grg/src/server.js` (porta 4400).
- Produção VPS (`209.50.241.22`): porta 4410 (backend) e webroots `/opt/fenix-os/public/` + `/opt/fenix-os/grg/public/` (PM2 #17 `fenix-frontend`).
- **NUNCA** crie cópias de `index.html` em `scratch/`, na raiz ou em pastas avulsas.
- Versões aposentadas pertencem a `archive/retired-frontends/`.

---

## 2. As 5 Regras de Ouro

1. **Regra I — Fonte Canônica Única Inviolável**: Modificações de frontend são feitas exclusivamente em `grg/public/`. O teste `architecture-guard.test.js` escaneia o repositório e bloqueia qualquer shell concorrente.
2. **Regra II — Zero-Mock & Honestidade de Telemetria**: Proibido colocar valores fictícios estáticos ("100%", "4 ATIVOS", "95%") no HTML. Slots iniciais devem exibir `—`. Telemetria deve vir exclusivamente das APIs reais.
3. **Regra III — NUNCA Recriar, SEMPRE Evoluir**: O frontend é Vanilla JS puro com 14 views unificadas. Preserve rigorosamente os IDs de teste (`#orchHeatmapGrid`, `#fenixMemoryErrorNotice`, `#fenixMemoryOperationalContainer`, `.fenix-mem-tab-btn`, `#cityCanvas`).
4. **Regra IV — Prova Obrigatória Antes de Concluir**:
   Validação obrigatória: `CÓDIGO -> SINTAXE (node -c) -> EXECUÇÃO -> TESTES PASSANDO -> DOM VERIFICADO -> ENDPOINTS 200`.
   Rode os testes antes de concluir:
   - `node grg/test/architecture-guard.test.js`
   - `node grg/test/frontend-honesty.test.js`
   - `node grg/test/frontend-runtime-safety.test.js`
5. **Regra V — Deploy Canônico e Paridade Dual**:
   Deploy remoto na VPS somente via `deploy.bat`. Garantir 100% de paridade entre `/opt/fenix-os/public/` e `/opt/fenix-os/grg/public/`.

---

## 3. Comandos Úteis
```bash
# Teste de guarda arquitetural
node grg/test/architecture-guard.test.js

# Teste de honestidade de frontend
node grg/test/frontend-honesty.test.js

# Teste de integridade de runtime
node grg/test/frontend-runtime-safety.test.js

# Checagem de sintaxe
node -c <arquivo.js>
```
