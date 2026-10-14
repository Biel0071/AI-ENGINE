'use strict';
const Database = require('better-sqlite3');
const fs = require('fs');

const candidates = [
  '/opt/fenix-os/grg/var/data/fenix.db',
  '/opt/fenix-os/grg/var/fenix.db',
  '/opt/fenix-os/var/fenix.db',
  '/opt/fenix-os/grg/data/fenix.db',
  '/opt/fenix-os/grg/fenix.db'
];

for (const dbPath of candidates) {
  if (fs.existsSync(dbPath)) {
    try {
      const db = new Database(dbPath);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log(`DB ${dbPath} tables:`, tables.map(t => t.name));
      if (tables.some(t => t.name === 'users' || t.name === 'auth_users' || t.name === 'accounts')) {
        const userTable = tables.find(t => t.name.includes('user')).name;
        const users = db.prepare(`SELECT * FROM ${userTable} LIMIT 10`).all();
        console.log(`Users in ${userTable}:`, users.map(u => ({ id: u.id, userId: u.userId, username: u.username, role: u.role })));
      }
    } catch (e) {
      console.log(`Error reading ${dbPath}:`, e.message);
    }
  }
}
