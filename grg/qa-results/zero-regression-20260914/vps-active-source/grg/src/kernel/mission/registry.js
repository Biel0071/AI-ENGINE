const fs = require('fs/promises');
const path = require('path');
const { MissionGates } = require('./gates');

class MissionRegistry {
    constructor() {
        this.missionsDir = path.resolve(__dirname, '../../../../../missions');
        this.registryPath = path.join(this.missionsDir, 'registry.json');
    }

    async _ensureDir() {
        try {
            await fs.mkdir(this.missionsDir, { recursive: true });
        } catch (e) {}
    }

    async getIndex() {
        await this._ensureDir();
        try {
            const data = await fs.readFile(this.registryPath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            return { activeMission: null, missions: [] };
        }
    }

    async saveIndex(index) {
        await this._ensureDir();
        await fs.writeFile(this.registryPath, JSON.stringify(index, null, 2));
    }

    async getMission(id) {
        const filePath = path.join(this.missionsDir, `${id}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            return null;
        }
    }

    async saveMission(mission) {
        const filePath = path.join(this.missionsDir, `${mission.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(mission, null, 2));
    }

    async getActive() {
        const index = await this.getIndex();
        if (!index.activeMission) return null;
        return await this.getMission(index.activeMission);
    }

    async start(id, title, kind, goal) {
        const index = await this.getIndex();
        
        const mission = {
            id,
            title,
            kind: kind || "FEATURE",
            state: "PLANNED",
            goal,
            history: [{ state: "PLANNED", timestamp: new Date().toISOString() }],
            checks: {
                implementationCompleted: false,
                testsPassed: false,
                dryRunPassed: false,
                doctorPassed: false,
                hashValidated: false,
                rollbackPassed: false,
                deploymentApproved: false
            },
            deployment: {}
        };
        
        if (!index.missions.includes(id)) {
            index.missions.push(id);
        }
        index.activeMission = id;
        
        await this.saveMission(mission);
        await this.saveIndex(index);
        return mission;
    }

    async _transition(id, nextState, checkUpdates = {}) {
        const mission = await this.getMission(id);
        if (!mission) throw new Error(`Mission ${id} not found`);

        // Apply new checks
        mission.checks = { ...mission.checks, ...checkUpdates };

        const validation = MissionGates.canTransition(mission.state, nextState, mission.checks);
        if (!validation.allowed) {
            throw new Error(validation.reason);
        }

        mission.state = nextState;
        mission.history.push({ state: nextState, timestamp: new Date().toISOString() });
        await this.saveMission(mission);
        return mission;
    }

    async finishImplementation(id, checkUpdates = {}) {
        return await this._transition(id, "IMPLEMENTED", checkUpdates);
    }

    async validate(id, checkUpdates = {}) {
        return await this._transition(id, "VALIDATED", checkUpdates);
    }

    async verify(id, checkUpdates = {}) {
        return await this._transition(id, "VERIFIED_SUCCESS", checkUpdates);
    }

    async deploy(id, checkUpdates = {}) {
        return await this._transition(id, "DEPLOYED", checkUpdates);
    }
}

module.exports = MissionRegistry;
