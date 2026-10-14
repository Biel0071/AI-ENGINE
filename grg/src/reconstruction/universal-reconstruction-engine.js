'use strict';

class UniversalReconstructionEngine {
  async reconstructSystem(input = {}) {
    const hasSource = Boolean(input.url || input.videoPath || input.imageUrl || input.imagePath);
    if (!hasSource) {
      const error = new Error('Informe uma URL, imagem ou vídeo para iniciar a análise.');
      error.code = 'RECONSTRUCTION_SOURCE_REQUIRED';
      error.status = 400;
      throw error;
    }

    const error = new Error('A reconstrução completa ainda não possui pipeline de visão, geração, testes e publicação conectado. Nenhum projeto, job ou teste foi criado.');
    error.code = 'RECONSTRUCTION_PIPELINE_UNAVAILABLE';
    error.status = 501;
    throw error;
  }
}

const globalUniversalReconstructionEngine = new UniversalReconstructionEngine();

module.exports = { UniversalReconstructionEngine, globalUniversalReconstructionEngine };
