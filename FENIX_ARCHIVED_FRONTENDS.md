# FÊNIX OS — ARCHIVED FRONTENDS LOG
> **REGISTRO DE ARQUIVAMENTO FORENSE DE INTERFACES LEGADAS**  
> **Data**: 2026-08-20  

---

## 1. HISTÓRICO DE FRONTENDS ARQUIVADOS

### 📦 1. `grg/apps/ai-city/`
* **Original Path**: `ai-engine/grg/apps/ai-city/`
* **Archived Destination**: `ai-engine/archive/frontend/grg-apps-ai-city/`
* **Replacement**: `ai-engine/grg/public/index.html` (View: `city` + `ide` + `dna` + `agents`)
* **Features Migrated**:
  * Visualização dos distritos de agentes e knowledge.
  * IDE com terminal interativo e editor de arquivos no disco.
  * Integração com EventBus.
* **Reason**: Protótipo experimental em React que gerava servidor paralelo e portas separadas, violando o princípio de Shell Único.

---

### 📦 2. `platform/public/`
* **Original Path**: `ai-engine/platform/public/`
* **Archived Destination**: `ai-engine/archive/frontend/platform-public/`
* **Replacement**: `ai-engine/grg/public/index.html` (View: `projects` + `metrics` + `operations`)
* **Features Migrated**:
  * Listagem de repositórios e projetos conectados.
  * Painel de métricas de telemetria e análise.
  * Histórico de eventos e status do sistema.
* **Reason**: Dashboard legado com chamadas de endpoints mockadas e sem integração com a IDE Lovable ou o motor 3D da AI City.

---

### 📦 3. `crm/frontend/`
* **Original Path**: `ai-engine/crm/frontend/`
* **Archived Destination**: `ai-engine/archive/frontend/crm-frontend/`
* **Replacement**: Gerenciamento de projetos e slices dentro do `MultiProjectWorkspaceManager`.
* **Reason**: Template vazio de Vite sem implementação real de componentes.
