'use strict';
const sqlite3 = require('/opt/fenix-os/grg/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('/opt/fenix-os/grg/.data/fenix.db', sqlite3.OPEN_READONLY);
db.get('SELECT document FROM kernel_state WHERE state_key = ?', ['global'], (error, row) => {
  if (error) { console.error(error.message); process.exitCode = 2; db.close(); return; }
  const state = JSON.parse(row.document);
  const recent = (state.aiCache || []).filter((item) => item.provider === 'aiplatform' && item.createdAt >= '2026-09-23T11:35:00').slice(-5);
  console.log(JSON.stringify(recent.map((item) => ({ createdAt: item.createdAt, provider: item.provider, model: item.model, length: item.text?.length || 0, sample: String(item.text || '').slice(0, 1200).replace(/(api[_ -]?key|password|secret|token)\s*[:=]\s*[^\s,}]+/gi, '$1=[redacted]') }))));
  db.close();
});
