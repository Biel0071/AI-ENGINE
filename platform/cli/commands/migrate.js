const path = require('path');
const fs = require('fs');

async function migrateCommand(args) {
    if (args.length === 0) {
        console.error("❌ Uso: fenix migrate <domain> [--dry-run]");
        console.error("Domínios disponíveis: storage");
        process.exit(1);
    }

    const domain = args[0];
    const dryRun = args.includes('--dry-run');

    const migratorPath = path.join(__dirname, 'migrators', `${domain}.js`);
    
    if (!fs.existsSync(migratorPath)) {
        console.error(`❌ Migrador não encontrado para o domínio: ${domain}`);
        process.exit(1);
    }

    try {
        const migrator = require(migratorPath);
        if (typeof migrator.run !== 'function') {
            console.error(`❌ O migrador '${domain}' não exporta a função 'run'.`);
            process.exit(1);
        }
        await migrator.run(dryRun);
    } catch (e) {
        console.error(`❌ Erro fatal durante a migração do domínio '${domain}':`, e.message);
        process.exit(1);
    }
}

module.exports = migrateCommand;
