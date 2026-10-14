document.addEventListener('DOMContentLoaded', () => {
  let inspectorActive = false;
  
  // Create an inspect button inside the editor header
  const editorToolbar = document.querySelector('.editor-toolbar');
  if (editorToolbar) {
    const inspectBtn = document.createElement('button');
    inspectBtn.className = 'toolbar-btn';
    inspectBtn.innerHTML = '<i class="ph ph-bounding-box"></i> Inspect';
    inspectBtn.id = 'visualInspectBtn';
    editorToolbar.appendChild(inspectBtn);

    const overlay = document.getElementById('visualOverlay');
    const iframe = document.getElementById('previewIframe');

    inspectBtn.addEventListener('click', () => {
      inspectorActive = !inspectorActive;
      if (inspectorActive) {
        inspectBtn.classList.add('active');
        inspectBtn.style.color = 'var(--accent)';
        if (overlay) {
          overlay.style.pointerEvents = 'auto'; // Capture events over iframe
          overlay.style.background = 'rgba(230, 57, 70, 0.05)';
          overlay.style.cursor = 'crosshair';
        }
      } else {
        inspectBtn.classList.remove('active');
        inspectBtn.style.color = '';
        if (overlay) {
          overlay.style.pointerEvents = 'none';
          overlay.style.background = 'transparent';
          overlay.style.cursor = 'default';
          overlay.innerHTML = '';
        }
      }
    });

    if (overlay && iframe) {
      overlay.addEventListener('mousemove', (e) => {
        if (!inspectorActive) return;
        
        // Find element in iframe
        try {
          const iframeDoc = iframe.contentWindow.document;
          // Temporarily disable overlay pointer events to get element below it
          overlay.style.pointerEvents = 'none';
          const el = iframeDoc.elementFromPoint(e.offsetX, e.offsetY);
          overlay.style.pointerEvents = 'auto';
          
          if (el && el !== iframeDoc.body && el !== iframeDoc.documentElement) {
            const rect = el.getBoundingClientRect();
            overlay.innerHTML = `<div style="position:absolute; left:${rect.left}px; top:${rect.top}px; width:${rect.width}px; height:${rect.height}px; border:2px solid var(--accent); background:rgba(230,57,70,0.2); pointer-events:none; z-index:9999;">
               <div style="position:absolute; top:-20px; left:0; background:var(--accent); color:#fff; font-size:10px; padding:2px 4px; border-radius:2px; white-space:nowrap;">
                 ${el.tagName.toLowerCase()}${el.id ? '#'+el.id : ''}${el.className ? '.'+el.className.split(' ').join('.') : ''}
               </div>
            </div>`;
            overlay._lastHoveredElement = el;
          }
        } catch (err) {
          // Cross-origin or not loaded yet
        }
      });

      overlay.addEventListener('click', (e) => {
        if (!inspectorActive) return;
        const el = overlay._lastHoveredElement;
        if (el) {
          const promptInput = document.getElementById('prompt');
          if (promptInput) {
             const selector = `${el.tagName.toLowerCase()}${el.id ? '#'+el.id : ''}${el.className ? '.'+el.className.split(' ')[0] : ''}`;
             promptInput.value = `[ALVO: ${selector}] `;
             promptInput.focus();
          }
          
          // Disable inspector
          inspectBtn.click();
        }
      });
    }
  }
});
