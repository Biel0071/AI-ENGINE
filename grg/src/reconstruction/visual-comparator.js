'use strict';
/**
 * FÊNIX OS V11 — VISUAL COMPARATOR & MULTI-DIMENSIONAL GAP ANALYZER
 * 
 * Compares: REFERENCE vs CURRENT
 * Modes: Side-by-Side, Overlay, Pixel & Structural Diff
 * Gaps Detected across ALL 7 Canonical Dimensions:
 *   1. LAYOUT GAP (Misalignment, width/height variance, grid column shift)
 *   2. TYPOGRAPHY GAP (Font family, size, line-height differences)
 *   3. COLOR GAP (Palette variance, contrast shift)
 *   4. SPACING GAP (Padding, margin, container gap divergence)
 *   5. COMPONENT GAP (Missing or surplus widgets)
 *   6. RESPONSIVE GAP (Breakpoints mismatch at mobile/tablet/desktop)
 *   7. BEHAVIOR GAP (Missing interactive states: hover, focus, transitions, actions)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 4_000_000;

class VisualComparator {
  constructor(options = {}) {
    this.storagePath = options.storagePath || path.join(__dirname, '..', '.data', 'visual_comparisons.json');
    this.history = [];
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        this.history = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
      }
    } catch (e) {
      this.history = [];
    }
  }

  _save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storagePath, JSON.stringify(this.history.slice(0, 100), null, 2), 'utf8');
    } catch (e) {}
  }

  /**
   * Runs exhaustive visual & structural gap analysis between reference and current targets
   */
  compare(params = {}) {
    const {
      referenceImage = null,
      currentImage = null,
      referenceDna = {},
      currentDna = {},
      referenceComponents = [],
      currentComponents = [],
      referenceLayout = {},
      currentLayout = {},
      referenceBehavior = [],
      currentBehavior = []
    } = params;

    const gaps = {
      layoutGap: [],
      typographyGap: [],
      colorGap: [],
      spacingGap: [],
      componentGap: [],
      responsiveGap: [],
      behaviorGap: []
    };

    const refExists = isExistingFile(referenceImage);
    const curExists = isExistingFile(currentImage);
    const pixelDiff = refExists && curExists
      ? comparePngFiles(referenceImage, currentImage, params.pixelTolerance)
      : { status: 'NOT_MEASURED', reason: 'Dois arquivos de imagem válidos são necessários.' };
    const parsedMaximumDiff = Number(params.maximumDiffPercent);
    const maximumDiffPercent = Number.isFinite(parsedMaximumDiff)
      ? Math.max(0, Math.min(100, parsedMaximumDiff))
      : 15;
    const measuredViewport = pixelDiff.status === 'MEASURED'
      ? { width: pixelDiff.current.width, height: pixelDiff.current.height }
      : null;
    const viewport = isValidViewport(params.viewport) ? params.viewport : measuredViewport;

    // 2. Component Gap (Missing & Surplus widgets)
    const curCompNames = new Set(currentComponents.map(c => typeof c === 'string' ? c : c.name));
    const refCompNames = new Set(referenceComponents.map(c => typeof c === 'string' ? c : c.name));

    referenceComponents.forEach(refComp => {
      const name = typeof refComp === 'string' ? refComp : refComp.name;
      if (!curCompNames.has(name)) {
        gaps.componentGap.push({
          type: 'MISSING_COMPONENT',
          name,
          severity: 'HIGH',
          recommendation: `Generate and mount ${name} component in active view`
        });
      }
    });

    currentComponents.forEach(curComp => {
      const name = typeof curComp === 'string' ? curComp : curComp.name;
      if (refCompNames.size > 0 && !refCompNames.has(name)) {
        gaps.componentGap.push({
          type: 'SURPLUS_COMPONENT',
          name,
          severity: 'LOW',
          recommendation: `Verify if ${name} is an intentional deviation or obsolete widget`
        });
      }
    });

    // 3. Color Gap
    const refColors = (referenceDna.designTokens && referenceDna.designTokens.colors) || {};
    const curColors = (currentDna.designTokens && currentDna.designTokens.colors) || {};
    ['primary', 'secondary', 'background', 'surface', 'border'].forEach(token => {
      if (refColors[token] && curColors[token] && refColors[token].toLowerCase() !== curColors[token].toLowerCase()) {
        gaps.colorGap.push({
          token,
          reference: refColors[token],
          current: curColors[token],
          severity: token === 'primary' ? 'HIGH' : 'MEDIUM',
          recommendation: `Align var(--fenix-color-${token}) to reference value ${refColors[token]}`
        });
      }
    });

    // 4. Spacing Gap
    const refSpacing = (referenceDna.designTokens && referenceDna.designTokens.spacing) || {};
    const curSpacing = (currentDna.designTokens && currentDna.designTokens.spacing) || {};
    ['1', '2', '4', '6', '8'].forEach(step => {
      if (refSpacing[step] && curSpacing[step] && refSpacing[step] !== curSpacing[step]) {
        gaps.spacingGap.push({
          token: `spacing-${step}`,
          reference: refSpacing[step],
          current: curSpacing[step],
          severity: 'LOW',
          recommendation: `Harmonize spacing token ${step} to ${refSpacing[step]}`
        });
      }
    });

    // 5. Typography Gap
    const refTypo = (referenceDna.designTokens && referenceDna.designTokens.typography) || {};
    const curTypo = (currentDna.designTokens && currentDna.designTokens.typography) || {};
    if (refTypo.fontFamily && curTypo.fontFamily && refTypo.fontFamily !== curTypo.fontFamily) {
      gaps.typographyGap.push({
        token: 'fontFamily',
        reference: refTypo.fontFamily,
        current: curTypo.fontFamily,
        severity: 'MEDIUM',
        recommendation: `Apply font-family: ${refTypo.fontFamily}`
      });
    }
    const refSizes = refTypo.sizes || {};
    const curSizes = curTypo.sizes || {};
    ['base', 'lg', 'xl'].forEach(sz => {
      if (refSizes[sz] && curSizes[sz] && refSizes[sz] !== curSizes[sz]) {
        gaps.typographyGap.push({
          token: `font-size-${sz}`,
          reference: refSizes[sz],
          current: curSizes[sz],
          severity: 'LOW'
        });
      }
    });

    // 6. Layout Gap (Container width, padding, grid columns, alignment)
    const refLayoutRules = (referenceDna.layoutRules) || referenceLayout || {};
    const curLayoutRules = (currentDna.layoutRules) || currentLayout || {};
    if (refLayoutRules.containerMaxWidth && curLayoutRules.containerMaxWidth && refLayoutRules.containerMaxWidth !== curLayoutRules.containerMaxWidth) {
      gaps.layoutGap.push({
        property: 'containerMaxWidth',
        reference: refLayoutRules.containerMaxWidth,
        current: curLayoutRules.containerMaxWidth,
        severity: 'MEDIUM',
        recommendation: `Set layout max-width to ${refLayoutRules.containerMaxWidth}`
      });
    }
    if (refLayoutRules.sidebarWidth && curLayoutRules.sidebarWidth && refLayoutRules.sidebarWidth !== curLayoutRules.sidebarWidth) {
      gaps.layoutGap.push({
        property: 'sidebarWidth',
        reference: refLayoutRules.sidebarWidth,
        current: curLayoutRules.sidebarWidth,
        severity: 'LOW',
        recommendation: `Set sidebar width to ${refLayoutRules.sidebarWidth}`
      });
    }

    // 7. Responsive Gap (Breakpoints & adaptive rules)
    const refResp = (referenceDna.responsiveRules) || (referenceDna.designTokens && referenceDna.designTokens.breakpoints) || {};
    const curResp = (currentDna.responsiveRules) || (currentDna.designTokens && currentDna.designTokens.breakpoints) || {};
    ['mobile', 'tablet', 'desktop'].forEach(bp => {
      if (refResp[bp] && curResp[bp] && refResp[bp] !== curResp[bp]) {
        gaps.responsiveGap.push({
          breakpoint: bp,
          reference: refResp[bp],
          current: curResp[bp],
          severity: 'MEDIUM',
          recommendation: `Adjust ${bp} breakpoint query to ${refResp[bp]}`
        });
      }
    });

    // 8. Behavior Gap (User interactions & transitions)
    const refActions = Array.isArray(referenceBehavior) ? referenceBehavior : [];
    const curActions = Array.isArray(currentBehavior) ? currentBehavior : [];
    if (refActions.length > 0) {
      const curActionKeys = new Set(curActions.map(a => typeof a === 'string' ? a : `${a.action}:${a.target || a.selector}`));
      refActions.forEach(a => {
        const key = typeof a === 'string' ? a : `${a.action}:${a.target || a.selector}`;
        if (!curActionKeys.has(key)) {
          gaps.behaviorGap.push({
            action: key,
            severity: 'HIGH',
            recommendation: `Implement interactive behavior handler for ${key}`
          });
        }
      });
    }

    // Total Gaps Count
    let totalGaps = 0;
    Object.values(gaps).forEach(list => { totalGaps += list.length; });

    const criticalGapsCount = gaps.componentGap.filter(g => g.severity === 'HIGH').length + gaps.behaviorGap.length;

    const result = {
      comparisonId: `cmp:${Date.now()}`,
      timestamp: new Date().toISOString(),
      viewport,
      measuredViewport,
      maximumDiffPercent,
      referenceImage,
      currentImage,
      imageEvidence: {
        referenceExists: Boolean(refExists),
        currentExists: Boolean(curExists),
        reference: pixelDiff.reference || null,
        current: pixelDiff.current || null,
        pixelDiffAvailable: pixelDiff.status === 'MEASURED'
      },
      measurementMethod: pixelDiff.status === 'MEASURED' ? 'PIXEL_RGBA_THRESHOLD' : null,
      measurementStatus: pixelDiff.status,
      measurementReason: pixelDiff.reason || null,
      pixelDiff: pixelDiff.status === 'MEASURED' ? pixelDiff : null,
      diffPercentage: pixelDiff.status === 'MEASURED' ? pixelDiff.diffPercentage : null,
      fidelityScore: pixelDiff.status === 'MEASURED' ? Math.round(100 - pixelDiff.diffPercentage) : null,
      passed: pixelDiff.status === 'MEASURED'
        ? (pixelDiff.diffPercentage <= maximumDiffPercent && criticalGapsCount === 0)
        : null,
      verdict: pixelDiff.status !== 'MEASURED'
        ? 'VISUAL_COMPARISON_UNAVAILABLE'
        : (pixelDiff.diffPercentage <= maximumDiffPercent && criticalGapsCount === 0 ? 'PASSED_VISUAL_TOLERANCE' : 'REQUIRES_RECONSTRUCTION_FIX'),
      totalGaps,
      criticalGapsCount,
      gaps,
      modes: {
        sideBySide: { enabled: Boolean(refExists && curExists), splitRatio: 0.5 },
        overlay: { enabled: Boolean(refExists && curExists), defaultOpacity: 0.6 },
        diffMask: { enabled: false, color: '#ef4444' }
      }
    };

    this.history.unshift(result);
    this._save();

    return result;
  }
}

function isExistingFile(filePath) {
  if (typeof filePath !== 'string' || filePath.length > 4096) return false;
  try { return fs.statSync(filePath).isFile(); } catch { return false; }
}

function isValidViewport(viewport) {
  return viewport && Number.isFinite(viewport.width) && Number.isFinite(viewport.height) &&
    viewport.width > 0 && viewport.height > 0;
}

function comparePngFiles(referencePath, currentPath, toleranceInput) {
  let reference;
  let current;
  try {
    reference = decodePng(referencePath);
    current = decodePng(currentPath);
  } catch (error) {
    return { status: 'NOT_MEASURED', reason: error.message };
  }
  const publicReference = { width: reference.width, height: reference.height, channels: reference.channels };
  const publicCurrent = { width: current.width, height: current.height, channels: current.channels };
  if (reference.width !== current.width || reference.height !== current.height) {
    return {
      status: 'DIMENSION_MISMATCH',
      reason: 'As capturas têm dimensões diferentes; ajuste o viewport antes da comparação.',
      reference: publicReference,
      current: publicCurrent
    };
  }

  const tolerance = Number.isFinite(Number(toleranceInput)) ? Math.max(0, Math.min(255, Number(toleranceInput))) : 8;
  const totalPixels = reference.width * reference.height;
  let changedPixels = 0;
  let totalAbsoluteDifference = 0;
  const channels = 4;
  for (let pixel = 0; pixel < totalPixels; pixel += 1) {
    let maxChannelDifference = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      const referenceValue = channelValue(reference, pixel, channel);
      const currentValue = channelValue(current, pixel, channel);
      const difference = Math.abs(referenceValue - currentValue);
      maxChannelDifference = Math.max(maxChannelDifference, difference);
      totalAbsoluteDifference += difference;
    }
    if (maxChannelDifference > tolerance) changedPixels += 1;
  }

  const diffPercentage = Number(((changedPixels / totalPixels) * 100).toFixed(4));
  const meanAbsoluteDifferencePercent = Number(((totalAbsoluteDifference / (totalPixels * channels * 255)) * 100).toFixed(4));
  return {
    status: 'MEASURED',
    reference: publicReference,
    current: publicCurrent,
    tolerance,
    totalPixels,
    changedPixels,
    diffPercentage,
    meanAbsoluteDifferencePercent
  };
}

function decodePng(filePath) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES) throw new Error('Imagem inválida ou acima do limite de comparação.');
  const image = fs.readFileSync(filePath);
  if (image.length < 33 || !image.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('A comparação de pixels aceita PNGs válidos.');

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlaceMethod = -1;
  const idat = [];
  let offset = 8;
  let sawHeader = false;
  let sawEnd = false;
  while (offset + 12 <= image.length) {
    const length = image.readUInt32BE(offset);
    const chunkType = image.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (dataEnd > image.length || chunkEnd > image.length) throw new Error('Arquivo PNG truncado.');
    const expectedCrc = image.readUInt32BE(dataEnd);
    const actualCrc = crc32(image.subarray(offset + 4, dataEnd));
    if (expectedCrc !== actualCrc) throw new Error('Checksum PNG inválido.');
    const data = image.subarray(dataStart, dataEnd);

    if (chunkType === 'IHDR') {
      if (sawHeader || length !== 13) throw new Error('Cabeçalho PNG inválido.');
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlaceMethod = data[12];
      sawHeader = true;
    } else if (chunkType === 'IDAT') {
      idat.push(data);
    } else if (chunkType === 'IEND') {
      sawEnd = true;
      break;
    }
    offset = chunkEnd;
  }

  const channels = colorType === 2 ? 3 : (colorType === 6 ? 4 : 0);
  if (!sawHeader || !sawEnd || !idat.length || !width || !height) throw new Error('PNG incompleto.');
  if (bitDepth !== 8 || !channels || interlaceMethod !== 0) throw new Error('Formato PNG não suportado para comparação de pixels.');
  if (width * height > MAX_IMAGE_PIXELS) throw new Error('Imagem excede o limite de pixels para comparação.');

  const rowBytes = width * channels;
  const expectedLength = (rowBytes + 1) * height;
  let inflated;
  try {
    inflated = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: expectedLength });
  } catch {
    throw new Error('Dados compactados do PNG inválidos.');
  }
  if (inflated.length !== expectedLength) throw new Error('Dimensão dos dados PNG inválida.');

  const decoded = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    const inputRow = y * (rowBytes + 1);
    const outputRow = y * rowBytes;
    const filter = inflated[inputRow];
    if (filter > 4) throw new Error('Filtro PNG inválido.');
    for (let x = 0; x < rowBytes; x += 1) {
      const left = x >= channels ? decoded[outputRow + x - channels] : 0;
      const above = y > 0 ? decoded[outputRow - rowBytes + x] : 0;
      const upperLeft = y > 0 && x >= channels ? decoded[outputRow - rowBytes + x - channels] : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? above
            : filter === 3 ? Math.floor((left + above) / 2)
              : paethPredictor(left, above, upperLeft);
      decoded[outputRow + x] = (inflated[inputRow + 1 + x] + predictor) & 255;
    }
  }
  return { width, height, channels, data: decoded };
}

function channelValue(image, pixel, channel) {
  if (channel === 3 && image.channels === 3) return 255;
  return image.data[pixel * image.channels + channel];
}

function paethPredictor(left, above, upperLeft) {
  const base = left + above - upperLeft;
  const leftDistance = Math.abs(base - left);
  const aboveDistance = Math.abs(base - above);
  const upperLeftDistance = Math.abs(base - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const globalVisualComparator = new VisualComparator();

module.exports = {
  VisualComparator,
  globalVisualComparator
};
