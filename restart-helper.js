
const { spawn, exec } = require('child_process');
const fs = require('fs');

setTimeout(() => {
  console.log('Killing process 21300...');
  exec('taskkill /F /PID 21300', (err, stdout, stderr) => {
    console.log('Kill output:', { err, stdout, stderr });
    
    // Wait 3 seconds for port to clear
    setTimeout(() => {
      console.log('Starting new server...');
      const env = {
        ...process.env,
        FENIX_ALLOW_DEV_HEADERS: "1",
        FENIX_ENV: "development",
        PORT: "4400",
        FENIX_AI_DEFAULT_PROVIDER: "ollama",
        FENIX_AI_DEFAULT_MODEL: "qwen2.5:3b",
        FENIX_ENABLE_OLLAMA: "1",
        FENIX_BOOTSTRAP_ADMIN_USER: "grg-admin",
        FENIX_BOOTSTRAP_ADMIN_PASSWORD: "admin123",
        FENIX_PUBLIC_URL: "http://localhost:4400"
      };

      try {
        const out = fs.openSync('server-stdout.log', 'a');
        const errLog = fs.openSync('server-stderr.log', 'a');

        const child = spawn('node', ['src/server.js'], {
          cwd: 'C:\\projetos\\ai-engine-core\\ai-engine\\grg',
          env,
          detached: true,
          stdio: ['ignore', out, errLog]
        });

        child.unref();
        console.log('New server spawned successfully');
      } catch (e) {
        console.error('Failed to spawn new server:', e);
      }
      process.exit(0);
    }, 3000);
  });
}, 1000);
