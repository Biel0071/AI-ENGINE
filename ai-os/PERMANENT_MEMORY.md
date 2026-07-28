# GRG FÊNIX Ω∞ — PERMANENT MEMORY (Append-Only)

> **Memória Permanente Imutável de Decisões de Arquitetura e Convenções**

---

### [DEC-2026-07-27-001] Adoção do Universal Cognitive Kernel (ACEP Ω∞)
- **Decisão:** Substituir a arquitetura de motores isolados por um Kernel central unificado.
- **Motivo:** Garantir que toda alteração seja validada por simulação pré-mutação e política de governança.
- **Evidência:** `ai-os/domains/acep-kernel.md`.

### [DEC-2026-07-27-002] Governança de Ambientes em 3 Camadas
- **Decisão:** Dev (Autônomo) → Staging (Autônomo + Gate de QA) → Prod (Aprovação Humana Obrigatória).
- **Motivo:** Eliminar riscos de regressões ou alterações não autorizadas em produção.
- **Evidência:** `ai-os/MASTER.md`.

### [DEC-2026-07-27-003] Adoção do Cognitive Bootstrap System (CBS)
- **Decisão:** Criar um bootloader determinístico (`SYSTEM_STATE.md`, `PROJECT_DNA.json`, `FENIX_KERNEL.md`) lido antes de qualquer ação por qualquer IA.
- **Motivo:** Eliminar a perda de contexto e alucinações entre sessões de chat e ferramentas de IA diferentes.
- **Evidência:** `ai-os/SYSTEM_STATE.md` e `ai-os/PROJECT_DNA.json`.
