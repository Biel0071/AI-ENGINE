// Streaming NDJSON do Ollama, em UM lugar. Tanto o OllamaProvider (caminho direto) quanto o
// AIPlatformProvider (quando ha GRG_OLLAMA_DIRECT_URL) consomem esta funcao -- duas copias do
// parser de NDJSON divergiriam no tratamento de fragmento partido entre chunks TCP, que e
// exatamente onde este tipo de codigo quebra.
//
// O Ollama emite uma linha JSON por token: {"response":"Ola","done":false} para /api/generate
// e {"message":{"content":"Ola"},"done":false} para /api/chat. Um chunk TCP pode cortar uma
// linha no meio, entao o buffer segura o resto ate o \n seguinte.
//
// Abort real: signal.abort() destroi a requisicao HTTP, o que faz o Ollama parar de gerar.
// Sem isso o "botao de interromper" pararia apenas a UI enquanto o servidor seguiria gastando
// GPU/CPU ate o fim -- o usuario veria pausa, nao interrupcao.
const http = require('node:http');
const https = require('node:https');

function streamFromOllama({ baseUrl, model, prompt = null, messages = null, temperature = 0.3, onToken, signal = null, timeoutMs = 300000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!baseUrl) return reject(new Error('ollama stream requires baseUrl'));
    if (!model) return reject(new Error('ollama stream requires model'));
    const chat = Array.isArray(messages) && messages.length > 0;
    const path = chat ? '/api/chat' : '/api/generate';
    const payload = chat
      ? { model, messages, stream: true, options: { temperature } }
      : { model, prompt: String(prompt || ''), stream: true, options: { temperature } };

    let u;
    try { u = new URL(baseUrl.replace(/\/$/, '') + path); } catch { return reject(new Error('ollama stream: bad base url')); }
    const lib = u.protocol === 'https:' ? https : http;
    const data = JSON.stringify(payload);

    // Sinal ja abortado: nao abrir socket nenhum. Criar a request para destrui-la em seguida
    // emitia ECONNRESET (medido) e, pior, gastava uma conexao com o Ollama para nada -- o
    // caso comum e o usuario cancelar antes do primeiro token.
    if (signal && signal.aborted) {
      return resolve({ text: '', streamed: false, aborted: true, model, chunks: 0 });
    }

    let text = '';
    let buffer = '';
    let tokens = 0;
    let aborted = false;
    let settled = false;
    const finish = (fn, arg) => { if (!settled) { settled = true; fn(arg); } };

    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) },
    }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => finish(reject, new Error(`ollama ${res.statusCode}: ${body.slice(0, 200)}`)));
        return;
      }
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buffer += chunk;
        let index = buffer.indexOf('\n');
        while (index >= 0) {
          const line = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 1);
          index = buffer.indexOf('\n');
          if (!line) continue;
          let frame;
          try { frame = JSON.parse(line); } catch { continue; }
          const piece = chat ? (frame.message ? frame.message.content : '') : frame.response;
          if (piece) {
            text += piece;
            tokens += 1;
            if (typeof onToken === 'function') {
              try { onToken(piece, frame); } catch { /* consumidor desconectado: seguir e fechar no done */ }
            }
          }
          if (frame.done) {
            finish(resolve, {
              text,
              streamed: true,
              aborted,
              model: frame.model || model,
              chunks: tokens,
              promptTokens: frame.prompt_eval_count || 0,
              completionTokens: frame.eval_count || tokens,
            });
          }
        }
      });
      // Fim de resposta sem frame done: acontece quando a conexao e cortada (abort do usuario
      // ou queda de rede). Resolvemos com o que chegou e marcamos -- o texto parcial e real.
      res.on('end', () => finish(resolve, { text, streamed: true, aborted, model, chunks: tokens, truncated: true }));
      res.on('error', (error) => (aborted ? finish(resolve, { text, streamed: true, aborted: true, model, chunks: tokens }) : finish(reject, error)));
    });

    if (signal) {
      // Resolver AQUI, no proprio abort, e nao esperar um evento da resposta destruida.
      // req.destroy() no meio de um handler res.on('data') nao garante 'end' nem 'error' --
      // medido: a promise ficava pendente para sempre e o processo travava. Em producao isso
      // seria uma request HTTP pendurada por conexao interrompida, vazando handles ate o
      // servidor parar de aceitar conexoes. O texto parcial acumulado e real e vai embora
      // com a resposta.
      signal.addEventListener('abort', () => {
        aborted = true;
        req.destroy();
        finish(resolve, { text, streamed: true, aborted: true, model, chunks: tokens });
      }, { once: true });
    }

    req.on('error', (error) => (aborted
      ? finish(resolve, { text, streamed: true, aborted: true, model, chunks: tokens })
      : finish(reject, error)));
    req.setTimeout(timeoutMs, () => req.destroy(new Error('ollama stream timeout')));
    req.end(data);
  });
}

module.exports = { streamFromOllama };
