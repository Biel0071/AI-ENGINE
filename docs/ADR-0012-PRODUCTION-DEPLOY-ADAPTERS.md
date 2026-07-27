# ADR-0012: Deploy de produção real e adapters fail-closed

## Status

Aceito em 2026-07-27.

## Decisão

Adapters determinísticos permanecem disponíveis apenas para desenvolvimento e testes sob nomes
explícitos, com `productionSafe=false`. O composition root recusa iniciar em produção quando um
adapter de deploy não está configurado ou quando qualquer adapter selecionado não declara
`productionSafe=true`. Packagers de desenvolvimento seguem a mesma regra; produção começa sem
targets de empacotamento até receber toolchains reais explicitamente injetadas.

`FENIX_DEPLOY_DRIVER=docker` seleciona o primeiro adapter real. Ele constrói o Dockerfile gerado,
preserva a imagem anterior, substitui somente o container de nome determinístico e executa a nova
imagem. Não usa shell e valida IDs e o caminho do contexto contra o diretório de projetos gerados.

Containers executam com filesystem read-only, usuário não-root definido na imagem, capabilities
removidas, `no-new-privileges`, limites de CPU/memória/PIDs, tmpfs limitado e porta publicada apenas
em loopback. A rede `fenix-apps` precisa ser provisionada pelo instalador. Proxy/TLS ficam fora do
adapter e serão configurados no M3.

## Rollback

Antes do build, a imagem corrente é marcada como `-previous`. Rollback recusa operar se essa imagem
não existir, remove apenas o container determinístico do projeto/ambiente e inicia a imagem anterior
com as mesmas restrições. Banco e migrations exigem plano separado e aprovação; este rollback cobre
somente o workload.

O mesmo fail-closed se aplica ao AI Gateway: `EchoProvider` não é registrado em produção,
rotas `echo` são recusadas e toda rota deve apontar para um provider real configurado.

## Limitações

O ambiente desta auditoria não possui Docker Engine acessível, portanto os testes validam contrato,
argumentos, isolamento e ausência de shell com executor injetado. O smoke test real do daemon será
critério obrigatório do installer em uma VPS Linux suportada.
