'use strict';

const { uuid } = require('./ids');
const { measured, unknown } = require('./measurement');

// IDENTIDADE PERMANENTE DO ORGANISMO.
//
// Dos dez organos que a diretiva do Organismo Cognitivo exige, nove ja existiam espalhados
// pelo repositorio (memoria, conhecimento, competencias, objetivos, missoes, planejamento,
// execucao, observabilidade, evolucao). Este era o unico ausente: nao havia nenhuma
// ocorrencia de `organismId` ou equivalente em src/, e sem ele a plataforma nao consegue
// responder "quem sou eu, desde quando, e por quantas gerações de esquema passei".
//
// Por que isso importa mais do que parece: o objetivo declarado e sobreviver a troca de
// qualquer modelo de IA. Se a identidade estivesse no provedor, no processo ou na imagem,
// ela morreria a cada deploy — e "o FENIX" seria so o nome do container que esta rodando
// agora. Aqui a identidade vive no store, ao lado do conhecimento acumulado, e e o mesmo
// registro antes e depois de trocar Claude por outro modelo.
//
// TRES INVARIANTES, e cada uma existe por uma falha que ela impede:
//
//   1. NUNCA regenera. `ensure()` cria na primeira chamada e devolve o mesmo registro para
//      sempre. Um organismId novo a cada boot tornaria todo historico anterior orfao.
//   2. `bornAt` nunca e reescrito. A idade do organismo e derivada dele, nunca guardada
//      como numero — numero guardado envelhece errado.
//   3. A linhagem e APPEND-ONLY e registra o que foi OBSERVADO (versao de release, versao de
//      esquema), nao o que alguem declarou. Uma linhagem editavel provaria nada.
//
// Este modulo nao afirma saude, prontidao nem maturidade. Ele responde identidade e
// continuidade; o veredito de estar vivo e do definition-of-life, que mede loops.

const COLLECTION = 'organismIdentity';

class OrganismIdentityService {
  constructor({ store, bus = null, controlPlane = null, env = process.env }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.env = env;
  }

  // Cria na primeira chamada, devolve o existente em todas as outras. Idempotente por
  // construcao: sem isto, dois processos subindo juntos criariam duas identidades e o
  // organismo passaria a ter duas historias.
  async ensure() {
    const existing = await this.current();
    if (existing) return this.#withLineage(existing);

    const record = {
      id: uuid(),
      organismId: uuid(),
      bornAt: new Date().toISOString(),
      // A geracao de esquema no nascimento. Serve para distinguir um organismo que nasceu
      // ja no esquema atual de um que atravessou migracoes — as duas historias sao
      // diferentes e a segunda carrega risco que a primeira nao tem.
      schemaVersionAtBirth: (await this.store.read()).schemaVersion || null,
      lineage: [],
    };

    // Corrida de boot: dois processos podem chegar aqui juntos. Quem escreve segundo
    // encontra o registro do primeiro e o adota, em vez de sobrescrever.
    let winner = record;
    await this.store.update((state) => {
      const collection = state[COLLECTION] || (state[COLLECTION] = []);
      const already = collection[0];
      if (already) { winner = already; return state; }
      collection.push(record);
      return state;
    });

    if (winner === record && this.bus?.emit) {
      await this.bus.emit('organism.identity.established', { organismId: record.organismId, bornAt: record.bornAt });
    }
    return this.#withLineage(winner);
  }

  async current() {
    const state = await this.store.read();
    return (state[COLLECTION] || [])[0] || null;
  }

  // Registra uma geracao observada. Chamada no boot com a versao que o processo esta
  // rodando; entradas repetidas nao se acumulam, porque a linhagem e historia de
  // MUDANCA, nao log de boot.
  async recordGeneration({ release = null, schemaVersion = null, reason = 'boot' } = {}) {
    const identity = await this.ensure();
    const entry = {
      release: release || this.env.FENIX_VERSION || null,
      schemaVersion,
      reason,
      observedAt: new Date().toISOString(),
    };
    if (!entry.release && entry.schemaVersion === null) return identity;

    let appended = false;
    await this.store.update((state) => {
      const record = (state[COLLECTION] || [])[0];
      if (!record) return state;
      record.lineage = record.lineage || [];
      const last = record.lineage[record.lineage.length - 1];
      const same = last && last.release === entry.release && last.schemaVersion === entry.schemaVersion;
      if (same) return state;
      record.lineage.push(entry);
      appended = true;
      return state;
    });

    if (appended && this.bus?.emit) {
      await this.bus.emit('organism.generation.recorded', { release: entry.release, schemaVersion: entry.schemaVersion });
    }
    return this.ensure();
  }

  // Descricao medida da identidade. Cada campo nomeia sua fonte; a idade e DERIVADA de
  // bornAt no instante da leitura, nunca lida de um campo gravado.
  async describe() {
    const record = await this.current();
    if (!record) {
      return {
        organismId: unknown('no organism identity has been established yet', 'call organismIdentity.ensure() during boot'),
        bornAt: unknown('no organism identity has been established yet'),
        ageDays: unknown('age cannot be derived without bornAt'),
        generations: unknown('no organism identity has been established yet'),
      };
    }
    const born = Date.parse(record.bornAt);
    const lineage = record.lineage || [];
    return {
      organismId: measured(record.organismId, `store:${COLLECTION}`),
      bornAt: measured(record.bornAt, `store:${COLLECTION}`),
      ageDays: Number.isFinite(born)
        ? measured(Number(((Date.now() - born) / 86_400_000).toFixed(3)), `derived:${COLLECTION}.bornAt`)
        : unknown(`bornAt is not a parseable date: ${record.bornAt}`),
      schemaVersionAtBirth: record.schemaVersionAtBirth === null
        ? unknown('the schema version at birth was not recorded')
        : measured(record.schemaVersionAtBirth, `store:${COLLECTION}`),
      generations: measured(lineage.length, `derived:${COLLECTION}.lineage`),
      // O ultimo degrau observado. Nao e "a versao atual declarada": e a ultima que algum
      // processo de fato registrou ao subir.
      lastGeneration: lineage.length
        ? measured(lineage[lineage.length - 1], `derived:${COLLECTION}.lineage`)
        : unknown('no generation has been recorded yet', 'call recordGeneration() during boot'),
    };
  }

  // Endpoint publico: exige leitura de governanca como o resto da superficie de governanca.
  async report(tenantId, actorId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'governance:read');
    return this.describe();
  }

  // A linhagem, sem o resto. Usada pelo contrato de release para mostrar continuidade.
  async #withLineage(record) {
    return { ...record, lineage: record.lineage || [] };
  }
}

module.exports = { OrganismIdentityService, ORGANISM_IDENTITY_COLLECTION: COLLECTION };
