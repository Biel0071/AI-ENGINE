'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const css = fs.readFileSync(path.join(publicDir, 'city-sidebar-overlay-fix.css'), 'utf8');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

test('mobile Fênix chat opens as a bottom drawer without covering the main navigation', () => {
  const match = css.match(/@media\s*\(max-width:\s*760px\)[\s\S]*?body\.has-right-sidebar-open\s+#fenix-right-sidebar\.open:not\(\.state-expanded\)\s*\{([^}]+)\}/);
  assert.ok(match, 'mobile drawer rule must exist for the open chat panel');
  assert.match(match[1], /left:\s*76px\s*!important/);
  assert.match(match[1], /height:\s*min\(58dvh,\s*560px\)\s*!important/);
  assert.match(match[1], /bottom:\s*calc\(var\(--bottom-dock-height/);
  assert.match(match[1], /max-width:\s*none\s*!important/);

  const phone = css.match(/@media\s*\(max-width:\s*600px\)[\s\S]*?body\.has-right-sidebar-open\s+#fenix-right-sidebar\.open:not\(\.state-expanded\)\s*\{([^}]+)\}/);
  assert.ok(phone, 'phone layout must use the available width below the horizontal navigation');
  assert.match(phone[1], /left:\s*8px\s*!important/);
});

test('mobile drawer stylesheet is cache-busted by the canonical shell', () => {
  assert.match(html, /city-sidebar-overlay-fix\.css\?v=20261021-mobile-drawer-2/);
});
