# GRG SPACE — próximo plano executável

Base: evidências em [GRG_SPACE_CURRENT_STATE.md](./GRG_SPACE_CURRENT_STATE.md) e lacunas em [GRG_SPACE_GAP_ANALYSIS.md](./GRG_SPACE_GAP_ANALYSIS.md).

1. **Mapear o serviço `:3000`**: identificar origem do listener, entrypoint e arquivos servidos; comparar hash do código local/deployado/em execução. Não ler ou registrar envs secretos.
2. **Corrigir o caminho workspace do chat**: manter allowlist por project ID e caminho canônico exato; não confiar em `projectPath` do cliente. Testar rejeição de traversal e aceitação só do path configurado.
3. **Validar conversa read-only**: pergunta curta, sem job/arquivo, via sidebar; capturar status, provider/modelo, duração e ID de conversa. Não fazer retry ilimitado.
4. **Provar a cadeia de job em ambiente controlado**: só depois de confirmar workers, limites de concorrência e recursos. Exigir job persistido, resultado real, evento e identidade do agente; cancelamentos/falhas não podem virar sucesso.
5. **Restaurar World/City**: rastrear agente e evento até SSE/UI; garantir que Inspector e Cidade usam o mesmo ID. Exibir estado indisponível enquanto faltar fonte real.
6. **Melhorar UI a partir de fluxo funcional**: testar chat/anexos, sidebar e layouts nos viewports acordados; preservar a correção responsiva já implantada e as evidências anteriores.
7. **Certificar runtime**: restart controlado somente após os passos anteriores, persistência confirmada, backup/restauração ensaiados e disco em limite seguro. Reboot apenas após restart passar.

## Gates

- **Não avançar para publicação** sem identificar o processo ativo e seu mecanismo de rollback.
- **Não ativar autonomia** sem job ponta a ponta, limites configurados e cancelamento testado.
- **Não declarar City/Agent online** sem heartbeat ou evento atualizado recebido.
- **Não certificar a VPS** com base apenas em HTTP 200, ticker da UI ou teste local.
