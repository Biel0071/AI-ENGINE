# REA — vídeo de referência 1001656590.mp4

## Estado da análise

- **Frames:** extraídos por FFmpeg em 24 posições uniformes de 5 em 5 segundos, de 0 a 115 s.
- **Transcrição de áudio:** `PENDING` — `WHISPER_MODEL_NOT_CONFIGURED`. Não há fala reconhecida nem legenda SRT/VTT gerada.
- **Metadados medidos:** 129,63415 s; 720×1280; H.264 a 30 fps; AAC, 2 canais, 44.100 Hz.
- **SHA-256:** `89a272c7cb363e4d6fe0e59e5f410248df7103b32c69ca3381aaaef6543e4712`.
- **Artefato do runtime local:** `video-89a272c7cb36-1792458169543` — `/api/v2/system-reconstruction/video/video-89a272c7cb36-1792458169543`.
- **Manifesto:** `src/.data/reconstruction/videos/video-89a272c7cb36-1792458169543/manifest.json` (diretório local ignorado pelo Git).

Os horários abaixo indicam a posição do quadro amostrado. As frases são fragmentos de legenda visíveis dentro da imagem; não são transcrição certificada do áudio e podem começar ou terminar no meio de uma fala.

## Observado nos quadros

- A abertura exibe “ATUALIZAÇÃO — Todas as IAs. Uma única memória.”
- Há uma interface de memória com uma nuvem cerebral densa de pontos conectados, lista lateral, controles e painel de detalhes. As cores dos pontos variam.
- Em seguida, o vídeo mostra uma página de configuração e tutoriais para diferentes clientes. Rótulos legíveis incluem Anthropic, ChatGPT, Codex e terminal.
- A demonstração retorna ao grafo, seleciona e filtra subconjuntos e mostra relações em visualizações mais esparsas.
- Legendas queimadas legíveis nas amostras: `5s` “É sua memória unificada”; `15s` “senha”; `25s` “E já dá de cara com os”; `30s` “seguir o tutorial que tá”; `35s` “E aqui já vai para o”; `40s` “No Cloud e no Codex”; `45s` “cada um das IA’s”; `50s` “Cada lugar tem a sua”; `55s` “conectar no ChatGPT,”; `60s` “terminal, você”; `65s` “Feito isso, você vai já”; `70s` “pronto”; `75s` “Ó lá”; `80s` “E quando é amarelo, é”; `85s` “Você basta”; `90s` “ver melhor”; `100s` “Ele vai carregar a”; `105s` “para IA, não é para”; `110s` “O sistema, a gente usa”; `115s` “tecnologias aí de busca,”.

## Inferido a partir da demonstração

O padrão visual desejado é um grafo denso em forma de cérebro, navegável e vinculado a entidades e relações; filtros e seleção devem afetar a visualização, e a cor/legenda deve representar proveniência real. O vídeo também sugere memória partilhada entre ferramentas de IA, mas os quadros não provam que as integrações apresentadas estejam conectadas ou sincronizando dados.

## Estado correspondente no Fênix

- `GET /api/v2/graph/data` alimenta nós e relações reais. O canvas projeta as coordenadas 3D determinísticas em tela, permite rotação por arraste, seleção, busca e filtro por tipo; limita a visualização a 500 nós e 1.600 relações por renderização.
- A legenda de proveniência agora é calculada dos campos explícitos `provider`, `aiProvider`, `provenance.provider`, `origin` e `source`. Fontes ausentes não são estimadas; provedores desconhecidos aparecem com cor neutra e seu nome medido.
- A busca de registros persistidos continua separada das entidades do grafo. A contagem de nós não é apresentada como contagem de memórias persistidas.
- A API do decoder grava frames e manifesto no diretório de artefatos do runtime, mas a captura/transcrição completa depende de Whisper configurado. O endpoint recebe um caminho de arquivo no servidor; um fluxo de upload pelo navegador e despacho PC/VPS em fila ainda precisa ser concluído.

## Medido, ausente e pendente

- **Medido:** duração, dimensões, codecs, taxa de quadros, canais, sample rate, hash do arquivo e 24 imagens extraídas.
- **Ausente:** transcrição completa de áudio, timestamps de fala, SRT/VTT, OCR automático e detecção automática de mudança de cena.
- **Pendente neste PC:** instalar/configurar Whisper e modelo e executar inferência. O processo local mediu cerca de 0,54 GiB de memória física livre; o guard do decoder exige 1,5 GiB por padrão, então a inferência foi corretamente mantida pendente.
- **Pendente na VPS:** recursos e modelo Whisper não foram verificados agora. A VPS não deve receber esse job sem medir capacidade disponível.

## Critério para fechar esta referência

1. Configurar uma execução Whisper local ou selecionar um executor com memória livre suficiente.
2. Produzir SRT/VTT e conferir trechos duvidosos no áudio, mantendo timestamps e texto reconhecido separados das legendas queimadas observadas nos quadros.
3. Associar o relatório e os frames ao fluxo REA de upload/execução; registrar o destino PC ou VPS e o resultado real do job.
4. Validar o relatório e os frames pela API autenticada do runtime antes de marcar análise multimodal como concluída.
