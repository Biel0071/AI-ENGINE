cd /opt/fenix-os/grg
echo -e "\033[0;36m➜\033[0m Limpando processos presos na porta 4400..."
fuser -k 4400/tcp || true
docker compose -f docker-compose.enterprise.yml down -v || true
docker rm -f $(docker ps -q -f "publish=4400") 2>/dev/null || true

echo -e "\033[0;36m➜\033[0m Corrigindo CRLF em arquivos chaves..."
sed -i 's/\r$//' ops/burn-test.sh
sed -i 's/\r$//' ops/container-entrypoint.sh
sed -i 's/\r$//' Dockerfile

echo -e "\033[0;36m➜\033[0m Acionando Burn Test (RESUME 3)..."
bash ops/burn-test.sh || exit 1

echo -e "\033[0;36m➜\033[0m Executando Health Checks (Zero Mock)..."
node ../platform/bootstrap/installer.js --health-only

echo -e "\033[0;36m➜\033[0m Registrando FÊNIX Runtime no PM2..."
cd ../platform/bootstrap
npm install --production --silent
pm2 delete fenix-os-daemon >/dev/null 2>&1 || true
pm2 start installer.js --name "fenix-os-daemon" -- --daemon
pm2 save >/dev/null 2>&1 || true

echo -e "\033[0;32m
╔════════════════════════════════════════════════════════╗
║             FÊNIX OS - ONLINE E ANCORADO               ║
╚════════════════════════════════════════════════════════╝
\033[0m"
pm2 status fenix-os-daemon
echo -e "\nO comando fenix up concluiu. O FÊNIX Runtime (V4) assumiu a operação."
