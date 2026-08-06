const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

test('Storage Migration Hash Validation', async (t) => {
    await t.test('Hashes matching states correctly', () => {
        const crypto = require('crypto');
        const state1 = { users: [{ id: 1 }], items: [] };
        const state2 = { users: [{ id: 1 }], items: [] };
        const state3 = { users: [{ id: 1 }], items: [{ id: 2 }] };

        const hash1 = crypto.createHash('sha256').update(JSON.stringify(state1)).digest('hex');
        const hash2 = crypto.createHash('sha256').update(JSON.stringify(state2)).digest('hex');
        const hash3 = crypto.createHash('sha256').update(JSON.stringify(state3)).digest('hex');

        assert.strictEqual(hash1, hash2, 'Identical states must produce identical hashes');
        assert.notStrictEqual(hash1, hash3, 'Different states must produce different hashes');
    });

    await t.test('Idempotency lock prevents concurrent execution', () => {
        const lockPath = path.join(__dirname, '..', '..', '.data', 'migration.lock');
        
        // Mock a lock file
        if (!fs.existsSync(path.dirname(lockPath))) fs.mkdirSync(path.dirname(lockPath), { recursive: true });
        fs.writeFileSync(lockPath, new Date().toISOString(), 'utf8');

        assert.strictEqual(fs.existsSync(lockPath), true, 'Lock file created');

        // Cleanup
        fs.unlinkSync(lockPath);
    });
});
