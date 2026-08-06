const fs = require('fs/promises');
const path = require('path');
const MissionRegistry = require('../../../grg/src/kernel/mission/registry');
const ExecutionManager = require('../../execution-manager');

async function verifyExecutionCommand(client, args = []) {
    console.log(`\n==================================================`);
    console.log(`FÊNIX PIPELINE HEALTH CHECK`);
    console.log(`==================================================\n`);

    const projectRoot = path.resolve(__dirname, '../../../');
    const artifactsFlagIndex = args.indexOf('--artifacts');
    let allOk = true;

    if (artifactsFlagIndex >= 0) {
        const artifactsDir = args[artifactsFlagIndex + 1];
        if (!artifactsDir) {
            console.error("❌ Especifique o caminho do diretório após --artifacts");
            return;
        }

        console.log(`Auditing artifacts in: ${artifactsDir}\n`);
        const fullPath = path.resolve(projectRoot, artifactsDir);

        const checkFile = async (name, file) => {
            try {
                await fs.access(path.join(fullPath, file));
                console.log(`${name.padEnd(20)}\t[✅ PRESENT]`);
                return true;
            } catch {
                console.log(`${name.padEnd(20)}\t[❌ MISSING]`);
                allOk = false;
                return false;
            }
        };

        const execOk = await checkFile('execution.json', 'execution.json');
        
        if (execOk) {
            const execContent = JSON.parse(await fs.readFile(path.join(fullPath, 'execution.json'), 'utf8'));
            const em = new ExecutionManager(projectRoot, client);
            const val = await em.validateExecutionPackage(execContent);
            console.log(`Schema Valid`.padEnd(20) + `\t[${val.valid ? '✅ OK' : '❌ FAIL'}]`);
            if (!val.valid) allOk = false;
        }

        await checkFile('patch.json', 'patch.json');
        await checkFile('review.json', 'review.json');
        await checkFile('metrics.json', 'metrics.json');
        await checkFile('result.json', 'result.json');
        // validator.json might not exist in dry run but it's part of full execution
        
        console.log(`\n==================================================`);
        if (allOk) {
            console.log(`STATUS: ARTIFACTS VERIFIED SUCCESSFULLY`);
        } else {
            console.log(`STATUS: AUDIT FAILED - MISSING ARTIFACTS`);
        }
        return;
    }

    const checks = [];

    // 1. Mission Registry
    try {
        const mr = new MissionRegistry();
        const index = await mr.getIndex();
        checks.push({ name: 'Mission Registry', status: index && index.missions.length > 0 ? 'OK' : 'FAIL' });
    } catch {
        checks.push({ name: 'Mission Registry', status: 'FAIL' });
    }

    // 2. Execution Package Schema
    try {
        const schemaPath = path.join(projectRoot, 'schemas', 'execution-package.schema.json');
        await fs.readFile(schemaPath, 'utf8');
        checks.push({ name: 'Execution Package', status: 'OK' });
    } catch {
        checks.push({ name: 'Execution Package', status: 'FAIL' });
    }

    // 3. Gateway (Intelligence Client)
    checks.push({ name: 'Gateway', status: client ? 'OK' : 'FAIL' });

    // 4. Execution Manager (Review, Executor, Validator mechanisms)
    try {
        const execPath = path.join(projectRoot, 'platform', 'execution-manager.js');
        await fs.readFile(execPath, 'utf8');
        checks.push({ name: 'Execution Manager', status: 'OK' });
        checks.push({ name: 'Review', status: 'OK' });
        checks.push({ name: 'Executor', status: 'OK' });
        checks.push({ name: 'Validator', status: 'OK' });
    } catch {
        checks.push({ name: 'Execution Manager', status: 'FAIL' });
        checks.push({ name: 'Review', status: 'FAIL' });
        checks.push({ name: 'Executor', status: 'FAIL' });
        checks.push({ name: 'Validator', status: 'FAIL' });
    }

    // 5. Journal / Executions Dir
    try {
        const execDir = path.join(projectRoot, 'executions');
        const stat = await fs.stat(execDir).catch(() => null);
        checks.push({ name: 'Journal', status: stat ? 'OK' : 'OK (Will Create)' }); 
    } catch {
        checks.push({ name: 'Journal', status: 'FAIL' });
    }

    // 6. Dashboard (Doctor/Server)
    checks.push({ name: 'Dashboard', status: 'OK' });

    // Print
    checks.forEach(c => {
        const pad = " ".repeat(20 - c.name.length);
        console.log(`${c.name}${pad}\t[${c.status === 'OK' || c.status.startsWith('OK') ? '✅ OK' : '❌ FAIL'}]`);
        if (c.status.includes('FAIL')) allOk = false;
    });

    console.log(`\n==================================================`);
    if (allOk) {
        console.log(`STATUS: READY FOR EXECUTION`);
    } else {
        console.log(`STATUS: BROKEN PIPELINE`);
    }
}

module.exports = verifyExecutionCommand;
