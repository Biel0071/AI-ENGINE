# FÊNIX Ω∞ — PROGRAM RUNTIME

Como um Programa é executado — **sem novo runtime**. O Programa não roda nada por conta
própria; ele agrupa missões que o Mission Runtime + BullMQ (existentes) executam.

## Composição (nada novo executa)

```
Executive Brain            (decide: decompõe + agrupa)
   └─ Program (estado no store: objetivo + refs de missão)
        └─ para cada missão: mission-planner.plan()   ← RC1, intacto
             └─ Mission Runtime (materializa)          ← RC1
                  └─ BullMQ jobs                        ← RC1
                       └─ AI Router → Gateway → Providers ← RC1
```

O Program Runtime é uma projeção: lê o estado das missões referenciadas e deriva o estado do
Programa. Não tem fila própria, não tem worker próprio, não executa IA.

## Onde vive o estado

Uma coleção nova `programs` no store (schema futuro, na implementação — não neste
entregável). Cada Programa guarda `missions: [missionId...]` — **referências**, não cópias.
O Mission Runtime continua a fonte da verdade das missões.

## Agregações (todas derivadas, medidas)

- **progresso** = média/rollup do progresso das missões referenciadas.
- **custo** = soma do custo real das missões (de `aiCalls`, não estimado).
- **qualidade** = `unknown` honesto até existir sinal de resultado por missão.
- **estado** = derivado (ver PROGRAM_LIFECYCLE.md), nunca escrito à mão.

## O que NÃO existe ainda

A implementação (coleção `programs`, o loop que reconcilia estado, os endpoints) é missão
futura. Este documento descreve o desenho; não há Program Runtime rodando hoje.
