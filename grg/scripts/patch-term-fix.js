const fs = require('fs');
const path = require('path');

// 1. Patch /opt/fenix-os/public/index.html
const indexPath = '/opt/fenix-os/public/index.html';
let content = fs.readFileSync(indexPath, 'utf8');

const oldTermBtnDef = "    const terminalCmd = document.getElementById('terminalCmd');\n    const terminalBtn = document.getElementById('terminalBtn');";
const newTermBtnDef = "    const terminalCmd = document.getElementById('terminalCmd');\n    let terminalBtn = document.getElementById('terminalBtn');";

if (content.includes(oldTermBtnDef)) {
  content = content.replace(oldTermBtnDef, newTermBtnDef);
  console.log('Patched terminalBtn declaration to let');
} else {
  console.log('terminalBtn declaration already patched or not found');
}

const oldTermTimeout = "body: JSON.stringify({ command: cmd, cwd: '/opt/fenix-os/grg/src' })\n        }, 12000);";
const newTermTimeout = "body: JSON.stringify({ command: cmd, cwd: '/opt/fenix-os/grg/src' })\n        }, 30000);";

if (content.includes(oldTermTimeout)) {
  content = content.replace(oldTermTimeout, newTermTimeout);
  console.log('Patched terminal timeout to 30000ms');
} else {
  console.log('terminal timeout already patched or not found');
}

const oldTermBind = `    if (terminalBtn) terminalBtn.onclick = runTerminalCommand;
    if (terminalCmd) {
      terminalCmd.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runTerminalCommand();
        }
      };
    }`;

const newTermBind = `    if (terminalBtn) {
      if (!terminalBtn.__fenixBound) {
        const cleanBtn = terminalBtn.cloneNode(true);
        cleanBtn.__fenixBound = true;
        terminalBtn.parentNode.replaceChild(cleanBtn, terminalBtn);
        terminalBtn = cleanBtn;
      }
      terminalBtn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        runTerminalCommand();
      };
    }
    if (terminalCmd) {
      terminalCmd.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          runTerminalCommand();
        }
      };
    }`;

if (content.includes(oldTermBind)) {
  content = content.replace(oldTermBind, newTermBind);
  console.log('Patched terminalBtn clean binding');
} else {
  console.log('terminalBtn clean binding already patched or not found');
}

fs.writeFileSync(indexPath, content, 'utf8');
console.log('Updated index.html successfully');

// 2. Patch /opt/fenix-os/public/unified-app.js
const unifiedPath = '/opt/fenix-os/public/unified-app.js';
let ucontent = fs.readFileSync(unifiedPath, 'utf8');

const oldUTerm = `  addEvt('terminalBtn', 'click', async () => {
    if (!$('terminalCmd')) return;
    const out = await api('/dev/terminal', { method: 'POST', body: JSON.stringify({ command: $('terminalCmd').value, sessionId: \`ui-\${Date.now()}\` }) });
    if ($('terminalResult')) $('terminalResult').textContent += \`\\n$ \${$('terminalCmd').value}\\n\${out.stdout || out.stderr || 'ok'}\`;
    $('terminalCmd').value = '';
  });`;

const newUTerm = `  addEvt('terminalBtn', 'click', async (e) => {
    if (typeof window.loadTerminalView === 'function') {
      return; // Handled canonically by loadTerminalView in index.html
    }
    if (!$('terminalCmd')) return;
    const cmd = $('terminalCmd').value.trim();
    if (!cmd) return;
    try {
      const out = await api('/v2/terminal/exec', { method: 'POST', body: JSON.stringify({ command: cmd, cwd: '/opt/fenix-os/grg/src' }) });
      if ($('terminalResult')) $('terminalResult').textContent = \`$ \${cmd}\\n\${out.stdout || out.stderr || 'ok'}\`;
    } catch(err) {}
  });`;

if (ucontent.includes(oldUTerm)) {
  ucontent = ucontent.replace(oldUTerm, newUTerm);
  fs.writeFileSync(unifiedPath, ucontent, 'utf8');
  console.log('Updated unified-app.js successfully');
} else {
  console.log('unified-app.js target not found or already patched');
}

// Also copy to grg/public if exists
for (const altPath of ['/opt/fenix-os/grg/public/index.html', '/opt/fenix-os/grg/public/unified-app.js']) {
  if (fs.existsSync(altPath)) {
    if (altPath.includes('index.html')) {
      fs.writeFileSync(altPath, content, 'utf8');
      console.log(`Synced to ${altPath}`);
    } else if (altPath.includes('unified-app.js')) {
      fs.writeFileSync(altPath, ucontent, 'utf8');
      console.log(`Synced to ${altPath}`);
    }
  }
}

console.log('ALL PATCHES APPLIED.');
