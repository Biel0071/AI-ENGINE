# FÊNIX OS — DIAGNÓSTICO VISUAL QA

## ESTADO ATUAL (CHECKPOINT 95a8ae3)

### Backend
- ✅ Health check: OK
- ✅ Porta: 4400
- ✅ Testes: 272 passando
- ⚠️ APIs requerem autenticação

### Frontend Canônico
- 📍 Arquivo: `/workspace/grg/public/index.html`
- 📍 JS: `/workspace/grg/public/app.js`
- 📍 CSS: `/workspace/grg/public/styles.css`, `/city-overrides.css`

### AI City Atual
- ✅ View `#city` existe no HTML
- ✅ Elemento `#cityMap` renderiza distritos e prédios
- ✅ Função `renderCity()` mapeia dados reais da API
- ✅ Zoom básico (+/-) implementado
- ⚠️ Prédios são apenas botões retangulares
- ⚠️ Sem agentes visuais
- ⚠️ Sem movimento/animação
- ⚠️ Sem zoom semântico (mundo → cidade → prédio → sala → agente)
- ⚠️ Sem minimapa
- ⚠️ Sem camera pan/drag

### Login Flow
- ⚠️ Login requer interação JavaScript real
- ⚠️ Playwright headless não completou login automaticamente
- ✅ Botão `#loginButton` existe em `/GRG-login`

## PRÓXIMOS PASSOS (CICLO 1-5)

### CICLO 1: Validar UI existente no browser real
- Abrir http://localhost:4400/app manualmente
- Verificar se login ocorre
- Capturar screenshot real

### CICLO 2: Camera Controls
- Implementar pan/drag no cityViewport
- Melhorar zoom com wheel
- Adicionar minimapa

### CICLO 3: World Map Visual
- Substituir botões por prédios visuais (SVG/CSS)
- Adicionar estilo isométrico
- Criar ruas e conexões

### CICLO 4: Empresas
- Mapear projetos reais como empresas
- Exibir no mapa
- Clicar → abrir detalhes

### CICLO 5: Agentes Visuais
- Criar sprites/personagens leves
- Mapear agentes reais do backend
- Exibir no mapa

## REGRAS
- NÃO criar outro index.html
- NÃO apagar funcionalidades existentes
- Evoluir incrementalmente
- Testar no browser após cada alteração
- Backup git antes de mudanças
