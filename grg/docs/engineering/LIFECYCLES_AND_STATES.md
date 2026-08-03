# Padrões de Ciclo de Vida e Máquina de Estados (State Machine)

Para garantir a previsibilidade e governança, **todos** os módulos, plugins, capacidades e o próprio Kernel devem seguir uma State Machine unificada. Todos os clientes do OS sabem interpretar e reagir a esses estados.

## Estados Oficiais

1. **BOOT**
   - O componente está carregando configurações, conectando-se aos provedores de sistema e resolvendo dependências iniciais. Ainda não aceita chamadas de execução.
   - *Transições*: `-> READY`, `-> ERROR`

2. **READY**
   - Inicialização concluída e integridade (health check) validada. O componente está quente, mas inativo.
   - *Transições*: `-> ONLINE`, `-> ERROR`, `-> SHUTDOWN`

3. **ONLINE**
   - Estado operacional completo. Aceitando requisições do barramento (Event Bus) e clientes.
   - *Transições*: `-> BUSY`, `-> OFFLINE`, `-> ERROR`, `-> UPDATING`, `-> SAFE MODE`

4. **BUSY**
   - Carga máxima ou em processamento longo não-interrompível. Pode aplicar backpressure (rejeitar novos jobs ou enfileirá-los com prioridade baixa).
   - *Transições*: `-> ONLINE`, `-> ERROR`

5. **LEARNING**
   - Estado exclusivo de módulos cognitivos (Memory, Knowledge Graph, Mission Engine) quando estão consolidando contexto e atualizando vetores, reorganizando os grafos semânticos.
   - *Transições*: `-> ONLINE`, `-> READY`

6. **UPDATING**
   - Aplicando snapshot de atualização ou instalando nova versão do módulo. Nenhum I/O externo é aceito.
   - *Transições*: `-> ONLINE`, `-> RECOVERY` (em caso de falha de validação)

7. **ERROR**
   - Ocorreu uma falha grave não tratada ou perda de conexão crítica.
   - *Transições*: `-> RECOVERY`, `-> OFFLINE`, `-> SHUTDOWN`

8. **RECOVERY**
   - O módulo `IDoctor` assumiu o controle deste componente e está aplicando ações remediadoras (restart, rollback, limpeza de cache).
   - *Transições*: `-> READY` (se sucesso), `-> SAFE MODE` (se remediado com degradação), `-> OFFLINE` (se irrecuperável)

9. **SAFE MODE**
   - O sistema está operacional mas com capacidades reduzidas (ex: sem banco vetorial, fallback ativado no AI Gateway, sem plugins de rede não-essenciais).
   - *Transições*: `-> ONLINE` (quando a dependência crítica for restabelecida), `-> SHUTDOWN`

10. **OFFLINE**
    - Serviço desconectado do barramento e inacessível, mas processo ainda em memória.
    - *Transições*: `-> READY`, `-> SHUTDOWN`

11. **SHUTDOWN**
    - Processo de graceful exit em andamento (limpeza de filas pendentes, desconexão de sockets). É o estado final.

## Diagrama de Transição (Visualização Mental)

```text
       [ BOOT ] -----> [ READY ] -----> [ ONLINE ] <----> [ BUSY ]
                          |                 |
                          v                 v
                   [ SHUTDOWN ]        [ UPDATING ]
                          ^                 |
                          |                 v
                     [ ERROR ] <----- [ RECOVERY ]
                          |                 |
                          v                 v
                    [ OFFLINE ]      [ SAFE MODE ]
```
