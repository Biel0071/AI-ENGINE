# FÊNIX Ω∞ — CONSTITUIÇÃO DE ENGENHARIA

Documento permanente e único de governança (Princípio 6: não duplicar — esta é a
Constituição, não há um segundo arquivo competindo). Define como o organismo evolui.
Nenhuma missão futura pode contrariá-lo sem uma migração arquitetural documentada. Nasceu
de um caso concreto: a MISSION-0002 pediu fundir Event Bus e Registries; a auditoria provou
que eram camadas e domínios corretos, não duplicação. A decisão do dono foi elevar essa
correção a regra, e depois a uma Constituição de dez princípios.

## A regra soberana

> **O código real é a fonte da verdade.**

Quando uma missão, um documento antigo ou uma suposição contradiz o que o código
demonstra, o código vence. Documentos servem ao código, não o contrário.

## Os seis princípios

1. **Arquitetura antes de funcionalidades.** Mapear e entender precede implementar. Toda
   mudança começa por localizar o que já existe.

2. **Evidências antes de alterações.** Nenhuma mudança sem medição que a justifique. "Acho
   que" não é razão; "o scan mostra" é.

3. **Consolidação antes de expansão.** Reduzir duplicação e aumentar cobertura vale mais
   que adicionar superfície nova. O patrimônio cognitivo supera funcionalidade nova.

4. **Não criar módulos equivalentes.** Se existe funcionalidade equivalente, estende-se ou
   reusa-se. Um módulo novo exige justificativa técnica documentada de por que o existente
   não serve.

5. **Não fundir responsabilidades distintas.** Duplicação é a mesma responsabilidade em
   dois lugares. Camadas (persistência vs notificação) e domínios (5 registries de coisas
   diferentes) NÃO são duplicação. Fundi-los é regressão, não consolidação.

6. **O código real prevalece sobre documentos antigos.** Um `.md` desatualizado é dívida,
   não autoridade. O GENOME e este arquivo são vivos: atualizam-se quando o código muda.

## Capacidade permanente: divergência missão × arquitetura

Sempre que uma missão entrar em conflito com a arquitetura real, o procedimento é:

```
1. INTERROMPER a implementação literal
2. DOCUMENTAR a divergência (o que a missão pede × o que o código mostra)
3. PROPOR uma missão corrigida com justificativa técnica
4. AGUARDAR decisão sobre a versão corrigida
```

Isto não é insubordinação — é o trabalho do Arquiteto Permanente. Executar uma missão que
piora a arquitetura seria a falha, não a recusa.

## Ordem de evolução (fixa)

```
Auditoria → Cobertura de testes → Validação → Consolidação por evidência → Evolução
```

Consolidar sem cobertura viola "o organismo permanece operacional durante a evolução":
uma fusão sem teste quebra em silêncio. Por isso cobertura precede consolidação, sempre.

## Gates de qualidade (toda mudança)

- `node --test test/` verde antes de PR.
- `simulation-audit`: 0 sinais falsos, 0 módulos simulated/stub.
- Contrato `measured()`/`unknown()`: nenhum valor inventado; ausência é `unknown`, não zero.
- Uma entrega por branch; merge só por PR; produção só por autorização humana.

## Os dez princípios da Constituição

Os seis acima são a base; estes dez são a forma completa, fixada após a MISSION-0004.

1. **Reality First** — código medido > documentação > visão. A visão orienta; o código decide.
2. **Composition Before Creation** — existe algo equivalente? Compor. Só criar se não existir,
   com justificativa documentada. (MISSION-0004: o Connector Runtime compôs o `GitHubConnector`
   existente em vez de reimplementar HTTP.)
3. **Evidence Driven** — toda capacidade prova; nunca declara. Sem selfTest/medição, não há estado.
4. **Capability Levels** — estado é degrau medido, nunca rótulo. A escada **medível hoje**:
   ```
   PLANNED → IMPLEMENTED → CONFIGURED → AUTHENTICATED → CONNECTED (selfTest ok) → ACTIVE (serviu operação real)
                                                       ↘ DEGRADED / ERROR / DISCONNECTED
   ```
   `HEALTHY` e `OPERATIONAL` ficam **PLANNED** até existir evidência que os separe de
   `SELFTEST_PASS`/`ACTIVE` — criar degrau sem medição que o distinga seria inventar
   granularidade, o que o Princípio 3 proíbe. A escada cresce por medição, não por nome.
5. **Evolution Safety** — o organismo nunca altera produção direto. Missão → branch → testes
   → benchmark → PR → review → deploy. Produção só por autorização humana sobre evidência.
6. **No Duplicate Intelligence** — se existe, reutilizar. Vale para código E para governança
   (por isso a Constituição é um arquivo só).
7. **Everything Is A Capability** — GitHub, Google, Builder, Vision, Mission: tudo é capability
   com estado medido na Reality Capability Matrix do GENOME.
8. **Self Awareness** — o organismo conhece seu estado e nunca mente. `GET /api/connectors`
   deriva o estado real; PLANNED aparece como PLANNED.
9. **Measured Architecture** — toda decisão responde: por que existe? quem usa? qual
   dependência? qual teste? qual benchmark? qual medição?
10. **Living DNA** — cada commit registra o que mudou, o que melhorou, o que piorou, o que
    pode ser reutilizado ou removido. A mensagem de commit carrega essa prestação de contas.

## Modo de operação: ARCHITECTURE FREEZE (vigente após MISSION-0004)

O `CLAUDE.md` do repositório já declara a arquitetura congelada. Operacionalizando: durante
o freeze, são permitidos apenas — reduzir duplicação, melhorar performance, testes,
documentação, observabilidade, consolidar contratos, estabilizar APIs, revisar arquitetura.
**Nenhuma capacidade nova entra** até o núcleo atingir a maturidade que o dono definir
(cobertura instrumentada por `c8`, contratos estáveis, conectores essenciais provados por
selfTest). O marco de saída do freeze é decisão do dono, sobre evidência medida.
