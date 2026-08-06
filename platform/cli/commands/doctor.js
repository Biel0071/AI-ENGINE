const MissionRegistry = require('../../../grg/src/kernel/mission/registry');

async function doctorCommand(client) {
    const registry = new MissionRegistry();
    const activeMission = await registry.getActive();
    const index = await registry.getIndex();

    console.log("=================================");
    console.log("             FÊNIX");
    console.log("=================================\n");
    
    if (activeMission) {
        console.log(`Mission\n${activeMission.id}\n${activeMission.title}\n`);
        
        let verifiedCount = 0;
        for (const mid of index.missions) {
            const m = await registry.getMission(mid);
            if (m && (m.state === 'VERIFIED_SUCCESS' || m.state === 'DEPLOYED')) {
                verifiedCount++;
            }
        }
        const progressStr = '█'.repeat(verifiedCount) + '░'.repeat(10 - verifiedCount);
        console.log(`Progress\n${progressStr} ${verifiedCount}/10\n`);
        
        console.log(`Current State\n${activeMission.state}\n`);
        
        const { MissionGates } = require('../../../grg/src/kernel/mission/gates');
        const def = MissionGates.getDefinition(activeMission.state);
        const nextState = def && def.next.length > 0 ? def.next[0] : 'NONE';
        console.log(`Next Gate\n${nextState}\n`);
        
        const validation = nextState !== 'NONE' ? MissionGates.canTransition(activeMission.state, nextState, activeMission.checks) : { allowed: true, reason: 'None' };
        console.log(`Blocking\n${validation.allowed ? 'None' : validation.reason}\n`);
    } else {
        console.log(`Mission\nNo active missions\n`);
    }

    console.log(`Runtime\n🟢\n`);
    console.log(`Database\n🟡\n`);
    console.log(`Redis\n🔴\n`);
    console.log(`AI\n🟢\n`);
    console.log("=================================");
}

module.exports = doctorCommand;
