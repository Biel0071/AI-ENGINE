# GRG SPACE — World, chat e voz: estado desta fatia

Data: 2026-10-20

## Implementado e verificado localmente

- `#command`, `#home` e `#dashboard` redirecionam para a Cidade.
- `#projects/<id>/screens` abre o Project Hub, seleciona o projeto e ativa Screen DNA.
- O botão Screen DNA continua usando o catálogo observado do projeto e preserva o estado vazio quando não há telas absorvidas.
- Conversas Fast Lane globais não resolvem mais um workspace implícito; a resposta continua sendo fornecida pelo roteador/provedor real.
- Conversas persistidas no servidor são carregadas na sidebar e seus turnos são recuperados pelo endpoint autenticado de histórico. Mensagem inicial fictícia removida de novas conversas.
- Alterações e tarefas que exigem confirmação geram uma missão persistida em estado planejado, sem iniciar worker. A sidebar mostra ação explícita de confirmar; a rota autenticada de início só é chamada após confirmação no navegador. Aprovação interna da etapa continua ativa quando exigida pelo Mission Kernel.
- Sidebar oferece gravação por mensagem: MediaRecorder → transcrição API Platform → conversa Fênix com origem `voice` → TTS API Platform. O áudio bruto não é persistido. A interface informa falhas do provider e permite interromper a fala.
- API Platform corrige STT para multipart com bytes de áudio reais e TTS para retornar bytes de áudio reais em Base64, sem placeholder.

## Verificação

| Verificação | Estado | Evidência |
| --- | --- | --- |
| Conversa, classificação e proposta de missão | PASS | `node --test test/conversation-route-real-runtime.test.js` |
| Cidade legada e Screen DNA direto | PASS | `node --test test/project-screen-dna-reality.test.js` |
| Persistência e memória de conversa | PASS | `node --test test/conversation-store.test.js` |
| Validação de payload do proxy de voz | PASS | `node --test test/live-chat-voice-proxy.test.js` |
| STT multipart e bytes TTS | PASS | `npm test -w apps/api -- --run tests/openai-compatible-audio.test.ts` (API Platform separado) |
| Build do pacote compartilhado API Platform | PASS | `npm run build -w packages/shared` |
| Fluxo de missão com aprovação e memória | PASS* | Os dois cenários imprimiram PASS; o processo manteve handles abertos e precisou ser interrompido após as asserções.
| Voz com provider real implantado na VPS | PENDING | Código local e testes de provider não demonstram provider de áudio nem versão implantada.
| Sessão contínua de voz com VAD | PENDING | Esta fatia implementa gravação por mensagem e resposta falada; não declara sessão contínua pronta.
| Layouts no navegador em 375/768/1280/1920 px | PENDING | Não houve reimplantação nem teste visual da versão local nestas quatro larguras.
| Publicação na VPS | PENDING | Nenhuma alteração foi enviada ou publicada.

`git diff --check` no checkout completo também aponta whitespace anterior em arquivos fora desta fatia; essas alterações preexistentes não foram limpas para evitar mudanças colaterais.
