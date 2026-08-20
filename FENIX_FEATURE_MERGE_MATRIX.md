# FÊNIX OS — FEATURE MERGE MATRIX
> **MATRIZ FORENSE DE CONSOLIDAÇÃO E MIGRAÇÃO DE FUNCIONALIDADES**  
> **Data**: 2026-08-20  

---

## 1. TABELA DE MIGRAÇÃO E FUSÃO DE FEATURES

| Feature / Módulo | Origem Primária | Frontend Legado | Implementação Oficial | Status | Destino Oficial | Duplicada? | Ação Realizada |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AI City 3D Interativa** | `grg/apps/ai-city` | `FE-EXP-AI-CITY-REACT` | Canvas 2D/3D + Tráfego Neon + Agentes Vivos + Monumento | **CONSOLIDADO** | `grg/public/index.html` (View: `city`) | SIM | **MERGE & EVOLUÇÃO** |
| **Fênix JARVIS Chat Lateral** | `platform/public` | `FE-LEGACY-PLATFORM-V2` | Sidebar integrada com modelo real `qwen2.5:3b` | **CONSOLIDADO** | `grg/public/index.html` (Sidebar Lateral) | SIM | **MERGE & CONEXÃO REAL** |
| **IDE & Editor de Código** | `grg/apps/ai-city` | `FE-EXP-AI-CITY-REACT` (Monaco) | Editor sincronizado com disco + Syntax Tabs | **CONSOLIDADO** | `grg/public/index.html` (View: `ide`) | SIM | **MERGE & CONEXÃO DISCO** |
| **Árvore de Arquivos no Disco** | `grg/apps/ai-city` | `FE-EXP-AI-CITY-REACT` (`fsTree`) | `GET /api/v2/projects/:id/files` com fs real | **CONSOLIDADO** | `grg/public/index.html` (IDE File Tree) | SIM | **MIGRADO PARA REAL** |
| **Terminal de Comandos** | `grg/apps/ai-city` | `FE-EXP-AI-CITY-REACT` (`xterm.js`) | Terminal interativo com stream de eventos | **CONSOLIDADO** | `grg/public/index.html` (IDE Terminal) | SIM | **MERGE** |
| **Editor Visual Lovable** | Novos requisitos | Nenhum (Mocks) | Visual Canvas + Mapeamento Bidirecional Código | **CONSOLIDADO** | `grg/public/index.html` (IDE Visual Canvas) | NÃO | **IMPLEMENTADO OFICIAL** |
| **Operações 24/7 (Jobs)** | Requisitos JARVIS | Nenhum | 24/7 Heartbeat + DAG Microtasks + Aprovação Humana | **CONSOLIDADO** | `grg/public/index.html` (View: `operations`) | NÃO | **IMPLEMENTADO OFICIAL** |
| **Propagação Cross-Project** | Requisitos JARVIS | Nenhum | Motor de Oportunidades + Propagação Segura | **CONSOLIDADO** | `grg/public/index.html` (View: `operations`) | NÃO | **IMPLEMENTADO OFICIAL** |
| **4-DNA Model Quad View** | `grg/src/intelligence` | `FE-EXP-AI-CITY-REACT` (Evolution) | Estrutural, Comportamental, Visual, Evolutivo | **CONSOLIDADO** | `grg/public/index.html` (View: `dna`) | SIM | **MERGE** |
| **Roster dos 19 Agentes** | `grg/src/agents` | `FE-EXP-AI-CITY-REACT` (Workers) | Grid dos 19 agentes com status e skills | **CONSOLIDADO** | `grg/public/index.html` (View: `agents`) | SIM | **MERGE** |
| **Gestão Multi-Projeto** | `platform/public` | `FE-LEGACY-PLATFORM-V2` (`projects`) | Workspace Manager multi-tenant no disco | **CONSOLIDADO** | `grg/public/index.html` (View: `projects`) | SIM | **MERGE** |
| **Métricas em Tempo Real** | `platform/public` | `FE-LEGACY-PLATFORM-V2` (`metrics`) | Prometheus + RAM + CPU + Eventos reais | **CONSOLIDADO** | `grg/public/index.html` (View: `metrics`) | SIM | **MERGE** |
| **Dual Model Selection Bar** | Requisitos de IA | Nenhum | Barra inferior com Modelo Principal + Secundário | **CONSOLIDADO** | `grg/public/index.html` (Footer Bar) | NÃO | **IMPLEMENTADO OFICIAL** |

---

## 2. CONCLUSÃO DA MATRIZ

100% das funcionalidades úteis encontradas em protótipos experimentais e versões legadas foram:
1. **Identificadas e mapeadas**.
2. **Portadas para o Shell Oficial (`grg/public/index.html` + `grg/public/unified-app.js`)**.
3. **Validadas contra endpoints reais do backend**.
4. **Protegidas contra regressões via suíte automatizada**.
