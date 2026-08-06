const MissionRegistry = require('../../../grg/src/kernel/mission/registry');

async function roadmapCommand(client) {
    const registry = new MissionRegistry();
    const index = await registry.getIndex();

    console.log("\n==================================================");
    console.log("               MISSIONS ROADMAP");
    console.log("==================================================\n");

    const missionsToDisplay = [
        "0005", "0006", "0007", "0008", 
        "0009", "0010", "0011", "0012", 
        "0013", "0014"
    ];

    let verifiedCount = 0;

    for (const mid of missionsToDisplay) {
        if (index.missions.includes(mid)) {
            const m = await registry.getMission(mid);
            if (m) {
                console.log(`${mid}  ${m.title.padEnd(25)}  ${m.state}`);
                if (m.state === 'VERIFIED_SUCCESS' || m.state === 'DEPLOYED') {
                    verifiedCount++;
                }
            }
        }
    }

    console.log(`\n==================================================`);
    console.log(`Architecture Freeze:  ACTIVE`);
    console.log(`Mission Count:        ${verifiedCount} / 10`);
    console.log(`==================================================\n`);
}

module.exports = roadmapCommand;
