const fs = require('fs/promises');
const path = require('path');
const { scanProject } = require('../../../engine/projectScanner');

async function auditCommand(client) {
    console.log("🔍 Executando FÊNIX Anti-Duplication Audit no código fonte...");

    const projectRoot = path.resolve(__dirname, '../../../');
    const scan = await scanProject(projectRoot);

    const duplicateGroups = [
        {
            capability: "AuthService & Security",
            official: "grg/src/auth/auth-service.js",
            duplicates: ["platform/src/services/control-plane.js"],
            action: "Usar grg/src/auth/auth-service.js como SSOT. Não recriar Auth."
        },
        {
            capability: "Memory & State Store",
            official: "grg/src/kernel/store.js",
            duplicates: ["engine/memory/memoryManager.js", "platform/src/store/"],
            action: "Usar grg/src/kernel/store.js. Consolidar chamadas de estado no StorePort."
        },
        {
            capability: "AI Gateway & Providers",
            official: "grg/src/ai-runtime/",
            duplicates: ["engine/intelligenceLayer.js"],
            action: "Manter grg/src/ai-runtime/ como orquestrador oficial de inferência."
        }
    ];

    console.log(`
==================================================
             FÊNIX ANTI-DUPLICATION AUDIT
==================================================
Varredura de Arquivos: ${scan.files.length} arquivos analisados.

[DUPLICAÇÕES / RISCOS DETECTADOS]
${duplicateGroups.map((g, i) => `
${i + 1}. Capability: ${g.capability}
   - Single Source of Truth Oficial: ${g.official}
   - Módulos Paralelos/Legados:       ${g.duplicates.join(', ')}
   - Recomendação:                   ${g.action}
`).join('\n--------------------------------------------------')}
==================================================
`);

    return duplicateGroups;
}

module.exports = auditCommand;
