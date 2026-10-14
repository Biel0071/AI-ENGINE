const STATES = {
    PLANNED: {
        next: ["IMPLEMENTED"],
        requires: []
    },
    IMPLEMENTED: {
        next: ["VALIDATED"],
        requires: [
            "implementationCompleted"
        ]
    },
    VALIDATED: {
        next: ["VERIFIED_SUCCESS"],
        requires: [
            "testsPassed",
            "dryRunPassed",
            "doctorPassed",
            "hashValidated",
            "rollbackPassed"
        ]
    },
    VERIFIED_SUCCESS: {
        next: ["DEPLOYED"],
        requires: [
            "deploymentApproved"
        ]
    },
    DEPLOYED: {
        next: [],
        requires: []
    }
};

class MissionGates {
    static getDefinition(state) {
        return STATES[state];
    }
    
    static canTransition(currentState, nextState, checks) {
        const def = STATES[currentState];
        if (!def) return { allowed: false, reason: `Estado desconhecido: ${currentState}` };
        if (!def.next.includes(nextState)) return { allowed: false, reason: `Transição ilegal: ${currentState} -> ${nextState}` };
        
        const nextDef = STATES[nextState];
        if (nextDef && nextDef.requires) {
            for (const req of nextDef.requires) {
                if (checks[req] !== true) {
                    return { allowed: false, reason: `Gate bloqueado: O check '${req}' não foi satisfeito.` };
                }
            }
        }
        
        return { allowed: true };
    }
}

module.exports = { MissionGates, STATES };
