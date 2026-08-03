async function doctorCommand(client) {
    console.log("Gerando relatório...");
    try {
        // Envia a requisição REST pro Runtime Vivo
        const response = await client.getManifest();
        const data = response.data;
        
        console.log("══════════════════════════════");
        console.log("   FÊNIX PLATFORM REPORT");
        console.log("══════════════════════════════\n");
        
        console.log(`Kernel\t\t${data.scores.kernel}%`);
        console.log(`Runtime\t\t${data.scores.runtime}%`);
        console.log(`Workers\t\t${data.scores.workers}%`);
        console.log(`Providers\t${data.scores.providers}%`);
        console.log(`Knowledge\t${data.scores.knowledge}%`);
        console.log(`Learning\t${data.scores.learning}%`);
        console.log(`Memory\t\t${data.scores.memory}%`);
        console.log(`Plugins\t\t${data.scores.plugins}%`);
        console.log(`Infrastructure\t${data.scores.infrastructure}%`);
        console.log(`AI Gateway\t${data.scores.aiGateway}%\n`);
        
        console.log(`Projects\t${data.state.projectsLoaded} Loaded`);
        console.log(`Docker\t\t${data.infrastructure.docker}`);
        console.log(`Redis\t\t${data.infrastructure.redis}`);
        console.log(`Qdrant\t\t${data.infrastructure.qdrant}`);
        console.log(`GPU\t\tOK\n`);
        
        console.log(`Overall Score\t${data.scores.overall}%\n`);
        
        if (data.scores.overall >= 90) {
            console.log("\x1b[32mREADY FOR PRODUCTION\x1b[0m"); // Verde
        } else {
            console.log("\x1b[33mNEEDS REPAIR (Run 'fenix repair')\x1b[0m"); // Amarelo
        }
        
        // Dispara o registro silencioso no kernel para gerar Conhecimento de que o doctor foi rodado
        await client.sendMission({ action: 'doctor_execution', result: data.scores.overall }).catch(() => {});

    } catch (e) {
        if (e.message === 'RUNTIME_OFFLINE') {
            console.error("❌ O Runtime está offline. Inicie o sistema com 'fenix start' antes de executar o doctor.");
        } else {
            console.error("❌ Erro ao gerar relatório:", e.message);
        }
    }
}

module.exports = doctorCommand;
