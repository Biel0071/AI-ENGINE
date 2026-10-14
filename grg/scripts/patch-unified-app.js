const fs = require('fs');

const unifiedPath = '/opt/fenix-os/public/unified-app.js';
let content = fs.readFileSync(unifiedPath, 'utf8');

const target = "  addEvt('terminalBtn', 'click', async () => {\n    if (!$('terminalCmd')) return;\n    const out = await api('/dev/terminal', { method: 'POST', body: JSON.stringify({ command: $('terminalCmd').value, sessionId: `ui-${Date.now()}` }) });\n    if ($('terminalResult')) $('terminalResult').textContent += `\\n$ ${$('terminalCmd').value}\\n${out.stdout || out.stderr || 'ok'}`;\n    $('terminalCmd').value = '';\n  });";

const replacement = "  addEvt('terminalBtn', 'click', async (e) => {\n    if (typeof window.loadTerminalView === 'function') {\n      return; // Handled canonically by loadTerminalView in index.html\n    }\n    if (!$('terminalCmd')) return;\n    const cmd = $('terminalCmd').value.trim();\n    if (!cmd) return;\n    try {\n      const out = await api('/v2/terminal/exec', { method: 'POST', body: JSON.stringify({ command: cmd, cwd: '/opt/fenix-os/grg/src' }) });\n      if ($('terminalResult')) $('terminalResult').textContent = `$ ${cmd}\\n${out.stdout || out.stderr || 'ok'}`;\n    } catch(err) {}\n  });";

if (content.includes("addEvt('terminalBtn', 'click'")) {
  const start = content.indexOf("  addEvt('terminalBtn', 'click'");
  const end = content.indexOf("  addEvt('cmdBtn', 'click'", start);
  if (start !== -1 && end !== -1) {
    content = content.slice(0, start) + replacement + "\n  \n" + content.slice(end);
    fs.writeFileSync(unifiedPath, content, 'utf8');
    console.log('Successfully replaced terminalBtn in unified-app.js');
    if (fs.existsSync('/opt/fenix-os/grg/public/unified-app.js')) {
      fs.writeFileSync('/opt/fenix-os/grg/public/unified-app.js', content, 'utf8');
      console.log('Synced to /opt/fenix-os/grg/public/unified-app.js');
    }
  } else {
    console.log('Bounds not found');
  }
} else {
  console.log('terminalBtn pattern not found in unified-app.js');
}
