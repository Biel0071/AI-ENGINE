class MissionEngine {
    constructor(capabilityRegistry, stateEngine) {
        this.capabilities = capabilityRegistry;
        this.state = stateEngine;
    }

    async calculateActiveMission(currentState) {
        const caps = this.capabilities.getCapabilities();
        const ledger = await this.state.getDecisionLedger();

        const mission = {
            id: "MIS-001",
            title: "Estabilização do Runtime de Produção & VPS Readiness",
            ccmapPhase: "FASE 6 — Capability OS & Infrastructure Adapters",
            businessGoal: "Garantir resiliência de produção com persistência PostgreSQL e filas Redis",
            requiredCapabilities: ["node", "git", "docker"],
            capabilitiesAvailable: {
                docker: caps.docker.enabled,
                node: caps.node.enabled,
                github: caps.github.enabled
            },
            targetComponent: "grg/src/infrastructure/",
            blockers: [],
            actionableSteps: [
                "Criar PostgresStoreAdapter em grg/src/infrastructure/postgres-store.js",
                "Manter fallback FileStore para desenvolvimento local",
                "Conectar Redis Queue para os Workers de background"
            ],
            recentDecisions: ledger.slice(-2)
        };

        if (!caps.docker.enabled) {
            mission.blockers.push("Docker daemon não detectado no ambiente local.");
        }

        return mission;
    }
}

module.exports = MissionEngine;
