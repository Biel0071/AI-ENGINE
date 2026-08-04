const fs = require('fs/promises');
const path = require('path');
const syncCommand = require('./sync');

async function missionCommand(client) {
    const projectRoot = path.resolve(__dirname, '../../../');
    const snapshotPath = path.join(projectRoot, '.fenix-live-state.json');

    let state;
    try {
        const content = await fs.readFile(snapshotPath, 'utf8');
        state = JSON.parse(content);
    } catch {
        state = await syncCommand(client, { json: true });
    }

    const mission = {
        title: "Estabilização da Persistência de Produção & VPS Readiness",
        ccmapPhase: "FASE 6 — Capability OS & Infrastructure Adapters",
        priority: "ALTA",
        targetComponent: "grg/src/infrastructure/",
        objective: "Substituir FileStore JSON por um Adapter PostgreSQL mantendo 100% de compatibilidade com StorePort e 94/94 testes passando.",
        subObjectives: [
            "Criar PostgresStoreAdapter em grg/src/infrastructure/postgres-store.js",
            "Manter fallback para FileStore local quando FENIX_ENV=development",
            "Executar suíte de testes do kernel para validar concorrência"
        ],
        blockers: [
            "Faltam credenciais do PostgreSQL no .env local/docker-compose",
            "Redis Queue ainda não está ativado para os Workers em background"
        ],
        guidelines: [
            "NÃO recriar a interface de StorePort em grg/src/kernel/store.js",
            "NÃO alterar assinaturas de métodos existentes",
            "Toda alteração deve ser validada por 'npm test'"
        ]
    };

    console.log(`
==================================================
               FÊNIX ACTIVE MISSION
==================================================
Missão:         ${mission.title}
Fase CCMAP:     ${mission.ccmapPhase}
Prioridade:     ${mission.priority}
Componente:     ${mission.targetComponent}

[OBJETIVO PRINCIPAL]
${mission.objective}

[SUBOBJETIVOS]
${mission.subObjectives.map((sub, i) => `${i + 1}. ${sub}`).join('\n')}

[BLOQUEADORES DETECTADOS]
${mission.blockers.map((b, i) => `- ${b}`).join('\n')}

[DIRETRIZES DO EXECUTADOR]
${mission.guidelines.map(g => `- ${g}`).join('\n')}
==================================================
`);

    return mission;
}

module.exports = missionCommand;
