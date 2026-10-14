import os
import sys

# 1. Patch /opt/fenix-os/public/index.html
index_path = '/opt/fenix-os/public/index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_term_btn_def = "    const terminalCmd = document.getElementById('terminalCmd');\n    const terminalBtn = document.getElementById('terminalBtn');"
new_term_btn_def = "    const terminalCmd = document.getElementById('terminalCmd');\n    let terminalBtn = document.getElementById('terminalBtn');"

if old_term_btn_def in content:
    content = content.replace(old_term_btn_def, new_term_btn_def, 1)
    print("Patched terminalBtn declaration to let")
else:
    print("terminalBtn declaration already patched or not found")

old_term_timeout = "body: JSON.stringify({ command: cmd, cwd: '/opt/fenix-os/grg/src' })\n        }, 12000);"
new_term_timeout = "body: JSON.stringify({ command: cmd, cwd: '/opt/fenix-os/grg/src' })\n        }, 30000);"

if old_term_timeout in content:
    content = content.replace(old_term_timeout, new_term_timeout, 1)
    print("Patched terminal timeout to 30000ms")
else:
    print("terminal timeout already patched or not found")

old_term_bind = """    if (terminalBtn) terminalBtn.onclick = runTerminalCommand;
    if (terminalCmd) {
      terminalCmd.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runTerminalCommand();
        }
      };
    }"""

new_term_bind = """    if (terminalBtn) {
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
    }"""

if old_term_bind in content:
    content = content.replace(old_term_bind, new_term_bind, 1)
    print("Patched terminalBtn clean binding")
else:
    print("terminalBtn clean binding already patched or not found")

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html successfully")

# 2. Patch /opt/fenix-os/public/unified-app.js
unified_path = '/opt/fenix-os/public/unified-app.js'
with open(unified_path, 'r', encoding='utf-8') as f:
    ucontent = f.read()

old_u_term = """  addEvt('terminalBtn', 'click', async () => {
    if (!$('terminalCmd')) return;
    const out = await api('/dev/terminal', { method: 'POST', body: JSON.stringify({ command: $('terminalCmd').value, sessionId: `ui-${Date.now()}` }) });
    if ($('terminalResult')) $('terminalResult').textContent += `\\n$ ${$('terminalCmd').value}\\n${out.stdout || out.stderr || 'ok'}`;
    $('terminalCmd').value = '';
  });"""

new_u_term = """  addEvt('terminalBtn', 'click', async (e) => {
    if (typeof window.loadTerminalView === 'function') {
      return; // Handled canonically by loadTerminalView in index.html
    }
    if (!$('terminalCmd')) return;
    const cmd = $('terminalCmd').value.trim();
    if (!cmd) return;
    try {
      const out = await api('/v2/terminal/exec', { method: 'POST', body: JSON.stringify({ command: cmd, cwd: '/opt/fenix-os/grg/src' }) });
      if ($('terminalResult')) $('terminalResult').textContent = `$ ${cmd}\\n${out.stdout || out.stderr || 'ok'}`;
    } catch(err) {}
  });"""

if old_u_term in ucontent:
    ucontent = ucontent.replace(old_u_term, new_u_term, 1)
    with open(unified_path, 'w', encoding='utf-8') as f:
        f.write(ucontent)
    print("Updated unified-app.js successfully")
else:
    print("unified-app.js target not found or already patched")

# Also copy to grg/public if exists
for alt_path in ['/opt/fenix-os/grg/public/index.html', '/opt/fenix-os/grg/public/unified-app.js']:
    if os.path.exists(alt_path):
        if 'index.html' in alt_path:
            with open(alt_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Synced to {alt_path}")
        elif 'unified-app.js' in alt_path:
            with open(alt_path, 'w', encoding='utf-8') as f:
                f.write(ucontent)
            print(f"Synced to {alt_path}")

print("ALL PATCHES APPLIED.")
