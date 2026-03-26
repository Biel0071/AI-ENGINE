# Learning Flow (Stabilized)

## Objetivo
Estabilizar aprendizagem incremental da camada de inteligencia sem alterar o runtime do core.

## Fluxo atual
1. Executa analise completa do projeto (`scan -> architecture -> diagnostics -> context -> tokenizer`).
2. Carrega baseline persistido em `memory/projects/{projectName}`.
3. Compara tokens atuais vs anteriores em `learningLoop`.
4. Classifica mudancas:
   - `added-token`
   - `updated-token`
   - `removed-token`
5. Gera melhorias orientadas pela quantidade/impacto de mudancas.
6. Persiste nova versao em:
   - `tokens.json`
   - `insights.json`
   - `history.json` (append-only)

## Regras de estabilidade
- Sem mudancas no core `dist`.
- Sem perda de historico em `history.json`.
- Incremento de versao em `tokens.json` e `insights.json` a cada analise.
- Baseline sempre recarregada da memoria persistida quando disponivel.

## Sinais de confiabilidade
- Toda mudanca recebe `confidence`.
- Toda mudanca carrega `sources`.
- Resultado de aprendizagem sempre inclui `changes` e `improvements`.

## Riscos conhecidos
- A qualidade da comparacao depende da qualidade dos tokens gerados.
- Mudancas de baixa granularidade podem gerar ruido (mitigado por dedupe no tokenizer).
