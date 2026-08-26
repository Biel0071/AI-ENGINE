// DETECCAO DE RESPOSTA FABRICADA POR UM GATEWAY EXTERNO.
//
// MEDIDO NA API PLATFORM DA .215 (2026-07-30): com o registry de providers VAZIO
// (`GET /v1/models` devolve `providers: []`), o gateway responde **HTTP 200** com texto inventado
// em vez de falhar. Duas rotas do MESMO servidor discordam sobre honestidade:
//
//   /v1/text, /v1/chat        -> 503 NO_PROVIDER_AVAILABLE            (honesto: falha alto)
//   /v1/chat/completions      -> 200 {"content": "[Fallback Response] Processado via groq",
//                                     "usage": {"completion_tokens": 30},
//                                     "system_fingerprint": "fp_ai_platform_groq"}
//   /v1/embeddings            -> 200 com 1536 floats ALEATORIOS: o mesmo input em duas chamadas
//                                deu vetores completamente diferentes, e embedding real e
//                                DETERMINISTICO. Pior caso de todos -- um indice vetorial
//                                construido com ruido nunca da erro, so devolve vizinho errado.
//
// Por que isto vive no FENIX e nao so no gateway: o gateway e outro produto e evolui sem aviso.
// Se o FENIX aceitar 2xx como prova de geracao, ele grava texto inventado como telemetria de IA --
// com tokens e custo contados -- e o painel exibe isso como medicao. Seria a mesma mentira que o
// `simulation-audit` persegue dentro de `src/`, entrando pela porta da rede.
//
// A regra e a de sempre: preferir erro alto a sucesso falso. Quem chama decide o que fazer com o
// erro (o connection-manager grava OFFLINE com o motivo; o router troca de provider).
const FABRICATED_MARKERS = Object.freeze([
  '[fallback response]',
  '[mock response]',
  '[simulated response]',
  '[placeholder response]',
]);

// Marcador no INICIO da resposta: o gateway prefixa a mensagem. Limitar a janela evita acusar um
// texto legitimo que por acaso discuta o assunto (uma resposta explicando o proprio anti-padrao,
// por exemplo) -- e o custo de varrer a resposta inteira em toda geracao.
function detectFabricated(text) {
  const probe = String(text || '').slice(0, 200).toLowerCase();
  return FABRICATED_MARKERS.find((marker) => probe.includes(marker)) || null;
}

function assertNotFabricated(text, { provider = 'gateway', endpoint = '' } = {}) {
  const marker = detectFabricated(text);
  if (marker) {
    throw new Error(
      `${provider} devolveu resposta FABRICADA${endpoint ? ` em ${endpoint}` : ''} (marcador "${marker}"): `
      + 'o gateway respondeu 2xx sem nenhum provider real gerando. '
      + 'Verifique o registry do gateway (ex.: GET /v1/models -> "providers": []).',
    );
  }
  return text;
}

// Embedding fabricado nao tem marcador de texto -- e ruido numerico com forma correta. A unica
// prova barata e a NAO-DETERMINANCIA: o mesmo input, embutido duas vezes, tem de dar o mesmo
// vetor. Esta funcao compara dois vetores do mesmo input e acusa quando diferem.
// Nao e chamada em todo embed (dobraria o custo): serve ao preflight/selfTest, onde pagar duas
// chamadas uma vez e barato comparado a construir um indice inteiro sobre ruido.
function assertDeterministicEmbedding(first, second, { provider = 'gateway', tolerance = 1e-9 } = {}) {
  if (!Array.isArray(first) || !Array.isArray(second) || !first.length) {
    throw new Error(`${provider}: embedding ausente ou vazio; nao ha o que verificar`);
  }
  if (first.length !== second.length) {
    throw new Error(`${provider}: embeddings do MESMO input tem dimensoes diferentes (${first.length} vs ${second.length})`);
  }
  const divergentes = first.reduce((total, value, index) => total + (Math.abs(Number(value) - Number(second[index])) > tolerance ? 1 : 0), 0);
  if (divergentes > 0) {
    throw new Error(
      `${provider} devolveu embedding NAO-DETERMINISTICO: ${divergentes}/${first.length} dimensoes `
      + 'divergem para o mesmo input. Embedding real e deterministico -- isto e ruido aleatorio '
      + 'com forma de vetor, e um indice construido sobre ele devolve vizinhos sem sentido sem nunca falhar.',
    );
  }
  return true;
}

module.exports = { assertNotFabricated, detectFabricated, assertDeterministicEmbedding, FABRICATED_MARKERS };
