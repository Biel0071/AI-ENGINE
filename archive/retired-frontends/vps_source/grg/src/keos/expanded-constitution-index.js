const { ValidationError } = require('../kernel/errors');
const { measured, unknown } = require('../kernel/measurement');

// Este modulo afirmava `totalConfiguredVolumes: 150` e `activeStatus:
// 'OPERATIONAL_GRAPH_INDEX'` sem abrir um unico arquivo -- enquanto o KOS, que le o disco de
// verdade, mede outro numero (ou nenhum). Duas fontes contando volumes e uma delas inventando
// e pior que nao ter indice: o painel exibia 150 e a investigacao parava ali.
// Agora este indice COMPOE o KOS (que ja e honesto) em vez de manter um total paralelo, e
// loadSparseVolumes so reporta reducao de tokens quando existe base real para calcular.
class ExpandedConstitutionIndex {
  constructor({ store, bus, controlPlane, kos }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.kos = kos;
  }

  async getExpandedIndex(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    // Fonte unica de verdade: o manifesto do KOS conta os *VOLUME.md no disco.
    const manifest = typeof this.kos?.getManifest === 'function'
      ? await this.kos.getManifest(tenantId, actorId)
      : null;
    if (!manifest) {
      return {
        tenantId,
        status: 'UNAVAILABLE',
        totalVolumes: unknown('KOS nao injetado neste indice; nao ha de onde contar volumes', {
          action: 'injetar o KnowledgeOperatingSystem no ExpandedConstitutionIndex',
        }),
        loaderType: unknown('loader ativo so pode ser afirmado apos um carregamento real'),
        checkedAt: new Date().toISOString(),
      };
    }
    const available = manifest.status === 'AVAILABLE';
    return {
      tenantId,
      // Deriva do manifesto medido, nao de um numero de configuracao.
      status: available ? 'OPERATIONAL' : 'UNAVAILABLE',
      totalVolumes: manifest.totalVolumes,
      constitutionPath: manifest.constitutionPath,
      loaderType: available
        ? measured('SPARSE_SEMANTIC_LOADER', `fs:${manifest.constitutionPath}`)
        : unknown('sem volumes no disco nao existe loader ativo'),
      checkedAt: new Date().toISOString(),
    };
  }

  async loadSparseVolumes(tenantId, actorId, volumes = [1, 23]) {
    await this.cp.authorize(tenantId, actorId, 'memory:read');
    if (!Array.isArray(volumes)) throw new ValidationError('Volumes must be an array');
    // Carregamento real delegado ao KOS: ele abre o arquivo e devolve bytes ou MISSING.
    const loaded = typeof this.kos?.loadSemanticContext === 'function'
      ? await this.kos.loadSemanticContext(tenantId, actorId, volumes)
      : null;
    if (!loaded) {
      return {
        tenantId,
        requestedVolumes: volumes,
        loadedCount: unknown('KOS nao injetado; nenhum volume foi aberto'),
        tokenReduction: unknown('sem carregamento nao ha base para calcular reducao'),
        loadedAt: new Date().toISOString(),
      };
    }
    // Nomes exatos do contrato do KOS: loadedDocs / missing.
    const docs = Array.isArray(loaded.loadedDocs) ? loaded.loadedDocs : [];
    const missing = Array.isArray(loaded.missing) ? loaded.missing : [];
    const total = docs.length + missing.length;
    return {
      tenantId,
      requestedVolumes: volumes,
      loadedDocuments: docs,
      missingDocuments: missing,
      loadedCount: measured(docs.length, 'fs:constitution'),
      // A "reducao de 99.1%" era fixa. A fracao que DA para medir e quantos volumes do total
      // foram carregados; a economia de tokens depende do que o modelo receberia sem o sparse
      // loader, e isso este processo nao observa.
      sparseFraction: total > 0
        ? measured(Number((docs.length / total).toFixed(4)), 'fs:constitution')
        : unknown('nenhum volume solicitado'),
      tokenReduction: unknown('exige comparar tokens enviados com e sem o loader esparso', {
        action: 'instrumentar o gateway de IA para registrar tokens por estrategia de contexto',
      }),
      loadedAt: new Date().toISOString(),
    };
  }
}

module.exports = { ExpandedConstitutionIndex };
