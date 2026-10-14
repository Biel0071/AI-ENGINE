'use strict';
/**
 * FÊNIX OS — Autonomous Evolution Kernel (AEK) — REAL (Sem Mocks)
 * Substitui a versão anterior que tinha findings hardcoded (EVO-101/102/103).
 *
 * ANTI-FALSE-PASS: Se não houver dados reais, retorna UNAVAILABLE.
 * Nunca retorna findings fabricados.
 */

const { EventEmitter } = require('events');

class AutonomousEvolutionKernel extends EventEmitter {
  constructor(options = {}) {
    super();
    this.eventBus = options.eventBus || null;
    this.livingModeActive = options.livingModeActive !== false;
    this.evolutionBacklog = [];
    this._lastScanAt = null;
    this._scanCount = 0;
  }

  /**
   * Executa scan real do workspace via análise de arquivos e métricas reais.
   * NUNCA retorna findings hardcoded.
   *
   * @param {object} projectContext — contexto real do projeto
   * @param {string[]} projectContext.files — lista real de arquivos
   * @param {object} projectContext.metrics — métricas reais (test coverage, etc.)
   * @param {object} projectContext.missionHistory — histórico de missões
   */
  async runLivingModeScan(projectContext = {}) {
    if (!this.livingModeActive) return { status: 'INACTIVE', findings: [] };

    // Sem contexto real → UNAVAILABLE (nunca fabricar)
    if (!projectContext.files && !projectContext.metrics && !projectContext.missionHistory) {
      return {
        status: 'UNAVAILABLE',
        reason: 'Nenhum dado real de projeto disponível para análise',
        findings: [],
      };
    }

    const findings = [];

    // ── ANÁLISE REAL DE COBERTURA DE TESTES ───────────────────────────────
    if (projectContext.metrics?.testCoverage !== undefined) {
      const coverage = projectContext.metrics.testCoverage;
      if (typeof coverage === 'number' && coverage < 0.6) {
        findings.push({
          id: `AEK-${this._scanCount + 1}-TEST-COVERAGE`,
          title: `Cobertura de testes abaixo do limiar (${(coverage * 100).toFixed(1)}%)`,
          category: 'QUALITY',
          priority: coverage < 0.3 ? 'Critical' : 'High',
          measuredValue: coverage,
          threshold: 0.6,
          impact: `${((0.6 - coverage) * 100).toFixed(1)}% de código sem cobertura de testes`,
          evidence: { source: 'metrics.testCoverage', measured: coverage },
        });
      }
    }

    // ── ANÁLISE REAL DE TAXA DE FALHA DE MISSÕES ──────────────────────────
    if (projectContext.missionHistory && Array.isArray(projectContext.missionHistory)) {
      const total = projectContext.missionHistory.length;
      const failed = projectContext.missionHistory.filter((m) => m.status === 'FAILED').length;
      if (total > 0) {
        const failRate = failed / total;
        if (failRate > 0.2) {
          findings.push({
            id: `AEK-${this._scanCount + 1}-MISSION-FAIL`,
            title: `Taxa de falha de missões elevada (${(failRate * 100).toFixed(1)}%)`,
            category: 'RELIABILITY',
            priority: failRate > 0.4 ? 'Critical' : 'High',
            measuredValue: failRate,
            threshold: 0.2,
            impact: `${failed} de ${total} missões falharam`,
            evidence: { source: 'missionHistory', total, failed },
          });
        }
      }
    }

    // ── ANÁLISE REAL DE ARQUIVOS DUPLICADOS ───────────────────────────────
    if (projectContext.files && Array.isArray(projectContext.files)) {
      const basenames = projectContext.files.map((f) => f.split('/').pop());
      const duplicates = basenames.filter((name, idx) => basenames.indexOf(name) !== idx);
      if (duplicates.length > 0) {
        findings.push({
          id: `AEK-${this._scanCount + 1}-DUPLICATES`,
          title: `${duplicates.length} arquivos com nomes duplicados detectados`,
          category: 'ARCHITECTURE',
          priority: 'Medium',
          measuredValue: duplicates.length,
          impact: 'Possível split-brain ou duplicação de lógica',
          evidence: { source: 'filesystem', duplicates: [...new Set(duplicates)].slice(0, 10) },
        });
      }
    }

    // ── ANÁLISE REAL DE LATÊNCIA DE JOBS ─────────────────────────────────
    if (projectContext.metrics?.avgJobDurationMs !== undefined) {
      const avgMs = projectContext.metrics.avgJobDurationMs;
      if (avgMs > 120_000) {
        findings.push({
          id: `AEK-${this._scanCount + 1}-LATENCY`,
          title: `Latência média de jobs elevada (${(avgMs / 1000).toFixed(1)}s)`,
          category: 'PERFORMANCE',
          priority: avgMs > 300_000 ? 'High' : 'Medium',
          measuredValue: avgMs,
          threshold: 120_000,
          impact: `Jobs demorando ${(avgMs / 1000).toFixed(1)}s em média (limite: 120s)`,
          evidence: { source: 'metrics.avgJobDurationMs', measured: avgMs },
        });
      }
    }

    this._scanCount++;
    this._lastScanAt = new Date().toISOString();
    this.evolutionBacklog = findings;

    if (this.eventBus) {
      try {
        await this.eventBus.emit('aek.living.scanned', {
          totalFindings: findings.length,
          findings,
          scanCount: this._scanCount,
          scannedAt: this._lastScanAt,
        });
      } catch (_) { /* eventBus não crítico */ }
    }

    return {
      status: 'COMPLETE',
      findings,
      scanCount: this._scanCount,
      scannedAt: this._lastScanAt,
    };
  }

  getBacklog() {
    return this.evolutionBacklog;
  }

  getLastScanInfo() {
    return {
      lastScanAt: this._lastScanAt,
      scanCount: this._scanCount,
      backlogSize: this.evolutionBacklog.length,
      status: this._lastScanAt ? 'HAS_DATA' : 'UNAVAILABLE',
    };
  }
}

module.exports = { AutonomousEvolutionKernel };
