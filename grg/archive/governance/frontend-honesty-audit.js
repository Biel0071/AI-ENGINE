const fs = require('node:fs');
const path = require('node:path');

// Auditor de honestidade do FRONTEND.
//
// O simulation-audit varre src/ e nunca olhou public/. Isso deixou um ponto cego grande:
// o backend podia estar 100% honesto e a TELA continuar mentindo, porque o numero estava
// escrito a mao no HTML. Medido em 2026-07-30, o painel afirmava "Master Uptime 99.99%",
// "Docker Containers 12 Ativos", "Speed Score 96.4", "820,000 Knowledge Graph Nodes",
// "4.281 Capabilities", "150 Volumes", "15 Agentes" e um briefing com "14 melhorias,
// 3 bugs, 2 MCPs, 7 papers" -- nenhum vindo de API. Para o usuario, uma metrica falsa na
// tela e indistinguivel de uma metrica falsa no servidor: as duas mentem igual.
//
// A regra que este auditor aplica: todo VALOR que afirma estado do mundo (metrica,
// contagem, score, percentual, versao, status de saude) deve chegar por JS a partir de uma
// resposta de API. O HTML pode conter o ROTULO e o marcador de ausencia ("—"), nunca o valor.
//
// Uso: const { auditFrontend } = require('./frontend-honesty-audit'); auditFrontend(publicDir)

// Marcadores de ausencia honesta. Um destes num slot de valor e o comportamento CORRETO:
// significa "ainda nao medi", que e o que a Regra 2 exige.
const HONEST_PLACEHOLDERS = new Set(['—', '-', '--', '...', '…', '', '0%', 'N/A', '&mdash;']);

const FAKE_SIGNALS = [
  // Percentual afirmado como fato dentro de tag de valor: <b>99.99%</b>, <strong>67%</strong>.
  // Restrito a tags de VALOR (b/strong/span com classe de valor) para nao punir texto
  // corrido explicativo, que e prosa e nao alegacao de telemetria.
  {
    id: 'html-hardcoded-percent',
    rx: /<(b|strong)\b[^>]*>\s*[+-]?\d{1,3}(?:[.,]\d+)?\s*%\s*<\/\1>/gi,
    why: 'percentual escrito no HTML: nao pode vir de medicao',
  },
  // Uptime/disponibilidade: o numero mais tentador de inventar, porque quase sempre e alto.
  {
    id: 'html-hardcoded-uptime',
    rx: /(uptime|disponibilidade|availability)[^<]{0,40}<[^>]*>\s*\d[\d.,]*\s*%/gi,
    why: 'uptime escrito no HTML',
  },
  // Contagem de recursos: "12 Ativos", "128 agentes", "342 workers", "4.281 Capabilities".
  // Exige a unidade por perto para nao casar com numeracao de secao ou versao.
  {
    id: 'html-hardcoded-count',
    rx: /<(b|strong|span)\b[^>]*>\s*\d[\d.,]*\s*(ativos?|agentes?|workers?|containers?|capabilities|volumes?|jobs?|missoes|miss[oõ]es|projetos?|n[oó]s|nodes?)\b/gi,
    why: 'contagem de recursos escrita no HTML',
  },
  // Score/nota como valor fixo: <span class="score">96.4</span>.
  {
    id: 'html-hardcoded-score',
    rx: /class="[^"]*\b(score|count|metric-value)\b[^"]*"[^>]*>\s*[\d]+[\d.,]*\s*</gi,
    why: 'score/contagem fixo em slot de valor',
  },
  // Selo de saude afirmado: HEALTHY, ONLINE, READY dentro de tag de valor. O estado de um
  // servico so pode vir de probe. Excluido o prefixo negativo/desconhecido de proposito:
  // OFFLINE, UNKNOWN, SEM DADOS sao a resposta honesta e nao devem ser punidos.
  {
    id: 'html-hardcoded-health',
    rx: /<(b|strong)\b[^>]*>\s*(?!UN|N[AÃ]O|SEM|OFF)(HEALTHY|ONLINE|READY|ACTIVE|OPERATIONAL|SUCCEEDED|PASSED)\s*<\/\1>/gi,
    why: 'status de saude afirmado no HTML sem probe',
  },
  // Versao de produto afirmada: v2.5.0, 1.8.3. A versao real vem do registry/deploy.
  {
    id: 'html-hardcoded-version',
    rx: /<(b|strong|span)\b[^>]*>\s*v?\d+\.\d+\.\d+\s*<\/\1>/gi,
    why: 'versao escrita no HTML: deve vir do registry',
  },
  // Moeda/custo afirmado: $342.18, R$ 1.200.
  {
    id: 'html-hardcoded-cost',
    rx: /<(b|strong)\b[^>]*>\s*(?:R\$|\$|US\$)\s*\d[\d.,]*\s*<\/\1>/gi,
    why: 'custo escrito no HTML',
  },
  // Latencia afirmada: 38ms, 142 ms.
  {
    id: 'html-hardcoded-latency',
    rx: /<(b|strong)\b[^>]*>\s*\d[\d.,]*\s*m?s\s*<\/\1>/gi,
    why: 'latencia escrita no HTML',
  },
  // Log de console pre-escrito no HTML. O console deve receber eventos reais do bus; linha
  // de log estatica finge atividade que nunca aconteceu.
  {
    id: 'html-fake-log-line',
    rx: /<div>\s*\[(SYSTEM|AGENT|MISSION|DEPLOY|API|KERNEL|DATABASE|WORKER|SECURITY)\]/gi,
    why: 'linha de log fabricada no HTML',
  },
  // No JS: valor default numerico usado como se fosse medido. Diferente de `|| 0` num
  // contador (legitimo), aqui o alvo e o fallback que INVENTA um numero plausivel.
  {
    id: 'js-plausible-fallback',
    rx: /\|\|\s*(?:9[0-9](?:\.\d+)?|1\d{2,}|0\.9[1-9])\b/g,
    why: 'fallback que inventa numero plausivel em vez de mostrar ausencia',
  },
];

// Um slot com id= e preenchido por JS: o conteudo no HTML e apenas o estado INICIAL, e
// zero/traco ali e honesto ("ainda nao carreguei"). Punir isso empurraria o autor a deixar
// o slot vazio, que rende layout pulando -- pior UX, mesma honestidade. O que continua
// sendo punido e um id= com valor ALTO plausivel (READY, 99.99%), porque ai o estado
// inicial afirma sucesso antes de qualquer medicao.
const ZERO_OR_DASH = /^(0|0[.,]0+|—|-|--|…|\.\.\.)\s*[a-zA-Z%]*$/;

function fileFakes(source, ext) {
  const lines = source.split(/\r?\n/);
  const out = [];
  for (const signal of FAKE_SIGNALS) {
    if (ext === '.js' && !signal.id.startsWith('js-')) continue;
    if (ext === '.html' && !signal.id.startsWith('html-')) continue;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const rx = new RegExp(signal.rx.source, signal.rx.flags);
      let match = rx.exec(line);
      while (match) {
        const text = match[0].trim();
        // Um marcador de ausencia dentro do slot de valor e o comportamento correto.
        const inner = text.replace(/<[^>]*>/g, '').trim();
        const isDynamicSlot = /\bid="[^"]+"/.test(text) && ZERO_OR_DASH.test(inner);
        if (!HONEST_PLACEHOLDERS.has(inner) && !isDynamicSlot) {
          out.push({ signal: signal.id, line: i + 1, excerpt: text.slice(0, 120), why: signal.why });
        }
        match = rx.lastIndex > match.index ? rx.exec(line) : null;
      }
    }
  }
  return out;
}

// Um arquivo esta honesto quando nao tem sinal falso E consome API de verdade (para o JS).
function classify(fakes, source, ext) {
  if (fakes.length > 0) return 'fabricating';
  if (ext === '.js') return /\bfetch\(|\bapi\(/.test(source) ? 'honest' : 'static';
  // HTML honesto e o que deixa os slots vazios para o JS preencher.
  return /id="[a-zA-Z]/.test(source) ? 'honest' : 'static';
}

function auditFrontend(publicDir) {
  const files = [];
  let entries = [];
  try {
    entries = fs.readdirSync(publicDir, { withFileTypes: true });
  } catch {
    return { totals: { files: 0, totalFakeSignals: 0, byClassification: {} }, files: [] };
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== '.html' && ext !== '.js') continue;
    const full = path.join(publicDir, entry.name);
    const source = fs.readFileSync(full, 'utf8');
    const fakes = fileFakes(source, ext);
    files.push({
      file: entry.name,
      classification: classify(fakes, source, ext),
      fakeSignalCount: fakes.length,
      signals: fakes,
    });
  }
  const byClassification = {};
  for (const f of files) byClassification[f.classification] = (byClassification[f.classification] || 0) + 1;
  return {
    totals: {
      files: files.length,
      totalFakeSignals: files.reduce((sum, f) => sum + f.fakeSignalCount, 0),
      byClassification,
    },
    files: files.sort((a, b) => b.fakeSignalCount - a.fakeSignalCount),
  };
}

module.exports = { auditFrontend, FAKE_SIGNALS };
