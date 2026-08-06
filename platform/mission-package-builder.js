class MissionPackageBuilder {
    static build(mission) {
        const allowedFilesMap = {
            "0000": ["README.md", "grg/src/app.js"],
            "0005": ["grg/src/kernel/store.js"],
            "0006": ["grg/src/infrastructure/postgres-store.js", "platform/cli/commands/migrate.js"],
            "0007": ["grg/src/infrastructure/redis-queue.js"],
            "0008": ["grg/src/infrastructure/ai-provider.js", "grg/src/gateways/intelligence.js"],
            "0009": ["platform/supervisor.js"],
            "0010": ["platform/http/server.js"],
            "0011": [".github/workflows/main.yml", "platform/ci.js"],
            "0012": ["platform/http/server.js", "platform/public/index.html"],
            "0013": ["platform/supervisor.js", "platform/mission-engine.js"],
            "0014": ["platform/cli/commands/roadmap.js"]
        };

        const checksMap = {
            "0000": ["SmokeTest"],
            "0005": ["DryRun", "Hash", "Rollback", "Doctor"],
            "0006": ["HealthCheck", "StressTest", "Backup"],
            "0007": ["RedisOnline", "WorkerSupervised", "DLQ"],
            "0008": ["ProviderConfigured", "ChatOK", "PlanningOK"],
            "0009": ["EnvSecrets", "NoHardcoded", "Rotation"],
            "0010": ["RedisSession", "PreserveLogin", "MultiInstance"],
            "0011": ["Test", "Build", "Docker"],
            "0012": ["WebSocket", "WorkerStats", "Realtime"],
            "0013": ["SingleCognitiveCore", "PreserveAPI"],
            "0014": ["AllGreen", "Deploy"]
        };

        return {
            schema: "fenix.execution-package.v1",
            mission: {
                id: mission.id,
                title: mission.title,
                state: mission.state
            },
            goal: mission.goal,
            allowedFiles: allowedFilesMap[mission.id] || [],
            checks: checksMap[mission.id] || [],
            constraints: {
                architectureFrozen: true,
                allowNewFiles: false,
                allowNewModules: false,
                allowDirectoryCreation: false
            },
            expectedOutput: {
                type: "patch"
            }
        };
    }
}

module.exports = MissionPackageBuilder;
