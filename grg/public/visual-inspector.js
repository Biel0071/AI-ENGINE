document.addEventListener('DOMContentLoaded', () => {
  // Add a "VISUAL INSPECTOR" button to the tabs header
  const tabsHeader = document.querySelector('.tabs-header > div:first-child');
  if (tabsHeader) {
    const inspectBtn = document.createElement('button');
    inspectBtn.className = 'tab-btn';
    inspectBtn.innerHTML = '<i class="ph ph-bounding-box"></i> VISUAL INSPECT';
    inspectBtn.id = 'visualInspectBtn';
    tabsHeader.appendChild(inspectBtn);

    let inspectorActive = false;
    const overlay = document.getElementById('visualOverlay');
    const iframe = document.getElementById('previewIframe');

    inspectBtn.addEventListener('click', () => {
      inspectorActive = !inspectorActive;
      if (inspectorActive) {
        inspectBtn.classList.add('active');
        inspectBtn.style.color = 'var(--accent)';
        overlay.style.pointerEvents = 'auto'; // Capture clicks
        overlay.style.background = 'rgba(0, 255, 0, 0.1)';
        overlay.style.cursor = 'crosshair';
        console.log('[Visual Inspector] Activated');
      } else {
        inspectBtn.classList.remove('active');
        inspectBtn.style.color = '';
        overlay.style.pointerEvents = 'none';
        overlay.style.background = 'transparent';
        overlay.style.cursor = 'default';
        overlay.innerHTML = '';
      }
    });

    overlay.addEventListener('mousemove', (e) => {
      if (!inspectorActive) return;
      // In a real scenario, we'd send postMessage to the iframe to get element at (e.offsetX, e.offsetY)
      // Since it's a mock overlay, we just draw a hover box.
      overlay.innerHTML = `<div style="position:absolute; left:\${e.offsetX - 25}px; top:\${e.offsetY - 25}px; width:50px; height:50px; border:2px dashed #0f0; pointer-events:none;"></div>`;
    });

    overlay.addEventListener('click', (e) => {
      if (!inspectorActive) return;
      console.log('[Visual Inspector] Clicked at', e.offsetX, e.offsetY);
      
      // Simulate Element Selection
      const cockpitPrompt = document.getElementById('cockpitPrompt');
      if (cockpitPrompt) {
        cockpitPrompt.value = `[ELEMENT SELECTED: .agent-card (public/unified-app.js)] `;
        document.querySelector('button[data-view="cockpit"]')?.click();
      }
    });
  }
});

