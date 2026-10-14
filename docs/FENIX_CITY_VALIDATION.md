# FÊNIX OS — CITY VALIDATION PROTOCOL
## PROTOCOLO DE TESTES FACTUAIS & VISUAL REGRESSION GATE

> **PROTOCOLO DE VALIDAÇÃO DO MUNDO ESPACIAL**
> Nenhuma funcionalidade é declarada concluída sem verificação no navegador real, provas de console, inspeção de DOM e execução com Playwright.

---

## 1. Critérios de Aceitação Obrigatórios

1. **Navegação & Foco**:
   - Clicar na empresa "Depósito Mais" translada a câmera para o prédio e abre o Company Inspector com métricas factuais.
   - Clicar em "Mundo 2.5D", "Rede Cognitiva" ou "Living Office" alterna perfeitamente os modos visuais sem erros de console.
2. **Dock Modular**:
   - O dock inferior renderiza os 4 painéis com abas ativas, contagens honestas e responsividade.
3. **Criação de Agente**:
   - Criar um novo agente via UI ou chat do Fênix adiciona o agente à lista, ao backend e instancia o sprite no mundo.
4. **Despacho de Missão**:
   - Criar uma missão atribui um agente real e atualiza o checklist de progresso.
5. **Zero-Mock & Telemetria Real**:
   - Nenhuma métrica inventada no HTML inicial. Slots exibem `—` até carregarem da API.

---

## 2. Roteiro de Testes Automatizados (Playwright)

1. `test_world_initial_render`: Valida que o canvas Pixi inicializa e os distritos são desenhados.
2. `test_company_selection`: Simula o clique em "Depósito Mais", verifica a exibição do Company Inspector e dados cadastrais.
3. `test_modular_dock`: Valida a renderização dos painéis de Mapa Global, Agentes, Cutaway Predial e Missões.
4. `test_agent_creation_flow`: Envia requisição de criação de agente e verifica o spawn do novo sprite.
5. `test_network_view_switch`: Alterna para a visualização de grafo holográfico e valida os nós e arestas.
