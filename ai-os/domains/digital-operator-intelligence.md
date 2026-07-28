# GRG FÊNIX Ω∞ — DIGITAL OPERATOR INTELLIGENCE (DOI)

> **Bounded Context:** `DigitalOperator` · `VisualLearning` · `CapabilitySynthesizer` · `ReverseEngineering` · `FrontendEvolution`
>
> O **Digital Operator Intelligence (DOI)** permite que o FÊNIX aprenda a operar sistemas web e aplicações como um usuário humano experiente.
> Em vez de apenas executar automações cegas (scripts rígidos), o DOI interpreta visualmente a interface, descobre fluxos interativos, registra evidências completas e converte o comportamento observado em especificações técnicas e **Capabilities reutilizáveis**.

---

## 1. Motores Cognitivos do DOI

### 1.1 Browser Cognition Engine
- **Execução Multibrowser**: Controla instâncias efêmeras ou persistentes de Chrome, Edge e Firefox via Playwright/Puppeteer com isolamento por tenant.
- **Interpretação Semântica e Visual**: Combina análise de árvore DOM com visão computacional (LLM vision) para reconhecer menus, tabelas, gráficos, formulários e botões operacionais.
- **Descoberta Autônoma de Fluxos**: Explora rotas e ações interativas gerando um **Navigation Graph** (Mapa de Navegação completo).
- **Evidências Auditáveis**: Grava snapshots DOM, screenshots em alta resolução, gravações de vídeo da sessão e logs de console/network.

### 1.2 Visual Learning Engine & Visual Cognition OS
- Grava estrutura visual, layout, animações, regras de negócio observadas e APIs consumidas.
- Converte padrões visuais e comportamentais observados em um **Design Genome** e uma **Capability reutilizável** no catálogo.

### 1.3 Capability Synthesizer
- Converte o conhecimento operacional adquirido em artefatos reutilizáveis:
  - Painéis administrativos e CRMs.
  - Portais web, dashboards e aplicativos.
  - Extensões de navegador (Chrome/Edge/Firefox MV3).
  - Automações Playwright/Puppeteer e documentação OpenAPI.
  *Regra não-negociável: O sistema reutiliza conceitos e fluxos de negócio aprendidos, mas nunca copia código-fonte ou ativos protegidos por propriedade intelectual de terceiros.*

### 1.4 Knowledge Extraction Engine & Reverse Engineering Assistant
- **Knowledge Extraction**: Extrai entidades, processos operacionais, formulários, validações e menus, alimentando o **Knowledge Graph** do tenant.
- **Reverse Engineering Assistant**: Converte o comportamento observado em uma especificação técnica agnóstica de fornecedor (arquitetura funcional, módulos, casos de uso, contratos de API REST/GraphQL e requisitos).

### 1.5 Repository Intelligence
- Conecta repositórios Git, analisa ASTs, mapeia dependências, identifica dívidas técnicas e compõe um backlog técnico priorizado com estimativas de risco e esforço.

### 1.6 Frontend Evolution Engine
- Realiza evolução contínua da interface do usuário (UI/UX):
  - Conecta páginas órfãs e reorganiza rotas de navegação.
  - Elimina componentes duplicados e padroniza Design System.
  - Garante acessibilidade (WCAG 2.1 AA) e responsividade.
  - Cria estados vazios (empty states) e estados de carregamento (loading skeletons).
  - Otimiza performance de renderização no navegador.

---

## 2. Mapa de Navegação & Grafo de Funcionalidades (Exemplo)

```
[Login Page]
 ├── Dashboard Overview
 │    ├── Analytics Widgets
 │    └── Quick Action Bar
 ├── Gestão de Clientes
 │    ├── Tabela de Clientes (Filtros & Busca)
 │    ├── Formulário de Cadastro (Validações observadas)
 │    ├── Edição de Cadastro
 │    └── Histórico de Interações
 ├── Financeiro & Faturamento
 ├── Configurações do Sistema
 └── Logout / Encerramento de Sessão
```

---

## 3. Segurança, Autorização e Auditoria
- **Sessões Autenticadas**: Executa em contas de usuário sob autorização prévia e delegated credentials criptografadas em Secrets Manager.
- **Registro Auditável (`OperatorAuditLog`)**: Toda navegação e submissão de formulário é gravada em log append-only no PostgreSQL para auditoria de compliance e LGPD.
