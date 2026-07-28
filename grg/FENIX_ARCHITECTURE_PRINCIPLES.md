# FÊNIX Ω∞ — PRINCÍPIOS DE ARQUITETURA

Documento permanente. Define como o organismo evolui. Nenhuma missão futura pode
contrariá-lo sem uma migração arquitetural documentada. Nasceu de um caso concreto: a
MISSION-0002 pediu fundir Event Bus e Registries; a auditoria provou que eram camadas e
domínios corretos, não duplicação. A decisão do dono foi elevar essa correção a regra.

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
