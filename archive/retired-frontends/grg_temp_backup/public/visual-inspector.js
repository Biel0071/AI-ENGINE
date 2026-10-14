function runWhenReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

runWhenReady(() => {
  // Add a "VISUAL INSPECTOR" button to the editor toolbar
  const tabsHeader = document.querySelector('.editor-toolbar');
  if (tabsHeader) {
    const inspectBtn = document.createElement('button');
    inspectBtn.className = 'toolbar-btn';
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
      const target = getIframeElementAt(e);
      if (!target) {
        overlay.innerHTML = '';
        return;
      }
      const box = iframeBox(target);
      overlay.innerHTML = `<div style="position:absolute; left:${box.left}px; top:${box.top}px; width:${box.width}px; height:${box.height}px; border:2px solid var(--accent); background:rgba(220,38,38,0.12); pointer-events:none;"></div>`;
    });

    overlay.addEventListener('click', async (e) => {
      if (!inspectorActive) return;
      e.preventDefault();
      e.stopPropagation();

      const target = getIframeElementAt(e);
      if (!target) {
        console.warn('[Visual Inspector] No same-origin DOM element found at click.');
        return;
      }
      const capture = captureElement(target);
      console.log('[Visual Inspector] Captured real DOM element', capture);

      const instruction = window.prompt('Visual change for selected element:');
      if (!instruction) return;

      try {
        const response = await fetch('/api/dev/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (localStorage.getItem('grg_token') || '')
          },
          body: JSON.stringify({
            projectId: 'fenix_main',
            prompt: `VISUAL_FIX_JOB\nElement: ${capture.selector}\nText: ${capture.text}\nSource hint: ${capture.source || 'not published'}\nInstruction: ${instruction}`,
            client: 'FenixVisualInspector',
            visualCapture: capture
          })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        document.querySelector('button[data-view="city"]')?.click();
        document.dispatchEvent(new CustomEvent('fenix-live', {
          detail: { type: 'visual.capture', element: capture, jobId: data.job?.id || data.jobId || null }
        }));
      } catch (err) {
        console.error('[Visual Inspector] Failed to create visual job:', err);
        alert(`Failed to create visual job: ${err.message}`);
      }
    });

    function getIframeElementAt(event) {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return null;
        const iframeRect = iframe.getBoundingClientRect();
        const x = event.clientX - iframeRect.left;
        const y = event.clientY - iframeRect.top;
        return doc.elementFromPoint(x, y);
      } catch {
        return null;
      }
    }

    function iframeBox(element) {
      const iframeRect = iframe.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      return {
        left: iframeRect.left - overlayRect.left + rect.left,
        top: iframeRect.top - overlayRect.top + rect.top,
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height)
      };
    }

    function captureElement(element) {
      const attrs = Array.from(element.attributes || []).reduce((acc, attr) => {
        if (/password|token|secret|session|cookie/i.test(attr.name)) return acc;
        acc[attr.name] = attr.value;
        return acc;
      }, {});
      return {
        tag: element.tagName.toLowerCase(),
        selector: selectorFor(element),
        text: String(element.textContent || '').trim().slice(0, 160),
        attributes: attrs,
        source: element.getAttribute('data-source') || element.getAttribute('data-file') || null,
        rect: element.getBoundingClientRect().toJSON ? element.getBoundingClientRect().toJSON() : null,
        capturedAt: new Date().toISOString()
      };
    }

    function selectorFor(element) {
      if (element.id) return `#${element.id}`;
      const parts = [];
      let node = element;
      while (node && node.nodeType === 1 && parts.length < 5) {
        let part = node.tagName.toLowerCase();
        if (node.className && typeof node.className === 'string') {
          const classes = node.className.split(/\s+/).filter(Boolean).slice(0, 3);
          if (classes.length) part += '.' + classes.join('.');
        }
        const parent = node.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
          if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
        parts.unshift(part);
        node = parent;
      }
      return parts.join(' > ');
    }
  }
});
