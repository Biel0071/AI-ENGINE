# CLAUDE.md — FÊNIX Ω∞ V6 (Operational Alpha Directive)

> **CONTRATO OBRIGATÓRIO DE RELEASE — V6 OPERATIONAL ALPHA**
> A versão atual é **v6-operational-alpha**.
> O status "Certified" está estritamente reservado para pós-validação em ambiente de produção VPS.
> Nas primeiras 24–48 horas em produção, o sistema opera obrigatoriamente em **Modo Assistido (Assisted Mode)**: promoções para Staging/Produção exigem aprovação humana no Cockpit.

---

## 📋 6-GATE RELEASE PROTOCOL

- **Gate 0**: Architecture Freeze ✅
- **Gate 1**: Tag `v6-operational-alpha`
- **Gate 2**: `git commit -m "release: FENIX Ω∞ V6 Operational Alpha"`
- **Gate 3**: `git push origin main && git push --tags`
- **Gate 4**: VPS Docker Deploy & Health Check
- **Gate 5**: VPS Kernel Activation & 24–48h Modo Assistido

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
