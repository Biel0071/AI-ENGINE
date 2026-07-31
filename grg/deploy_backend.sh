echo "Deploying Backend..."
cd /root || exit 1
if [ -d "AI-ENGINE" ]; then
  echo "Repo exists, pulling..."
  cd AI-ENGINE/grg
  git fetch
  git checkout feat/fenix-rc20-reality-first-flows
  git pull origin feat/fenix-rc20-reality-first-flows
else
  echo "Cloning repo..."
  git clone https://github.com/Biel0071/AI-ENGINE.git
  cd AI-ENGINE/grg
  git checkout feat/fenix-rc20-reality-first-flows
fi

docker-compose up -d --build backend
echo "Backend deployment complete!"
