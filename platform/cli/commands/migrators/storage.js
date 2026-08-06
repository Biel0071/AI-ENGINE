const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const StateEngine = require('../../state-engine');

const lockPath = path.join(__dirname, '..', '..', '..', '.data', 'migration.lock');
const backupPath = path.join(__dirname, '..', '..', '..', '.data', 'store.backup.json');
const reportsDir = path.join(__dirname, '..', '..', '..', 'reports');
const statePath = path.join(__dirname, '..', '..', '..', '.data', 'state.json');

function hashState(state) {
    if (!state) return '(empty)';
    return crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

function countCollections(state) {
    if (!state) return 0;
    return Object.keys(state).filter(k => Array.isArray(state[k])).length;
}

function countObjects(state) {
    if (!state) return 0;
    let count = 0;
    for (const key of Object.keys(state)) {
        if (Array.isArray(state[key])) count += state[key].length;
    }
    return count;
}

async function run(dryRun = false) {
    if (fs.existsSync(lockPath)) {
        console.error('❌ Lock file detected: migration.lock');
        console.error('Outra migração pode estar em andamento ou falhou inesperadamente.');
        process.exit(1);
    }

    require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
    
    // Load FileStore
    let fileState = null;
    if (fs.existsSync(statePath)) {
        const raw = fs.readFileSync(statePath, 'utf8');
        const { migrateState } = require('../../../grg/src/kernel/state-migrations');
        fileState = migrateState(JSON.parse(raw)).state;
    } else {
        console.error('❌ Origem FileStore não encontrada em .data/state.json');
        process.exit(1);
    }

    const { PostgresStore } = require('../../../grg/src/infrastructure/database/postgres-store');
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL não configurado no .env');
        process.exit(1);
    }

    let pgStore;
    try {
        pgStore = await PostgresStore.connect({
            connectionString: process.env.DATABASE_URL,
            schema: process.env.FENIX_DATABASE_SCHEMA || 'fenix'
        });
    } catch (e) {
        console.error('❌ Falha ao conectar no PostgreSQL:', e.message);
        process.exit(1);
    }

    let pgState = null;
    try {
        pgState = await pgStore.read();
    } catch (e) {
        // Not initialized, handled by PostgresStore.connect actually
        // Wait, PostgresStore.connect does initialize it.
    }

    const hashOrigin = hashState(fileState);
    const hashDest = hashState(pgState);

    console.log("====================================");
    console.log("     Storage Migration Preview      ");
    console.log("====================================");
    console.log(`Origem         : FileStore`);
    console.log(`Destino        : PostgreSQL`);
    console.log(`Coleções       : ${countCollections(fileState)}`);
    console.log(`Objetos        : ${countObjects(fileState)}`);
    console.log(`Hash origem    : ${hashOrigin}`);
    console.log(`Hash destino   : ${hashDest}`);
    
    if (hashOrigin === hashDest && hashOrigin !== '(empty)') {
        console.log(`Nenhuma ação necessária.`);
        console.log("====================================");
        console.log(`Migração já realizada ou estados idênticos.`);
        await pgStore.close();
        return;
    }

    const canMigrate = hashOrigin !== '(empty)';
    console.log(`Pode migrar    : ${canMigrate ? 'YES' : 'NO'}`);
    console.log("====================================");

    if (dryRun) {
        console.log("[Dry Run] Migração cancelada.");
        await pgStore.close();
        return;
    }

    if (!canMigrate) {
        console.log("❌ Origem vazia. Cancelando migração.");
        await pgStore.close();
        process.exit(1);
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => rl.question('Prosseguir? (Y/N) ', resolve));
    rl.close();

    if (answer.trim().toUpperCase() !== 'Y') {
        console.log("Migração abortada pelo usuário.");
        await pgStore.close();
        return;
    }

    // LOCK
    fs.writeFileSync(lockPath, new Date().toISOString(), 'utf8');

    const startTime = Date.now();
    let status = 'FAILED';

    try {
        // Backup
        console.log("⏳ Criando backup automático...");
        if (!fs.existsSync(path.dirname(backupPath))) {
            fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        }
        fs.writeFileSync(backupPath, JSON.stringify(fileState, null, 2), 'utf8');
        
        // Migrate
        console.log("⏳ Gravando no PostgreSQL...");
        await pgStore.write(fileState);
        
        // Validate
        console.log("⏳ Validando Hash...");
        const newPgState = await pgStore.read();
        const newHashDest = hashState(newPgState);

        if (hashOrigin !== newHashDest) {
            throw new Error(`Hash mismatch! Origin: ${hashOrigin}, Dest: ${newHashDest}`);
        }

        status = 'SUCCESS';
        console.log("✅ Hash validado com sucesso.");
    } catch (e) {
        console.error("❌ Falha durante a migração:", e.message);
    } finally {
        fs.unlinkSync(lockPath);
        await pgStore.close();
    }

    const durationMs = Date.now() - startTime;
    const duration = (durationMs / 1000).toFixed(2) + 's';

    console.log("===================================");
    console.log("         Migration Report          ");
    console.log("===================================");
    console.log(`Origem   : FileStore`);
    console.log(`Destino  : PostgreSQL`);
    console.log(`Coleções : ${countCollections(fileState)}`);
    console.log(`Objetos  : ${countObjects(fileState)}`);
    console.log(`Backup   : ${status === 'SUCCESS' ? 'OK' : 'FAILED'}`);
    console.log(`Hash     : ${status === 'SUCCESS' ? 'OK' : 'FAILED'}`);
    console.log(`Tempo    : ${duration}`);
    console.log(`Resultado: ${status}`);
    console.log("===================================");

    if (status === 'SUCCESS') {
        // Report
        if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
        const report = {
            mission: "Storage Migration",
            timestamp: new Date().toISOString(),
            status,
            records: countObjects(fileState),
            hash: hashOrigin,
            backup: "store.backup.json",
            duration
        };
        const reportFile = path.join(reportsDir, `migration-${new Date().toISOString().split('T')[0]}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');

        // Journal
        try {
            const engine = new StateEngine();
            await engine.saveDecision({
                decision: "Migração de Storage para PostgreSQL",
                reason: "CLI Migration Command Executed. Node não disponível no ambiente de execução para homologação.",
                alternatives: ["FileStore (original)"],
                missionId: "storage-migration",
                status: "IMPLEMENTED",
                implementation: {
                    completed: true,
                    timestamp: new Date().toISOString()
                },
                validation: {
                    completed: false,
                    reason: "Node runtime unavailable para execução local real-time (necessário Homologação QA)"
                },
                evidence: {
                    tests: false,
                    dryRun: false,
                    rollback: false,
                    doctor: false
                },
                deployment: {
                    allowed: false
                },
                ...report
            });
        } catch (e) {
            console.warn("Aviso: Falha ao salvar no journal:", e.message);
        }
    } else {
        process.exit(1);
    }
}

async function rollback() {
    if (!fs.existsSync(backupPath)) {
        console.error(`❌ Backup não encontrado em: ${backupPath}`);
        process.exit(1);
    }

    require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
    
    const { PostgresStore } = require('../../../grg/src/infrastructure/database/postgres-store');
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL não configurado no .env');
        process.exit(1);
    }

    let pgStore;
    try {
        pgStore = await PostgresStore.connect({
            connectionString: process.env.DATABASE_URL,
            schema: process.env.FENIX_DATABASE_SCHEMA || 'fenix'
        });
    } catch (e) {
        console.error('❌ Falha ao conectar no PostgreSQL:', e.message);
        process.exit(1);
    }

    try {
        console.log("⏳ Restaurando backup para o PostgreSQL...");
        const { migrateState } = require('../../../grg/src/kernel/state-migrations');
        const backupState = migrateState(JSON.parse(fs.readFileSync(backupPath, 'utf8'))).state;
        
        await pgStore.write(backupState);
        console.log("✅ Rollback executado com sucesso.");
    } catch (e) {
        console.error("❌ Falha no rollback:", e.message);
    } finally {
        await pgStore.close();
    }
}

module.exports = { run, rollback };
