const fs = require('fs/promises');
const path = require('path');
const MissionRegistry = require('../../../grg/src/kernel/mission/registry');

async function missionCommand(client, args = []) {
    const registry = new MissionRegistry();
    const action = args[0] || 'list';
    const id = args[1];

    if (action === 'list') {
        const index = await registry.getIndex();
        console.log("\n==================================================");
        console.log("               FÊNIX MISSION REGISTRY");
        console.log("==================================================\n");
        if (index.missions.length === 0) {
            console.log("Nenhuma missão encontrada.");
        } else {
            for (const mid of index.missions) {
                const m = await registry.getMission(mid);
                if (m) {
                    const isActive = index.activeMission === mid ? ' (ACTIVE)' : '';
                    console.log(`[${m.id}] ${m.title}${isActive}`);
                    console.log(`  State: ${m.state}`);
                    console.log(`  Kind:  ${m.kind}\n`);
                }
            }
        }
    } else if (action === 'inspect') {
        if (!id) return console.error("ID da missão é obrigatório para inspect.");
        const m = await registry.getMission(id);
        if (!m) return console.error("Missão não encontrada.");
        
        console.log(`\nMISSION-${m.id}: ${m.title}`);
        console.log(`Status: ${m.state}`);
        console.log(`Kind: ${m.kind}`);
        console.log(`Goal: ${m.goal}\n`);
        
        console.log(`[CHECKS]`);
        for (const [key, val] of Object.entries(m.checks)) {
            console.log(`  ${val ? '✅' : '⏳'} ${key}`);
        }
        console.log("");
    } else {
        console.log("Subcomandos disponíveis: list, inspect <id>");
    }
}

module.exports = missionCommand;
