const fs = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');

class StateEngine {
    constructor(projectRoot) {
        this.projectRoot = projectRoot || path.resolve(__dirname, '../');
        this.ledgerPath = path.join(this.projectRoot, 'memory', 'decision-ledger.json');
        this.statePath = path.join(this.projectRoot, '.fenix-live-state.json');
    }

    async getDecisionLedger() {
        try {
            const raw = await fs.readFile(this.ledgerPath, 'utf8');
            return JSON.parse(raw);
        } catch {
            return [
                {
                    id: "ADR-001",
                    decision: "Manter Monólito Modular CommonJS em Node.js para o Runtime GRG",
                    reason: "Desacoplamento por ports/adapters mantendo simplicidade de execução local",
                    alternatives: ["Microserviços Rust", "NestJS monólito"],
                    date: "2026-07-27"
                },
                {
                    id: "ADR-002",
                    decision: "Usar Single Source of Truth em grg/src/app.js para Composition Root",
                    reason: "Evitar duplicação de inicialização e paralelas instâncias de serviço",
                    alternatives: ["Singletons globais", "Injeção de dependência por decorator"],
                    date: "2026-08-04"
                }
            ];
        }
    }

    async saveDecision(decisionRecord) {
        const ledger = await this.getDecisionLedger();
        ledger.push({
            id: `ADR-${String(ledger.length + 1).padStart(3, '0')}`,
            date: new Date().toISOString().split('T')[0],
            ...decisionRecord
        });
        await fs.mkdir(path.dirname(this.ledgerPath), { recursive: true });
        await fs.writeFile(this.ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
        return ledger;
    }

    async computeDiff(previousState, currentState) {
        let modifiedFiles = [];
        try {
            const gitStatus = execSync('git status --porcelain', { cwd: this.projectRoot, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
            if (gitStatus) {
                modifiedFiles = gitStatus.split('\n').map(line => line.trim());
            }
        } catch {}

        return {
            changedFiles: modifiedFiles,
            count: modifiedFiles.length,
            hasChanges: modifiedFiles.length > 0,
            scoreDelta: previousState ? (currentState.scores.overall - previousState.scores.overall) : 0
        };
    }
}

module.exports = StateEngine;
