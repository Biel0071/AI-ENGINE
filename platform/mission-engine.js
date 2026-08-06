class MissionEngine {
    constructor(capabilityRegistry, stateEngine, intelligenceClient) {
        this.capabilities = capabilityRegistry;
        this.state = stateEngine;
        this.intelligenceClient = intelligenceClient;
    }

    async calculateActiveMission(currentState) {
        const caps = this.capabilities.getCapabilities();
        const ledger = await this.state.getDecisionLedger();

        const safeState = currentState || {};
        
        // No lugar de pedir para a IA planejar uma nova arquitetura, 
        // o Scheduler apenas determina qual é a missão destrancada na fila.
        const MissionRegistry = require('../grg/src/kernel/mission/registry');
        const mr = new MissionRegistry();
        const activeMission = await mr.getActive();
        
        if (activeMission) {
            return activeMission;
        }

        return {
            id: 'NONE',
            title: 'Todas as missões concluídas',
            state: 'IDLE'
        };
    }
}

module.exports = MissionEngine;
