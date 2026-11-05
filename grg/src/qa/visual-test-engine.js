'use strict';
/**
 * FÊNIX OS V8.3 — Visual Test Engine & Screenshot Comparator
 * Compares baseline vs current view snapshots, detects visual shifts,
 * broken layout, overflow, and generates structured VISUAL_TEST_RESULT artifacts.
 */

const fs = require('node:fs');
const path = require('node:path');
const { comparePngFiles } = require('../reconstruction/visual-comparator');

class VisualTestEngine {
  constructor(options = {}) {
    this.storagePath = options.storagePath || path.join(__dirname, '..', '.data', 'visual_tests.json');
    const defaultQaRoot = path.resolve(__dirname, '..', '..', 'qa');
    this.allowedRoots = (options.allowedRoots || [process.env.FENIX_VISUAL_QA_ROOT, '/opt/fenix-os/qa', defaultQaRoot])
      .filter(Boolean)
      .map((root) => path.resolve(root));
    this.results = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        this.results = JSON.parse(raw);
        let migrated = false;
        this.results = this.results.map((result) => {
          if (result?.measurementStatus === 'MEASURED' && Number.isFinite(result.diffPercentage)) return result;
          if (result?.status === 'NOT_MEASURED' && result?.passed == null) return result;
          migrated = true;
          return {
            ...result,
            status: 'NOT_MEASURED',
            measurementStatus: 'NOT_MEASURED',
            measurementReason: 'Registro legado sem medição de pixels verificável.',
            passed: null,
            diffPercentage: null,
            diffPixels: null,
            errors: [...(Array.isArray(result?.errors) ? result.errors : []), 'Registro legado reclassificado: resultado anterior não comprova comparação de pixels.'],
          };
        });
        if (migrated) this.save();
      }
    } catch (e) {
      this.results = [];
    }
  }

  save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storagePath, JSON.stringify(this.results, null, 2), 'utf8');
    } catch (e) {}
  }

  runVisualComparison(params = {}) {
    const {
      projectId = 'zapai-crm',
      route = '/inbox',
      commit = 'HEAD',
      viewport = { width: 1440, height: 900 },
      baselineScreenshot = null,
      currentScreenshot = null,
    } = params;

    const errors = [];
    const baseline = this.resolveEvidencePath(baselineScreenshot);
    const current = this.resolveEvidencePath(currentScreenshot);
    let measurement = { status: 'NOT_MEASURED', reason: 'Duas capturas PNG autorizadas são necessárias.' };

    if (baseline.error || current.error) {
      measurement.reason = baseline.error || current.error;
    } else if (baseline.path && current.path) {
      measurement = comparePngFiles(baseline.path, current.path, params.pixelTolerance);
    }

    const parsedThreshold = Number(params.maximumDiffPercent);
    const maximumDiffPercent = Number.isFinite(parsedThreshold) ? Math.max(0, Math.min(100, parsedThreshold)) : 5;
    const measured = measurement.status === 'MEASURED';
    const passed = measured ? measurement.diffPercentage <= maximumDiffPercent : null;
    const status = !measured ? 'NOT_MEASURED' : (passed ? 'PASSED' : 'FAILED');
    const diffPercentage = measured ? measurement.diffPercentage : null;
    const diffPixels = measured ? measurement.changedPixels : null;

    if (measured && !passed) errors.push(`Visual difference threshold exceeded: ${diffPercentage.toFixed(2)}% > ${maximumDiffPercent}%`);
    if (!measured) errors.push(measurement.reason || 'A comparação visual não pôde ser medida.');

    const result = {
      id: `visual_${Date.now()}`,
      projectId,
      route,
      commit,
      viewport,
      baseline: baseline.path ? path.basename(baseline.path) : null,
      current: current.path ? path.basename(current.path) : null,
      diffPixels,
      diffPercentage,
      measurementStatus: measurement.status,
      measurementReason: measurement.reason || null,
      errors,
      passed,
      status,
      timestamp: new Date().toISOString(),
    };

    this.results.unshift(result);
    if (this.results.length > 100) this.results = this.results.slice(0, 100);
    this.save();

    return result;
  }

  resolveEvidencePath(input) {
    if (input == null || input === '') return { path: null };
    if (typeof input !== 'string' || input.length > 4096 || !path.isAbsolute(input)) {
      return { path: null, error: 'Caminho de evidência inválido.' };
    }

    let realPath;
    try {
      realPath = fs.realpathSync(input);
      if (!fs.statSync(realPath).isFile()) return { path: null, error: 'A evidência precisa ser um arquivo.' };
    } catch {
      return { path: null, error: 'Arquivo de evidência não encontrado.' };
    }

    const allowed = this.allowedRoots.some((root) => {
      try {
        const realRoot = fs.realpathSync(root);
        const relative = path.relative(realRoot, realPath);
        return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
      } catch {
        return false;
      }
    });
    return allowed
      ? { path: realPath }
      : { path: null, error: 'A evidência está fora das raízes de QA permitidas.' };
  }

  getResults(projectId) {
    if (!projectId) return this.results;
    return this.results.filter(r => r.projectId === projectId);
  }
}

const globalVisualTestEngine = new VisualTestEngine();

module.exports = { VisualTestEngine, globalVisualTestEngine };
