const fs = require('node:fs');
const path = require('node:path');
const { ValidationError } = require('../kernel/errors');
const { measured, unknown } = require('../kernel/measurement');

// Knowledge OS HONESTO.
//
// MEDIDO EM PRODUCAO (2026-07-29): getManifest devolvia totalVolumes 51 e status
// 'OPERATIONAL_KNOWLEDGE_GRAPH' -- mas o diretorio docs/constitution nao tem 51 arquivos
// *VOLUME.md (tem outra coisa, ou nada). Um manifesto que afirma 51 volumes inexistentes.
// loadSemanticContext "carregava" volumes com tokenCount 450 fixo, sem abrir arquivo.
//
// Agora getManifest CONTA os arquivos *VOLUME.md reais no diretorio; se nao houver, declara
// UNAVAILABLE com totalVolumes: unknown() e o caminho onde eram esperados -- nunca um total
// inventado. loadSemanticContext so reporta volume que EXISTE no disco, com bytes reais.
class KnowledgeOperatingSystem {
  constructor({ store, bus, controlPlane }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.constitutionDir = path.join(__dirname, '../../docs/constitution');
  }

  #volumeFiles() {
    try {
      return fs.readdirSync(this.constitutionDir).filter((f) => /VOLUME\.md$/i.test(f));
    } catch {
      return null; // diretorio ausente
    }
  }

  async getManifest(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const files = this.#volumeFiles();
    if (!files || files.length === 0) {
      return {
        tenantId,
        status: 'UNAVAILABLE',
        totalVolumes: unknown('no *VOLUME.md files found in the constitution directory'),
        constitutionPath: this.constitutionDir,
        checkedAt: new Date().toISOString(),
      };
    }
    return {
      tenantId,
      status: 'AVAILABLE',
      totalVolumes: measured(files.length, `fs:${this.constitutionDir}`),
      constitutionPath: this.constitutionDir,
      checkedAt: new Date().toISOString(),
    };
  }

  async loadSemanticContext(tenantId, actorId, requiredVolumes = [0, 1, 2, 3, 10, 22, 23]) {
    await this.cp.authorize(tenantId, actorId, 'memory:read');
    if (!Array.isArray(requiredVolumes)) throw new ValidationError('requiredVolumes must be an array');

    const loadedDocs = [];
    const missing = [];
    for (const volNum of requiredVolumes) {
      const prefix = String(volNum).padStart(2, '0');
      const fileName = `${prefix}_VOLUME.md`;
      const filePath = path.join(this.constitutionDir, fileName);
      try {
        const bytes = fs.statSync(filePath).size; // prova real de existencia + tamanho
        loadedDocs.push({ volumeNumber: volNum, documentId: fileName, bytes, status: 'LOADED' });
      } catch {
        missing.push({ volumeNumber: volNum, documentId: fileName, status: 'MISSING' });
      }
    }

    return {
      tenantId,
      requestedVolumesCount: requiredVolumes.length,
      loadedDocs,
      missing,
      loadedCount: loadedDocs.length,
      loadedAt: new Date().toISOString(),
    };
  }
}

module.exports = { KnowledgeOperatingSystem };
