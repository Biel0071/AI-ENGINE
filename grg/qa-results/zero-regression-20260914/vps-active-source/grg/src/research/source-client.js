const { ValidationError } = require('../kernel/errors');
const { withRetry } = require('../infrastructure/resilience/retry');
const { CircuitBreaker } = require('../infrastructure/resilience/circuit-breaker');

// V11 — cliente de fonte de pesquisa.
//
// Este e o unico ponto do FENIX que faz requisicao de saida para a internet aberta, e por
// isso ele e a superficie de ataque mais sensivel da plataforma: um loop automatico
// rodando 24/7 que busca conteudo externo e o transforma em conhecimento. As restricoes
// aqui nao sao preferencia de estilo, cada uma fecha um caminho concreto:
//
//   allowlist de dominios  → sem ela, um objetivo de missao com uma URL dentro viraria
//                            requisicao arbitraria a partir do servidor (SSRF).
//   somente HTTPS e GET    → nenhuma escrita sai daqui, e nada em claro.
//   sem redirect cross-host→ redirect e o desvio classico da allowlist: o host aprovado
//                            responde 302 para um host que nao esta nela.
//   maxBytes               → resposta sem teto travaria o processo do runtime vivo.
//   rate limit por host    → o loop de pesquisa nao pode martelar a fonte.
//   cache por URL com TTL  → e o que faz o loop rodar a cada 5 min sem repetir requisicao.
//
// DESLIGADO POR PADRAO (`FENIX_RESEARCH_ENABLED`). Desligado, nenhuma requisicao sai da
// maquina e quem chama recebe o motivo — nao um resultado vazio que pareceria "pesquisei e
// nao achei nada".
const DEFAULT_ALLOWLIST = Object.freeze([
  'api.github.com',
  'registry.npmjs.org',
  'pypi.org',
  'www.rfc-editor.org',
]);

const DEFAULT_LIMITS = Object.freeze({
  timeoutMs: 10_000,
  maxBytes: 1_048_576,
  cacheTtlMs: 900_000,
  minIntervalMs: 1_000,
  attempts: 2,
});

class ResearchDisabledError extends Error {
  constructor() {
    super('the research source client is disabled: set FENIX_RESEARCH_ENABLED=1 to allow outbound requests to the approved allowlist');
    this.name = 'ResearchDisabledError';
    this.code = 'RESEARCH_DISABLED';
  }
}

class SourceNotAllowedError extends Error {
  constructor(host, allowlist) {
    super(`research host is not on the allowlist: ${host}`);
    this.name = 'SourceNotAllowedError';
    this.code = 'SOURCE_NOT_ALLOWED';
    this.host = host;
    this.allowlist = [...allowlist];
  }
}

class ResearchSourceClient {
  constructor(options = {}) {
    const env = options.env || process.env;
    this.enabled = options.enabled ?? parseFlag(env.FENIX_RESEARCH_ENABLED, false);
    this.allowlist = new Set(options.allowlist || parseAllowlist(env.FENIX_RESEARCH_ALLOWLIST) || DEFAULT_ALLOWLIST);
    this.limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
    this.store = options.store || null;
    this.fetchImpl = options.fetchImpl || ((...args) => fetch(...args));
    this.clock = options.clock || (() => Date.now());
    this.userAgent = options.userAgent || 'GRG-FENIX-Research/1.0 (+https://github.com/grg-services)';
    // Uma fonte que esta fora do ar nao pode ser tentada a cada tick para sempre.
    this.breakers = new Map();
    // Rate limit e in-process: o lease do runtime vivo garante um supervisor por vez.
    this.lastRequestAt = new Map();
    this.requestCount = 0;
  }

  // O estado que o Research Loop e o relatorio de prontidao consultam antes de tentar.
  status() {
    return {
      enabled: this.enabled,
      allowlist: [...this.allowlist],
      limits: { ...this.limits },
      cacheBacked: Boolean(this.store),
      requests: this.requestCount,
      breakers: [...this.breakers.values()].map((breaker) => breaker.snapshot()),
    };
  }

  // Valida sem fazer requisicao. Separado de `get` para o chamador poder recusar uma URL
  // antes de entrar no caminho de rede.
  assertAllowed(rawUrl) {
    let url;
    try {
      url = new URL(String(rawUrl));
    } catch {
      throw new ValidationError(`invalid research url: ${String(rawUrl).slice(0, 200)}`);
    }
    // HTTP em claro nao e aceito nem para host aprovado: o conteudo alimenta conhecimento.
    if (url.protocol !== 'https:') throw new ValidationError(`research requests must use https: ${url.protocol}`);
    if (url.username || url.password) throw new ValidationError('research urls must not carry credentials');
    if (!this.allowlist.has(url.hostname)) throw new SourceNotAllowedError(url.hostname, this.allowlist);
    return url;
  }

  async get(rawUrl, options = {}) {
    const url = this.assertAllowed(rawUrl);
    // A verificacao de habilitacao vem DEPOIS da allowlist de proposito: uma URL invalida
    // ou fora da lista e erro de programacao, e deve aparecer mesmo com o cliente
    // desligado — senao o defeito so surgiria no dia em que alguem habilitasse.
    if (!this.enabled) throw new ResearchDisabledError();

    const cached = await this.#readCache(url.href);
    if (cached) return cached;

    await this.#respectRateLimit(url.hostname);

    const breaker = this.#breaker(url.hostname);
    const response = await breaker.execute(() => withRetry(
      () => this.#fetchOnce(url),
      {
        attempts: this.limits.attempts,
        baseDelayMs: 250,
        retryable: (error) => error.retryable === true,
      },
    ));

    await this.#writeCache(response);
    return response;
  }

  // Cada resposta carrega a origem e o momento. Sem isso um achado de pesquisa seria
  // indistinguivel de uma afirmacao inventada.
  async #fetchOnce(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('research request timed out')), this.limits.timeoutMs);
    const startedAt = this.clock();
    try {
      const response = await this.fetchImpl(url.href, {
        method: 'GET',
        // `manual` para NAO seguir redirect automaticamente: quem segue e o codigo abaixo,
        // e so quando o destino tambem esta na allowlist.
        redirect: 'manual',
        headers: { accept: 'application/json, text/plain;q=0.9, */*;q=0.5', 'user-agent': this.userAgent },
        signal: controller.signal,
      });

      if (isRedirect(response.status)) {
        const location = response.headers?.get?.('location');
        const target = location ? safeResolve(location, url) : null;
        if (!target) {
          const error = new Error(`research source returned ${response.status} without a usable location header`);
          error.retryable = false;
          throw error;
        }
        if (target.hostname !== url.hostname) {
          // NAO seguimos. Um host aprovado nao pode servir de trampolim para outro.
          throw new SourceNotAllowedError(target.hostname, this.allowlist);
        }
        return this.#fetchOnce(target);
      }

      const body = await readCapped(response, this.limits.maxBytes);
      if (!response.ok) {
        const error = new Error(`research source ${url.hostname} responded ${response.status}`);
        error.retryable = response.status === 429 || response.status >= 500;
        error.status = response.status;
        throw error;
      }

      this.requestCount += 1;
      return {
        url: url.href,
        host: url.hostname,
        status: response.status,
        contentType: response.headers?.get?.('content-type') || null,
        bytes: body.bytes,
        truncated: body.truncated,
        body: body.text,
        json: parseJson(body.text),
        fetchedAt: new Date(startedAt).toISOString(),
        durationMs: this.clock() - startedAt,
        cacheHit: false,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  #breaker(host) {
    if (!this.breakers.has(host)) {
      this.breakers.set(host, new CircuitBreaker({ name: `research:${host}`, failureThreshold: 3, resetTimeoutMs: 60_000, clock: this.clock }));
    }
    return this.breakers.get(host);
  }

  async #respectRateLimit(host) {
    const last = this.lastRequestAt.get(host);
    const wait = last == null ? 0 : this.limits.minIntervalMs - (this.clock() - last);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.lastRequestAt.set(host, this.clock());
  }

  async #readCache(href) {
    if (!this.store) return null;
    const state = await this.store.read();
    const entry = (state.researchSourceCache || []).find((item) => item.url === href);
    if (!entry) return null;
    if (this.clock() - Date.parse(entry.fetchedAt) > this.limits.cacheTtlMs) return null;
    return { ...entry, json: parseJson(entry.body), cacheHit: true };
  }

  async #writeCache(response) {
    if (!this.store) return;
    // `json` fica fora do store: e derivado de `body` e duplicaria o custo de escrita num
    // documento unico que e reserializado inteiro a cada update.
    const entry = {
      url: response.url, host: response.host, status: response.status, contentType: response.contentType,
      bytes: response.bytes, truncated: response.truncated, body: response.body,
      fetchedAt: response.fetchedAt, durationMs: response.durationMs,
    };
    await this.store.update((state) => {
      state.researchSourceCache = (state.researchSourceCache || []).filter((item) => item.url !== entry.url);
      state.researchSourceCache.push(entry);
      return state;
    });
  }
}

// Le no maximo maxBytes. Uma resposta sem teto travaria o processo do runtime vivo — e o
// truncamento fica DECLARADO, senao um corpo cortado passaria por conteudo completo.
async function readCapped(response, maxBytes) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    const buffer = Buffer.from(text, 'utf8');
    return buffer.byteLength > maxBytes
      ? { text: buffer.subarray(0, maxBytes).toString('utf8'), bytes: maxBytes, truncated: true }
      : { text, bytes: buffer.byteLength, truncated: false };
  }
  const chunks = [];
  let bytes = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    if (bytes + chunk.byteLength > maxBytes) {
      chunks.push(chunk.subarray(0, maxBytes - bytes));
      bytes = maxBytes;
      truncated = true;
      await reader.cancel?.();
      break;
    }
    chunks.push(chunk);
    bytes += chunk.byteLength;
  }
  return { text: Buffer.concat(chunks).toString('utf8'), bytes, truncated };
}

function isRedirect(status) { return [301, 302, 303, 307, 308].includes(Number(status)); }
function safeResolve(location, base) { try { return new URL(location, base); } catch { return null; } }
function parseJson(text) { try { return JSON.parse(text); } catch { return null; } }
function parseFlag(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}
function parseAllowlist(value) {
  if (!value) return null;
  const hosts = String(value).split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  // Um host malformado na variavel de ambiente nao pode virar allowlist silenciosa.
  for (const host of hosts) if (!/^[a-z0-9.-]+$/.test(host)) throw new ValidationError(`invalid research allowlist host: ${host}`);
  return hosts.length ? hosts : null;
}

// Adaptador para o ExternalSearchService, que espera `search(query) -> [{title,url,...}]`.
// Ele recebia `null` e devolvia NOT_IMPLEMENTED. Nao ha buscador web na allowlist (e nao
// deveria haver um por padrao), entao a "busca" e sobre os indices aprovados: o registry do
// NPM e a busca de repositorios do GitHub. Cada item carrega a URL de onde veio.
//
// Desligado, o adaptador LANCA em vez de devolver lista vazia — o ExternalSearchService
// converte a falha em NOT_IMPLEMENTED/FAILED com o motivo. Uma lista vazia seria lida como
// "procurei e nao achei nada", que e uma afirmacao diferente.
function createResearchSearchClient(client) {
  if (!client) return null;
  return {
    async search(query) {
      const term = String(query || '').trim();
      if (!term) return [];
      const results = [];
      const npm = await client.get(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(term)}&size=5`);
      for (const item of npm.json?.objects || []) {
        const pkg = item.package || {};
        results.push({
          title: pkg.name ? `${pkg.name}@${pkg.version || 'unknown'}` : 'unknown package',
          url: pkg.links?.npm || `https://www.npmjs.com/package/${pkg.name || ''}`,
          // O snippet e a descricao PUBLICADA pelo pacote, nao um texto gerado sobre a busca.
          snippet: String(pkg.description || '').slice(0, 500),
          source: npm.host,
          fetchedAt: npm.fetchedAt,
        });
      }
      return results;
    },
  };
}

module.exports = {
  ResearchSourceClient, ResearchDisabledError, SourceNotAllowedError, createResearchSearchClient,
  DEFAULT_ALLOWLIST, DEFAULT_LIMITS, readCapped, parseAllowlist,
};
