# Deploy conversation routes, fastlane, mascot sidebar, and interactions to VPS
$ErrorActionPreference = "Stop"

$KEY = "C:/Users/Dell/.ssh/grg_fenix_vps"
$HOST_VPS = "root@209.50.241.22"
$LOCAL_BASE = "c:/projetos/ai-engine-core/ai-engine"

Write-Host "=== [1/5] Uploading Frontend Assets (Dual-Webroot Parity) ===" -ForegroundColor Cyan
scp -i $KEY "$LOCAL_BASE/grg/public/index.html" "$HOST_VPS`:/opt/fenix-os/public/index.html"
scp -i $KEY "$LOCAL_BASE/grg/public/index.html" "$HOST_VPS`:/opt/fenix-os/grg/public/index.html"

scp -i $KEY "$LOCAL_BASE/grg/public/fenix-mascot-sidebar.js" "$HOST_VPS`:/opt/fenix-os/public/fenix-mascot-sidebar.js"
scp -i $KEY "$LOCAL_BASE/grg/public/fenix-mascot-sidebar.js" "$HOST_VPS`:/opt/fenix-os/grg/public/fenix-mascot-sidebar.js"

scp -i $KEY "$LOCAL_BASE/grg/public/fenix-mascot-sidebar.css" "$HOST_VPS`:/opt/fenix-os/public/fenix-mascot-sidebar.css"
scp -i $KEY "$LOCAL_BASE/grg/public/fenix-mascot-sidebar.css" "$HOST_VPS`:/opt/fenix-os/grg/public/fenix-mascot-sidebar.css"

scp -i $KEY "$LOCAL_BASE/grg/public/fenix-v11-interactions.js" "$HOST_VPS`:/opt/fenix-os/public/fenix-v11-interactions.js"
scp -i $KEY "$LOCAL_BASE/grg/public/fenix-v11-interactions.js" "$HOST_VPS`:/opt/fenix-os/grg/public/fenix-v11-interactions.js"

Write-Host "=== [2/5] Uploading Backend API and Execution Engines ===" -ForegroundColor Cyan
scp -i $KEY "$LOCAL_BASE/grg/src/api/universal-system-routes.js" "$HOST_VPS`:/opt/fenix-os/grg/src/api/universal-system-routes.js"
scp -i $KEY "$LOCAL_BASE/grg/src/api/conversation-routes.js" "$HOST_VPS`:/opt/fenix-os/grg/src/api/conversation-routes.js"
scp -i $KEY "$LOCAL_BASE/grg/src/api/product-api-routes.js" "$HOST_VPS`:/opt/fenix-os/grg/src/api/product-api-routes.js"
scp -i $KEY "$LOCAL_BASE/grg/src/execution/fast-lane-engine.js" "$HOST_VPS`:/opt/fenix-os/grg/src/execution/fast-lane-engine.js"

Write-Host "=== [3/5] Validating Node Syntax on VPS ===" -ForegroundColor Cyan
ssh -i $KEY $HOST_VPS "node -c /opt/fenix-os/grg/src/api/universal-system-routes.js && node -c /opt/fenix-os/grg/src/api/conversation-routes.js && node -c /opt/fenix-os/grg/src/api/product-api-routes.js && node -c /opt/fenix-os/grg/src/execution/fast-lane-engine.js && node -c /opt/fenix-os/public/fenix-mascot-sidebar.js && node -c /opt/fenix-os/public/fenix-v11-interactions.js"

Write-Host "=== [4/5] Reloading PM2 #16 (backend) and #17 (frontend) ===" -ForegroundColor Cyan
ssh -i $KEY $HOST_VPS "pm2 reload 16 && pm2 reload 17"

Write-Host "=== [5/5] Verifying Health & Parity ===" -ForegroundColor Cyan
ssh -i $KEY $HOST_VPS "curl -fsS http://127.0.0.1:4410/health && echo '' && curl -fsS -o /dev/null -w 'Frontend port 3000 HTTP: %{http_code}\n' http://127.0.0.1:3000/app && diff -qr --exclude='*.bak*' --exclude='*.before-*' /opt/fenix-os/public /opt/fenix-os/grg/public && echo 'DUAL WEBROOT 100% PARITY OK'"

Write-Host "Deploy complete successfully!" -ForegroundColor Green
