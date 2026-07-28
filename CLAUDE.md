# CLAUDE.md — FÊNIX Ω∞ V6 OPERATIONAL MODE MASTER DIRECTIVE

> **CONTRATO OBRIGATÓRIO DO FÊNIX Ω∞ V6 — OPERATIONAL MODE**
> A ARQUITETURA ESTÁ 100% CONGELADA.
> Não criar novos motores ou novas camadas. A missão é operar a plataforma viva 24/7.

---

## ⚡ REGRA Nº 1

Nenhuma funcionalidade será criada manualmente. Toda solicitação passa pelo pipeline:
`Intent ──► Mission Compiler ──► Digital Twin ──► Swarm ──► Shadow Runtime ──► Tests ──► Quality Gate ──► Memory Council ──► Capability Factory ──► Knowledge Graph ──► Capsule Ω`

---

## 🛡️ POLÍTICA DE AUTONOMIA EM 5 NÍVEIS (`AUTONOMY_LEVELS_POLICY.json`)

- **Nível 0 – Observação**: Monitoramento 24/7 e síntese diária (`DAILY_SYNTHESIS.md`).
- **Nível 1 – Sugestão**: Compilação de blueprints e propostas no Cockpit UI.
- **Nível 2 – Sandbox**: Refatoração autônoma SOMENTE no `Shadow Runtime` isolado.
- **Nível 3 – Desenvolvimento**: Aplicação em branches de dev e Pull Requests automáticos.
- **Nível 4 – Produção Assistida**: Promoção para produção ESTRITAMENTE após aprovação humana explícita no Cockpit UI.

---

## 📁 PROTOCOLO DE INGESTÃO EM 20 ETAPAS

1. Inventário ──► 2. AST ──► 3. Dependências ──► 4. Arquitetura ──► 5. Banco ──► 6. APIs ──► 7. Docker ──► 8. CI/CD ──► 9. Frontend ──► 10. Backend ──► 11. Segurança ──► 12. Performance ──► 13. Observabilidade ──► 14. Testes ──► 15. Documentação ──► 16. Knowledge Graph ──► 17. Digital Twin ──► 18. Engineering DNA Score ──► 19. Backlog Inteligente ──► 20. Capability Matching.

---

## Comandos da Plataforma

```bash
# Servidor Control Plane v2 (dashboard em http://127.0.0.1:4310)
cd platform && node src/index-v2.js

# Testes da suíte do platform (13 testes)
cd platform && node --test test/*.test.js

# Testes da suíte do motor grg (259 testes)
cd grg && node --test test/*.test.js
```
