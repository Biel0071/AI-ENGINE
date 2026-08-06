const path = require('path');
const fs = require('fs');

async function rollbackCommand(args) {
    if (args.length === 0) {
        console.error("❌ Uso: fenix rollback <domain>");
        console.error("Domínios disponíveis: storage");
        process.exit(1);
    }

    const domain = args[0];
    const migratorPath = path.join(__dirname, 'migrators', `${domain}.js`);
    
    if (!fs.existsSync(migratorPath)) {
        console.error(`❌ Migrador não encontrado para o domínio: ${domain}`);
        process.exit(1);
    }

    try {
        const migrator = require(migratorPath);
        if (typeof migrator.rollback !== 'function') {
            console.error(`❌ O migrador '${domain}' não suporta rollback.`);
            process.exit(1);
        }
        await migrator.rollback();
    } catch (e) {
        console.error(`❌ Erro fatal durante o rollback do domínio '${domain}':`, e.message);
        process.exit(1);
    }
}

module.exports = rollbackCommand;
