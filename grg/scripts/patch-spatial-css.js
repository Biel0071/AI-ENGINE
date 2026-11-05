const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, '../public/unified.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Fix dangling braces if present
const brokenPattern = /#flp-modal-dialog\s*\{\s*max-width:\s*96vw\s*!important;\s*max-height:\s*92vh\s*!important;\s*\}\s*\}\s*max-height:\s*92vh\s*!important;\s*\}\s*\}/m;
if (brokenPattern.test(content)) {
  content = content.replace(brokenPattern, `.flp-modal-dialog {\n    max-width: 96vw !important;\n    max-height: 92vh !important;\n  }\n}`);
  console.log('Fixed dangling braces in unified.css');
}

// Check if Fênix Spatial Composition is already present
if (!content.includes('FÊNIX OS — SPATIAL COMPOSITION')) {
  const patchCSS = `

/* ══════════════════════════════════════════════════════════════════════
   FÊNIX OS — SPATIAL COMPOSITION, Z-INDEX SCALE & RESPONSIVE HIERARCHY
   ══════════════════════════════════════════════════════════════════════ */

:root {
  --fnx-z-canvas: 1;
  --fnx-z-city-overlays: 10;
  --fnx-z-dock: 40;
  --fnx-z-hud: 50;
  --fnx-z-inspector: 55;
  --fnx-z-mascot: 60;
  --fnx-z-popover: 70;
  --fnx-z-modal: 9000;
  --fnx-z-subtitles: 9100;
  --fnx-z-confirm: 9200;
  --fnx-z-toast: 9999;
}

/* ── 1. Reconstructed 4-Card Proportional Bottom Dock ── */
.fenix-modular-bottom-dock {
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  height: 236px !important;
  padding: 0 16px 12px 16px !important;
  box-sizing: border-box !important;
  z-index: var(--fnx-z-dock, 40) !important;
  display: grid !important;
  grid-template-columns: minmax(280px, 320px) repeat(3, minmax(220px, 1fr)) !important;
  gap: 12px !important;
  background: linear-gradient(180deg, transparent 0%, rgba(3, 6, 12, 0.72) 20%, rgba(3, 6, 12, 0.98) 100%) !important;
  pointer-events: none !important;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease !important;
}

.fenix-modular-bottom-dock > * {
  pointer-events: auto !important;
  min-width: 0 !important;
}

.fenix-modular-bottom-dock.minimized {
  transform: translateY(calc(100% - 10px)) !important;
  opacity: 0.15 !important;
}

/* Card 4: Jobs em Execução (Consistent Styling) */
.dock-card-v26.dock-jobs-card {
  width: 100% !important;
  min-width: 0 !important;
  height: 100% !important;
  background: linear-gradient(180deg, rgba(8, 14, 26, 0.94) 0%, rgba(5, 8, 16, 0.98) 100%) !important;
  backdrop-filter: blur(18px) !important;
  -webkit-backdrop-filter: blur(18px) !important;
  border: 1px solid rgba(0, 245, 160, 0.3) !important;
  border-radius: 12px !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 245, 160, 0.08) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.dock-card-v26 .cpc-body {
  flex: 1 1 0 !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding: 8px 12px !important;
}

/* ── 2. Non-Overlapping Building Inspector Panel ── */
.spatial-building-inspector-panel {
  position: absolute !important;
  top: 14px !important;
  right: 14px !important;
  bottom: calc(236px + 14px) !important;
  width: min(400px, 35vw) !important;
  max-width: 420px !important;
  z-index: var(--fnx-z-inspector, 55) !important;
  background: rgba(7, 11, 20, 0.95) !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(0, 217, 255, 0.35) !important;
  border-radius: 14px !important;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.85), 0 0 25px rgba(0, 217, 255, 0.12) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease !important;
}

.spatial-building-inspector-panel .inspector-tab-strip {
  display: flex !important;
  gap: 4px !important;
  padding: 6px 10px !important;
  background: rgba(0, 0, 0, 0.35) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  overflow-x: auto !important;
}

.spatial-building-inspector-panel .ins-tab-btn {
  background: transparent !important;
  border: 1px solid transparent !important;
  color: #94A3B8 !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  padding: 4px 8px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  white-space: nowrap !important;
  transition: all 0.15s ease !important;
}

.spatial-building-inspector-panel .ins-tab-btn:hover {
  color: #F8FAFC !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

.spatial-building-inspector-panel .ins-tab-btn.active {
  color: #00D9FF !important;
  background: rgba(0, 217, 255, 0.12) !important;
  border-color: rgba(0, 217, 255, 0.3) !important;
}

.spatial-building-inspector-panel .inspector-content-area {
  flex: 1 1 0 !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding: 12px 14px !important;
}

/* Avoid overlapping between HUD controls and open Inspector */
#view-city.has-inspector-open .fenix-miro-spatial-hud {
  right: calc(min(400px, 35vw) + 26px) !important;
}

#view-city.has-inspector-open #fnxProviderOrbit {
  opacity: 0.2 !important;
  pointer-events: none !important;
}

/* ── 3. Fênix Life Compact Mascot Enhancements ── */
#fenix-floating-mascot {
  position: fixed !important;
  bottom: calc(236px + 18px) !important;
  right: 18px !important;
  z-index: var(--fnx-z-mascot, 60) !important;
  cursor: pointer !important;
  user-select: none !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 6px !important;
  transition: bottom 0.25s ease, right 0.25s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

#fenix-floating-mascot .ffm-status-capsule {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 2px 8px !important;
  background: rgba(8, 14, 26, 0.92) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(0, 217, 255, 0.3) !important;
  border-radius: 999px !important;
  font-family: var(--fenix-font-mono, monospace) !important;
  font-size: 9px !important;
  font-weight: 700 !important;
  color: #00D9FF !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6) !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
}

#fenix-floating-mascot .ffm-status-capsule .ffm-pulse-dot {
  width: 6px !important;
  height: 6px !important;
  border-radius: 50% !important;
  background: #00D9FF !important;
  box-shadow: 0 0 8px #00D9FF !important;
  animation: ffmPulse 1.8s infinite !important;
}

@keyframes ffmPulse {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 12px #00D9FF; }
  100% { transform: scale(0.9); opacity: 0.8; }
}

#fenix-floating-mascot .ffm-quick-actions {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  opacity: 0 !important;
  transform: translateY(6px) !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
  pointer-events: none !important;
}

#fenix-floating-mascot:hover .ffm-quick-actions {
  opacity: 1 !important;
  transform: translateY(0) !important;
  pointer-events: auto !important;
}

.ffm-action-btn {
  width: 26px !important;
  height: 26px !important;
  border-radius: 50% !important;
  background: rgba(8, 14, 26, 0.92) !important;
  border: 1px solid rgba(0, 217, 255, 0.35) !important;
  color: #00D9FF !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 11px !important;
  cursor: pointer !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
  transition: all 0.15s ease !important;
}

.ffm-action-btn:hover {
  background: rgba(0, 217, 255, 0.2) !important;
  border-color: #00D9FF !important;
  transform: scale(1.12) !important;
}

/* 10 Mascot Visual States */
#fenix-floating-mascot[data-state="listening"] .ffm-status-capsule { border-color: #38BDF8; color: #38BDF8; }
#fenix-floating-mascot[data-state="listening"] .ffm-pulse-dot { background: #38BDF8; box-shadow: 0 0 10px #38BDF8; }
#fenix-floating-mascot[data-state="thinking"] .ffm-status-capsule { border-color: #A855F7; color: #C084FC; }
#fenix-floating-mascot[data-state="thinking"] .ffm-pulse-dot { background: #A855F7; box-shadow: 0 0 10px #A855F7; }
#fenix-floating-mascot[data-state="speaking"] .ffm-status-capsule { border-color: #00F5A0; color: #00F5A0; }
#fenix-floating-mascot[data-state="speaking"] .ffm-pulse-dot { background: #00F5A0; box-shadow: 0 0 10px #00F5A0; }
#fenix-floating-mascot[data-state="explaining"] .ffm-status-capsule { border-color: #22D3EE; color: #22D3EE; }
#fenix-floating-mascot[data-state="explaining"] .ffm-pulse-dot { background: #22D3EE; box-shadow: 0 0 10px #22D3EE; }
#fenix-floating-mascot[data-state="success"] .ffm-status-capsule { border-color: #10B981; color: #34D399; }
#fenix-floating-mascot[data-state="success"] .ffm-pulse-dot { background: #10B981; box-shadow: 0 0 10px #10B981; }
#fenix-floating-mascot[data-state="warning"] .ffm-status-capsule { border-color: #F59E0B; color: #FBBF24; }
#fenix-floating-mascot[data-state="warning"] .ffm-pulse-dot { background: #F59E0B; box-shadow: 0 0 10px #F59E0B; }
#fenix-floating-mascot[data-state="error"] .ffm-status-capsule { border-color: #EF4444; color: #F87171; }
#fenix-floating-mascot[data-state="error"] .ffm-pulse-dot { background: #EF4444; box-shadow: 0 0 10px #EF4444; }
#fenix-floating-mascot[data-state="meeting"] .ffm-status-capsule { border-color: #E879F9; color: #E879F9; }
#fenix-floating-mascot[data-state="meeting"] .ffm-pulse-dot { background: #E879F9; box-shadow: 0 0 10px #E879F9; }
#fenix-floating-mascot[data-state="offline"] .ffm-status-capsule { border-color: #64748B; color: #94A3B8; }
#fenix-floating-mascot[data-state="offline"] .ffm-pulse-dot { background: #64748B; box-shadow: none; animation: none; }

/* ── 4. Fênix Life Immersive Mascot Modal ── */
.fenix-immersive-mascot-modal {
  position: fixed !important;
  inset: 0 !important;
  z-index: var(--fnx-z-modal, 9000) !important;
  background: radial-gradient(ellipse 90% 70% at 50% 40%, rgba(9, 18, 38, 0.98), #03060C 90%) !important;
  backdrop-filter: blur(32px) !important;
  -webkit-backdrop-filter: blur(32px) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  animation: fenixFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.fenix-immersive-mascot-modal.hidden {
  display: none !important;
}

.fim-header {
  height: 56px !important;
  padding: 0 24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  background: rgba(4, 8, 16, 0.8) !important;
}

.fim-brand {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.fim-brand strong {
  font-size: 15px !important;
  font-weight: 800 !important;
  color: #F8FAFC !important;
  letter-spacing: 0.06em !important;
}

.fim-brand span {
  font-size: 10px !important;
  padding: 2px 7px !important;
  border-radius: 4px !important;
  background: rgba(0, 217, 255, 0.15) !important;
  color: #00D9FF !important;
  border: 1px solid rgba(0, 217, 255, 0.3) !important;
  font-weight: 700 !important;
}

.fim-body {
  flex: 1 1 0 !important;
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 0 !important;
}

.fim-canvas-stage {
  position: relative !important;
  width: 440px !important;
  height: 440px !important;
  max-width: 90vw !important;
  max-height: 52vh !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

#fenixLife3DCanvas {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
}

.fim-spectrum-canvas {
  position: absolute !important;
  inset: -20px !important;
  pointer-events: none !important;
  z-index: 1 !important;
  width: calc(100% + 40px) !important;
  height: calc(100% + 40px) !important;
}

.fim-subtitles-bar {
  max-width: 720px !important;
  width: 90% !important;
  min-height: 48px !important;
  padding: 10px 18px !important;
  margin: 12px auto !important;
  background: rgba(8, 14, 26, 0.85) !important;
  border: 1px solid rgba(0, 217, 255, 0.28) !important;
  border-radius: 12px !important;
  text-align: center !important;
  font-size: 14px !important;
  color: #E2E8F0 !important;
  line-height: 1.5 !important;
  box-shadow: 0 12px 36px rgba(0,0,0,0.6) !important;
  z-index: var(--fnx-z-subtitles, 9100) !important;
}

.fim-subtitles-bar .sub-word {
  display: inline-block !important;
  transition: color 0.15s ease, transform 0.15s ease !important;
}

.fim-subtitles-bar .sub-word.active {
  color: #00D9FF !important;
  font-weight: 700 !important;
  transform: scale(1.08) !important;
}

.fim-controls-bar {
  display: flex !important;
  align-items: center !important;
  gap: 16px !important;
  padding: 16px 24px !important;
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
  background: rgba(4, 8, 16, 0.85) !important;
  width: 100% !important;
  box-sizing: border-box !important;
  justify-content: center !important;
}

.fim-mic-btn {
  width: 52px !important;
  height: 52px !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 245, 160, 0.2)) !important;
  border: 2px solid #00D9FF !important;
  color: #00D9FF !important;
  font-size: 20px !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.3) !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.fim-mic-btn.active {
  background: #EF4444 !important;
  border-color: #F87171 !important;
  color: #FFFFFF !important;
  box-shadow: 0 0 25px rgba(239, 68, 68, 0.6) !important;
  animation: ffmPulse 1s infinite !important;
}

.fim-text-input {
  max-width: 460px !important;
  flex: 1 !important;
  height: 40px !important;
  background: rgba(11, 18, 32, 0.85) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 8px !important;
  color: #F8FAFC !important;
  padding: 0 14px !important;
  font-size: 13px !important;
  outline: none !important;
}

.fim-text-input:focus {
  border-color: #00D9FF !important;
  box-shadow: 0 0 12px rgba(0, 217, 255, 0.25) !important;
}

/* ── 5. Critical Action Safety Confirmation Modal ── */
.fenix-critical-safety-modal {
  position: fixed !important;
  inset: 0 !important;
  z-index: var(--fnx-z-confirm, 9200) !important;
  background: rgba(2, 4, 8, 0.85) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.fenix-critical-safety-modal.hidden {
  display: none !important;
}

.fcsm-card {
  width: 480px !important;
  max-width: 92vw !important;
  background: rgba(11, 16, 26, 0.96) !important;
  border: 1px solid rgba(244, 63, 94, 0.45) !important;
  border-radius: 14px !important;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.9), 0 0 35px rgba(244, 63, 94, 0.18) !important;
  padding: 24px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
}

.fcsm-header {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  color: #FB7185 !important;
  font-size: 16px !important;
  font-weight: 800 !important;
}

/* ── 6. Viewport Adaptive Rules (7 Viewports) ── */
@media (min-width: 1440px) {
  .fenix-modular-bottom-dock {
    grid-template-columns: 320px repeat(3, minmax(240px, 1fr)) !important;
    height: 236px !important;
  }
}

@media (max-width: 1366px) {
  .fenix-modular-bottom-dock {
    grid-template-columns: 280px repeat(3, minmax(190px, 1fr)) !important;
    height: 210px !important;
    gap: 8px !important;
  }
  .spatial-building-inspector-panel {
    bottom: calc(210px + 12px) !important;
    width: min(360px, 34vw) !important;
  }
  #fenix-floating-mascot {
    bottom: calc(210px + 14px) !important;
  }
}

@media (max-width: 1024px) {
  .fenix-modular-bottom-dock {
    grid-template-columns: 1fr 1fr !important;
    grid-template-rows: 1fr 1fr !important;
    height: 280px !important;
  }
  .spatial-building-inspector-panel {
    bottom: calc(280px + 12px) !important;
    width: min(340px, 45vw) !important;
  }
  #fenix-floating-mascot {
    bottom: calc(280px + 14px) !important;
  }
}

@media (max-width: 768px) {
  .fenix-modular-bottom-dock {
    grid-template-columns: 1fr !important;
    height: 240px !important;
    overflow-y: auto !important;
  }
  .spatial-building-inspector-panel {
    top: auto !important;
    bottom: 240px !important;
    left: 10px !important;
    right: 10px !important;
    width: calc(100% - 20px) !important;
    max-width: 100% !important;
    height: 48vh !important;
  }
}

@media (max-width: 480px) {
  .fenix-modular-bottom-dock {
    height: 200px !important;
    padding: 0 8px 8px 8px !important;
  }
  .spatial-building-inspector-panel {
    bottom: 200px !important;
    height: 52vh !important;
  }
  #fenix-floating-mascot {
    bottom: calc(200px + 10px) !important;
    right: 10px !important;
  }
  .fim-canvas-stage {
    width: 280px !important;
    height: 280px !important;
  }
}
`;
  content += patchCSS;
  fs.writeFileSync(cssPath, content, 'utf8');
  console.log('Appended Fênix Spatial CSS successfully to unified.css');
} else {
  console.log('Fênix Spatial CSS already present in unified.css');
}
