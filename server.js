/**
 * FÊNIX Agent OS — Single Entry Point
 * 
 * Executa o servidor HTTP único na porta 2150.
 * Uso: npm run dev / npm start
 */

const path = require('path');
const { startServer } = require('./platform/http/server');

const PORT = process.env.PORT || 2150;

async function bootstrap() {
  try {
    const server = await startServer(PORT);
    console.log(`
==================================================
           FÊNIX AGENT OS ONLINE
==================================================
Status:        🟢 ONLINE
Dashboard UI:  http://localhost:${PORT}
API System:    http://localhost:${PORT}/api/system
API Dashboard: http://localhost:${PORT}/api/dashboard
==================================================
`);

    process.on('SIGINT', () => {
      console.log('\n[FÊNIX] Encerrando servidor graciosamente...');
      server.close(() => process.exit(0));
    });
  } catch (error) {
    console.error('❌ [FÊNIX] Erro fatal ao iniciar o servidor:', error.message);
    process.exit(1);
  }
}

bootstrap();
