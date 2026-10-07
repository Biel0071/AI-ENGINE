@echo off
rem =========================================================================
rem FENIX OS CANONICAL DEPLOY SCRIPT
rem Source of Truth: c:/projetos/ai-engine-core/ai-engine/grg/public/
rem Target VPS: root@209.50.241.22 (/opt/fenix-os/public/ and /opt/fenix-os/grg/public/)
rem =========================================================================

set KEY=C:/Users/Dell/.ssh/grg_fenix_vps
set SRC=c:/projetos/ai-engine-core/ai-engine/grg/public
set HOST=root@209.50.241.22
if /I "%~1"=="city" goto CITY_DEPLOY
if /I "%~1"=="world3d" goto WORLD3D_DEPLOY
if /I "%~1"=="world-hotfix" goto WORLD_HOTFIX
if /I "%~1"=="ide" goto IDE_DEPLOY
if /I "%~1"=="projects" goto PROJECTS_DEPLOY
if /I "%~1"=="workspace" goto WORKSPACE_DEPLOY
if /I "%~1"=="project-git" goto PROJECT_GIT_DEPLOY
if /I "%~1"=="api-secret" goto API_SECRET_DEPLOY
if /I "%~1"=="unreal" goto UNREAL_DEPLOY
if /I "%~1"=="intent" goto INTENT_DEPLOY
if /I "%~1"=="reality" goto REALITY_DEPLOY

echo [1/8] Deploying HTML shells...
scp -i %KEY% %SRC%/index.html %HOST%:/opt/fenix-os/public/index.html
scp -i %KEY% %SRC%/index.html %HOST%:/opt/fenix-os/grg/public/index.html
scp -i %KEY% %SRC%/login.html %HOST%:/opt/fenix-os/public/login.html
scp -i %KEY% %SRC%/login.html %HOST%:/opt/fenix-os/grg/public/login.html
scp -i %KEY% %SRC%/preview.html %HOST%:/opt/fenix-os/public/preview.html
scp -i %KEY% %SRC%/preview.html %HOST%:/opt/fenix-os/grg/public/preview.html

echo [2/8] Deploying core app and controllers...
scp -i %KEY% %SRC%/unified-app.js %HOST%:/opt/fenix-os/public/unified-app.js
scp -i %KEY% %SRC%/unified-app.js %HOST%:/opt/fenix-os/grg/public/unified-app.js
scp -i %KEY% %SRC%/fenix-request-guard.js %HOST%:/opt/fenix-os/public/fenix-request-guard.js
scp -i %KEY% %SRC%/fenix-request-guard.js %HOST%:/opt/fenix-os/grg/public/fenix-request-guard.js
scp -i %KEY% %SRC%/global-selection-store.js %HOST%:/opt/fenix-os/public/global-selection-store.js
scp -i %KEY% %SRC%/global-selection-store.js %HOST%:/opt/fenix-os/grg/public/global-selection-store.js
scp -i %KEY% %SRC%/command-center.js %HOST%:/opt/fenix-os/public/command-center.js
scp -i %KEY% %SRC%/command-center.js %HOST%:/opt/fenix-os/grg/public/command-center.js
scp -i %KEY% %SRC%/fenix-operational-os.js %HOST%:/opt/fenix-os/public/fenix-operational-os.js
scp -i %KEY% %SRC%/fenix-operational-os.js %HOST%:/opt/fenix-os/grg/public/fenix-operational-os.js
scp -i %KEY% %SRC%/fenix-core-controller.js %HOST%:/opt/fenix-os/public/fenix-core-controller.js
scp -i %KEY% %SRC%/fenix-core-controller.js %HOST%:/opt/fenix-os/grg/public/fenix-core-controller.js
scp -i %KEY% %SRC%/live-runtime.js %HOST%:/opt/fenix-os/public/live-runtime.js
scp -i %KEY% %SRC%/live-runtime.js %HOST%:/opt/fenix-os/grg/public/live-runtime.js
scp -i %KEY% %SRC%/fenix-bootstrap.js %HOST%:/opt/fenix-os/public/fenix-bootstrap.js
scp -i %KEY% %SRC%/fenix-bootstrap.js %HOST%:/opt/fenix-os/grg/public/fenix-bootstrap.js
scp -i %KEY% %SRC%/runtime-cockpit.js %HOST%:/opt/fenix-os/public/runtime-cockpit.js
scp -i %KEY% %SRC%/runtime-cockpit.js %HOST%:/opt/fenix-os/grg/public/runtime-cockpit.js
scp -i %KEY% %SRC%/cockpit-app.js %HOST%:/opt/fenix-os/public/cockpit-app.js
scp -i %KEY% %SRC%/cockpit-app.js %HOST%:/opt/fenix-os/grg/public/cockpit-app.js
scp -i %KEY% %SRC%/jobs-app.js %HOST%:/opt/fenix-os/public/jobs-app.js
scp -i %KEY% %SRC%/jobs-app.js %HOST%:/opt/fenix-os/grg/public/jobs-app.js
scp -i %KEY% %SRC%/task-creator.js %HOST%:/opt/fenix-os/public/task-creator.js
scp -i %KEY% %SRC%/task-creator.js %HOST%:/opt/fenix-os/grg/public/task-creator.js
scp -i %KEY% %SRC%/connections-panel.js %HOST%:/opt/fenix-os/public/connections-panel.js
scp -i %KEY% %SRC%/connections-panel.js %HOST%:/opt/fenix-os/grg/public/connections-panel.js

echo [3/8] Deploying AI City ^& Pixel Engine (Pixi 8 Pipeline)...
scp -i %KEY% %SRC%/iso-city.js %HOST%:/opt/fenix-os/public/iso-city.js
scp -i %KEY% %SRC%/iso-city.js %HOST%:/opt/fenix-os/grg/public/iso-city.js
scp -i %KEY% %SRC%/office-live.js %HOST%:/opt/fenix-os/public/office-live.js
scp -i %KEY% %SRC%/office-live.js %HOST%:/opt/fenix-os/grg/public/office-live.js
scp -i %KEY% %SRC%/fenix-city-event-adapter.js %HOST%:/opt/fenix-os/public/fenix-city-event-adapter.js
scp -i %KEY% %SRC%/fenix-city-event-adapter.js %HOST%:/opt/fenix-os/grg/public/fenix-city-event-adapter.js
scp -i %KEY% %SRC%/fenix-pixel-engine.js %HOST%:/opt/fenix-os/public/fenix-pixel-engine.js
scp -i %KEY% %SRC%/fenix-pixel-engine.js %HOST%:/opt/fenix-os/grg/public/fenix-pixel-engine.js
scp -i %KEY% %SRC%/city-integration.js %HOST%:/opt/fenix-os/public/city-integration.js
scp -i %KEY% %SRC%/city-integration.js %HOST%:/opt/fenix-os/grg/public/city-integration.js
scp -i %KEY% %SRC%/pixi-game-art-pipeline.js %HOST%:/opt/fenix-os/public/pixi-game-art-pipeline.js
scp -i %KEY% %SRC%/pixi-game-art-pipeline.js %HOST%:/opt/fenix-os/grg/public/pixi-game-art-pipeline.js
scp -i %KEY% %SRC%/pixi-city-renderer.js %HOST%:/opt/fenix-os/public/pixi-city-renderer.js
scp -i %KEY% %SRC%/pixi-city-renderer.js %HOST%:/opt/fenix-os/grg/public/pixi-city-renderer.js
scp -i %KEY% %SRC%/pixi-character-system.js %HOST%:/opt/fenix-os/public/pixi-character-system.js
scp -i %KEY% %SRC%/pixi-character-system.js %HOST%:/opt/fenix-os/grg/public/pixi-character-system.js
scp -i %KEY% %SRC%/pixi-interaction-engine.js %HOST%:/opt/fenix-os/public/pixi-interaction-engine.js
scp -i %KEY% %SRC%/pixi-interaction-engine.js %HOST%:/opt/fenix-os/grg/public/pixi-interaction-engine.js
scp -i %KEY% %SRC%/pixi-semantic-zoom.js %HOST%:/opt/fenix-os/public/pixi-semantic-zoom.js
scp -i %KEY% %SRC%/pixi-semantic-zoom.js %HOST%:/opt/fenix-os/grg/public/pixi-semantic-zoom.js
scp -i %KEY% %SRC%/pixi-building-interior.js %HOST%:/opt/fenix-os/public/pixi-building-interior.js
scp -i %KEY% %SRC%/pixi-building-interior.js %HOST%:/opt/fenix-os/grg/public/pixi-building-interior.js
scp -i %KEY% %SRC%/city-reality-engine.js %HOST%:/opt/fenix-os/public/city-reality-engine.js
scp -i %KEY% %SRC%/city-reality-engine.js %HOST%:/opt/fenix-os/grg/public/city-reality-engine.js

echo [4/8] Deploying IDE, Flow Graph ^& Specialized Modules...
scp -i %KEY% %SRC%/fenix-flow-graph.js %HOST%:/opt/fenix-os/public/fenix-flow-graph.js
scp -i %KEY% %SRC%/fenix-flow-graph.js %HOST%:/opt/fenix-os/grg/public/fenix-flow-graph.js
scp -i %KEY% %SRC%/fenix-visual-ide.js %HOST%:/opt/fenix-os/public/fenix-visual-ide.js
scp -i %KEY% %SRC%/fenix-visual-ide.js %HOST%:/opt/fenix-os/grg/public/fenix-visual-ide.js
scp -i %KEY% %SRC%/fenix-v11-interactions.js %HOST%:/opt/fenix-os/public/fenix-v11-interactions.js
scp -i %KEY% %SRC%/fenix-v11-interactions.js %HOST%:/opt/fenix-os/grg/public/fenix-v11-interactions.js
scp -i %KEY% %SRC%/fenix-mascot-sidebar.js %HOST%:/opt/fenix-os/public/fenix-mascot-sidebar.js
scp -i %KEY% %SRC%/fenix-mascot-sidebar.js %HOST%:/opt/fenix-os/grg/public/fenix-mascot-sidebar.js
scp -i %KEY% %SRC%/observatory-client.js %HOST%:/opt/fenix-os/public/observatory-client.js
scp -i %KEY% %SRC%/observatory-client.js %HOST%:/opt/fenix-os/grg/public/observatory-client.js
scp -i %KEY% %SRC%/project-hub-controller.js %HOST%:/opt/fenix-os/public/project-hub-controller.js
scp -i %KEY% %SRC%/project-hub-controller.js %HOST%:/opt/fenix-os/grg/public/project-hub-controller.js
scp -i %KEY% %SRC%/dev-pipeline-client.js %HOST%:/opt/fenix-os/public/dev-pipeline-client.js
scp -i %KEY% %SRC%/dev-pipeline-client.js %HOST%:/opt/fenix-os/grg/public/dev-pipeline-client.js
scp -i %KEY% %SRC%/fenix-v8-ui.js %HOST%:/opt/fenix-os/public/fenix-v8-ui.js
scp -i %KEY% %SRC%/fenix-v8-ui.js %HOST%:/opt/fenix-os/grg/public/fenix-v8-ui.js
scp -i %KEY% %SRC%/fenix-command-palette.js %HOST%:/opt/fenix-os/public/fenix-command-palette.js
scp -i %KEY% %SRC%/fenix-command-palette.js %HOST%:/opt/fenix-os/grg/public/fenix-command-palette.js
scp -i %KEY% %SRC%/fenix-command-bridge.js %HOST%:/opt/fenix-os/public/fenix-command-bridge.js
scp -i %KEY% %SRC%/fenix-command-bridge.js %HOST%:/opt/fenix-os/grg/public/fenix-command-bridge.js
scp -i %KEY% %SRC%/fenix-evolve.js %HOST%:/opt/fenix-os/public/fenix-evolve.js
scp -i %KEY% %SRC%/fenix-evolve.js %HOST%:/opt/fenix-os/grg/public/fenix-evolve.js
scp -i %KEY% %SRC%/ide-enhancer.js %HOST%:/opt/fenix-os/public/ide-enhancer.js
scp -i %KEY% %SRC%/ide-enhancer.js %HOST%:/opt/fenix-os/grg/public/ide-enhancer.js
scp -i %KEY% %SRC%/system-analysis.js %HOST%:/opt/fenix-os/public/system-analysis.js
scp -i %KEY% %SRC%/system-analysis.js %HOST%:/opt/fenix-os/grg/public/system-analysis.js
scp -i %KEY% %SRC%/visual-inspector.js %HOST%:/opt/fenix-os/public/visual-inspector.js
scp -i %KEY% %SRC%/visual-inspector.js %HOST%:/opt/fenix-os/grg/public/visual-inspector.js
scp -i %KEY% %SRC%/marketplace-live.js %HOST%:/opt/fenix-os/public/marketplace-live.js
scp -i %KEY% %SRC%/marketplace-live.js %HOST%:/opt/fenix-os/grg/public/marketplace-live.js
scp -i %KEY% %SRC%/marketplace-live.css %HOST%:/opt/fenix-os/public/marketplace-live.css
scp -i %KEY% %SRC%/marketplace-live.css %HOST%:/opt/fenix-os/grg/public/marketplace-live.css
scp -i %KEY% %SRC%/project-hub-live.js %HOST%:/opt/fenix-os/public/project-hub-live.js
scp -i %KEY% %SRC%/project-hub-live.js %HOST%:/opt/fenix-os/grg/public/project-hub-live.js
scp -i %KEY% %SRC%/project-hub-live.css %HOST%:/opt/fenix-os/public/project-hub-live.css
scp -i %KEY% %SRC%/project-hub-live.css %HOST%:/opt/fenix-os/grg/public/project-hub-live.css
scp -i %KEY% %SRC%/project-ide-live.js %HOST%:/opt/fenix-os/public/project-ide-live.js
scp -i %KEY% %SRC%/project-ide-live.js %HOST%:/opt/fenix-os/grg/public/project-ide-live.js
scp -i %KEY% %SRC%/project-ide-live.css %HOST%:/opt/fenix-os/public/project-ide-live.css
scp -i %KEY% %SRC%/project-ide-live.css %HOST%:/opt/fenix-os/grg/public/project-ide-live.css
scp -i %KEY% %SRC%/unreal-world-live.js %HOST%:/opt/fenix-os/public/unreal-world-live.js
scp -i %KEY% %SRC%/unreal-world-live.js %HOST%:/opt/fenix-os/grg/public/unreal-world-live.js
scp -i %KEY% %SRC%/fenix-world-3d.js %HOST%:/opt/fenix-os/public/fenix-world-3d.js
scp -i %KEY% %SRC%/fenix-world-3d.js %HOST%:/opt/fenix-os/grg/public/fenix-world-3d.js
scp -i %KEY% %SRC%/fenix-world-3d.css %HOST%:/opt/fenix-os/public/fenix-world-3d.css
scp -i %KEY% %SRC%/fenix-world-3d.css %HOST%:/opt/fenix-os/grg/public/fenix-world-3d.css
scp -i %KEY% %SRC%/fenix-world-ui.js %HOST%:/opt/fenix-os/public/fenix-world-ui.js
scp -i %KEY% %SRC%/fenix-world-ui.js %HOST%:/opt/fenix-os/grg/public/fenix-world-ui.js

echo [5/8] Deploying Design System ^& Complete Stylesheets...
scp -i %KEY% %SRC%/unified.css %HOST%:/opt/fenix-os/public/unified.css
scp -i %KEY% %SRC%/unified.css %HOST%:/opt/fenix-os/grg/public/unified.css
scp -i %KEY% %SRC%/command-center.css %HOST%:/opt/fenix-os/public/command-center.css
scp -i %KEY% %SRC%/command-center.css %HOST%:/opt/fenix-os/grg/public/command-center.css
scp -i %KEY% %SRC%/fenix-premium-layout.css %HOST%:/opt/fenix-os/public/fenix-premium-layout.css
scp -i %KEY% %SRC%/fenix-premium-layout.css %HOST%:/opt/fenix-os/grg/public/fenix-premium-layout.css
scp -i %KEY% %SRC%/fenix-v11-phase6.css %HOST%:/opt/fenix-os/public/fenix-v11-phase6.css
scp -i %KEY% %SRC%/fenix-v11-phase6.css %HOST%:/opt/fenix-os/grg/public/fenix-v11-phase6.css
scp -i %KEY% %SRC%/fenix-flow-graph.css %HOST%:/opt/fenix-os/public/fenix-flow-graph.css
scp -i %KEY% %SRC%/fenix-flow-graph.css %HOST%:/opt/fenix-os/grg/public/fenix-flow-graph.css
scp -i %KEY% %SRC%/fenix-design-system.css %HOST%:/opt/fenix-os/public/fenix-design-system.css
scp -i %KEY% %SRC%/fenix-design-system.css %HOST%:/opt/fenix-os/grg/public/fenix-design-system.css
scp -i %KEY% %SRC%/fenix-ide-v2.css %HOST%:/opt/fenix-os/public/fenix-ide-v2.css
scp -i %KEY% %SRC%/fenix-ide-v2.css %HOST%:/opt/fenix-os/grg/public/fenix-ide-v2.css
scp -i %KEY% %SRC%/city-overrides.css %HOST%:/opt/fenix-os/public/city-overrides.css
scp -i %KEY% %SRC%/city-overrides.css %HOST%:/opt/fenix-os/grg/public/city-overrides.css
scp -i %KEY% %SRC%/living-panels.css %HOST%:/opt/fenix-os/public/living-panels.css
scp -i %KEY% %SRC%/living-panels.css %HOST%:/opt/fenix-os/grg/public/living-panels.css
scp -i %KEY% %SRC%/fenix-v11-evolution.css %HOST%:/opt/fenix-os/public/fenix-v11-evolution.css
scp -i %KEY% %SRC%/fenix-v11-evolution.css %HOST%:/opt/fenix-os/grg/public/fenix-v11-evolution.css
scp -i %KEY% %SRC%/fenix-v10.css %HOST%:/opt/fenix-os/public/fenix-v10.css
scp -i %KEY% %SRC%/fenix-v10.css %HOST%:/opt/fenix-os/grg/public/fenix-v10.css
scp -i %KEY% %SRC%/fenix-v15.css %HOST%:/opt/fenix-os/public/fenix-v15.css
scp -i %KEY% %SRC%/fenix-v15.css %HOST%:/opt/fenix-os/grg/public/fenix-v15.css
scp -i %KEY% %SRC%/unreal-world.css %HOST%:/opt/fenix-os/public/unreal-world.css
scp -i %KEY% %SRC%/unreal-world.css %HOST%:/opt/fenix-os/grg/public/unreal-world.css
scp -i %KEY% %SRC%/fenix-window-overrides.css %HOST%:/opt/fenix-os/public/fenix-window-overrides.css
scp -i %KEY% %SRC%/fenix-window-overrides.css %HOST%:/opt/fenix-os/grg/public/fenix-window-overrides.css
scp -i %KEY% %SRC%/design-system.css %HOST%:/opt/fenix-os/public/design-system.css
scp -i %KEY% %SRC%/design-system.css %HOST%:/opt/fenix-os/grg/public/design-system.css
scp -i %KEY% %SRC%/fenix.css %HOST%:/opt/fenix-os/public/fenix.css
scp -i %KEY% %SRC%/fenix.css %HOST%:/opt/fenix-os/grg/public/fenix.css
scp -i %KEY% %SRC%/office.css %HOST%:/opt/fenix-os/public/office.css
scp -i %KEY% %SRC%/office.css %HOST%:/opt/fenix-os/grg/public/office.css
scp -i %KEY% %SRC%/system-analysis.css %HOST%:/opt/fenix-os/public/system-analysis.css
scp -i %KEY% %SRC%/system-analysis.css %HOST%:/opt/fenix-os/grg/public/system-analysis.css
scp -i %KEY% %SRC%/layout-patch.css %HOST%:/opt/fenix-os/public/layout-patch.css
scp -i %KEY% %SRC%/layout-patch.css %HOST%:/opt/fenix-os/grg/public/layout-patch.css
scp -i %KEY% %SRC%/level30.css %HOST%:/opt/fenix-os/public/level30.css
scp -i %KEY% %SRC%/level30.css %HOST%:/opt/fenix-os/grg/public/level30.css
scp -i %KEY% %SRC%/fenix-mascot-sidebar.css %HOST%:/opt/fenix-os/public/fenix-mascot-sidebar.css
scp -i %KEY% %SRC%/fenix-mascot-sidebar.css %HOST%:/opt/fenix-os/grg/public/fenix-mascot-sidebar.css
scp -i %KEY% %SRC%/city-reality.css %HOST%:/opt/fenix-os/public/city-reality.css
scp -i %KEY% %SRC%/city-reality.css %HOST%:/opt/fenix-os/grg/public/city-reality.css

echo [6/8] Deploying static assets and icons...
scp -r -i %KEY% %SRC%/assets/ %HOST%:/opt/fenix-os/public/
scp -r -i %KEY% %SRC%/assets/ %HOST%:/opt/fenix-os/grg/public/
scp -i %KEY% %SRC%/favicon.ico %HOST%:/opt/fenix-os/public/favicon.ico
scp -i %KEY% %SRC%/favicon.ico %HOST%:/opt/fenix-os/grg/public/favicon.ico

echo [7/8] Deploying runtime configs and reloading services (fenix-backend + fenix-frontend)...
scp -i %KEY% c:/projetos/ai-engine-core/ai-engine/grg/ecosystem.config.js %HOST%:/opt/fenix-os/grg/ecosystem.config.js
scp -i %KEY% c:/projetos/ai-engine-core/ai-engine/grg/ecosystem.config.js %HOST%:/opt/fenix-os/ecosystem.config.js
ssh -i %KEY% %HOST% "pm2 reload fenix-backend && pm2 reload fenix-frontend"

echo [8/8] Verifying backend and frontend health on VPS...
ssh -i %KEY% %HOST% "curl -fsS http://127.0.0.1:4410/health && echo '' && curl -s -o /dev/null -w '%%{http_code}' http://127.0.0.1:3000/app"

echo =========================================================================
echo Deploy complete from canonical source: %SRC%
echo =========================================================================
exit /b 0

:CITY_DEPLOY
echo Deploying canonical City frontend to both webroots...
ssh -i %KEY% %HOST% "mkdir -p /opt/fenix-os/public/vendor /opt/fenix-os/grg/public/vendor"
if errorlevel 1 exit /b 1
for %%F in (index.html city-integration.js fenix-city-event-adapter.js fenix-v11-interactions.js fenix-v11-phase6.css fenix-operational-os.js iso-city.js office-live.js live-runtime.js unified-app.js city-brief.js city-brief.css premium-world-live.js premium-world.css fenix-world-3d.js fenix-world-3d.css fenix-world-ui.js) do (
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/public/%%F
  if errorlevel 1 exit /b 1
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/grg/public/%%F
  if errorlevel 1 exit /b 1
)
scp -i %KEY% %SRC%/vendor/three.min.js %HOST%:/opt/fenix-os/public/vendor/three.min.js
if errorlevel 1 exit /b 1
scp -i %KEY% %SRC%/vendor/three.min.js %HOST%:/opt/fenix-os/grg/public/vendor/three.min.js
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "mkdir -p /opt/fenix-os/grg/src/world-model"
scp -i %KEY% grg/src/world-model/* %HOST%:/opt/fenix-os/grg/src/world-model/
scp -i %KEY% grg/src/server.js %HOST%:/opt/fenix-os/grg/src/server.js
ssh -i %KEY% %HOST% "cp -p /opt/fenix-os/grg/src/api/living-city-routes.js /opt/fenix-os/grg/src/api/living-city-routes.js.before-premium-world"
if errorlevel 1 exit /b 1
scp -i %KEY% grg/src/api/living-city-routes.js %HOST%:/opt/fenix-os/grg/src/api/living-city-routes.js
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "node --check /opt/fenix-os/grg/src/api/living-city-routes.js && node --check /opt/fenix-os/grg/src/server.js && pm2 reload fenix-backend && pm2 reload fenix-frontend"
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "(for i in $(seq 1 90); do curl -fsS -o /dev/null http://127.0.0.1:4410/health && curl -fsS -o /dev/null http://127.0.0.1:3000/app && break; sleep 1; done) && curl -fsS -o /dev/null http://127.0.0.1:4410/health && curl -fsS -o /dev/null http://127.0.0.1:3000/app && diff -qr --exclude='*.bak*' --exclude='*.before-*' /opt/fenix-os/public /opt/fenix-os/grg/public"
exit /b %ERRORLEVEL%

:WORLD_HOTFIX
ssh -i %KEY% %HOST% "mkdir -p /opt/fenix-os/public/vendor /opt/fenix-os/grg/public/vendor"
if errorlevel 1 exit /b 1
for %%F in (index.html premium-world-live.js premium-world.css iso-city.js fenix-operational-os.js fenix-world-3d.js fenix-world-3d.css fenix-world-ui.js) do (
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/public/%%F
  if errorlevel 1 exit /b 1
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/grg/public/%%F
  if errorlevel 1 exit /b 1
)
scp -i %KEY% %SRC%/vendor/three.min.js %HOST%:/opt/fenix-os/public/vendor/three.min.js
if errorlevel 1 exit /b 1
scp -i %KEY% %SRC%/vendor/three.min.js %HOST%:/opt/fenix-os/grg/public/vendor/three.min.js
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "curl -fsS -o /dev/null http://127.0.0.1:3000/premium-world-live.js && cmp /opt/fenix-os/public/premium-world-live.js /opt/fenix-os/grg/public/premium-world-live.js"
exit /b %ERRORLEVEL%

:WORLD3D_DEPLOY
echo Deploying 3D City renderer to both webroots...
ssh -i %KEY% %HOST% "mkdir -p /opt/fenix-os/public/vendor /opt/fenix-os/grg/public/vendor"
if errorlevel 1 exit /b 1
for %%F in (index.html fenix-world-3d.js fenix-world-3d.css fenix-world-ui.js fenix-city-workflow.js) do (
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/public/%%F
  if errorlevel 1 exit /b 1
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/grg/public/%%F
  if errorlevel 1 exit /b 1
)
scp -i %KEY% %SRC%/vendor/three.min.js %HOST%:/opt/fenix-os/public/vendor/three.min.js
if errorlevel 1 exit /b 1
scp -i %KEY% %SRC%/vendor/three.min.js %HOST%:/opt/fenix-os/grg/public/vendor/three.min.js
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "curl -fsS -o /dev/null http://127.0.0.1:3000/fenix-world-3d.js && curl -fsS -o /dev/null http://127.0.0.1:3000/vendor/three.min.js && cmp /opt/fenix-os/public/index.html /opt/fenix-os/grg/public/index.html"
exit /b %ERRORLEVEL%

:PROJECT_GIT_DEPLOY
echo Deploying Project Kernel Git routes and UI...
ssh -i %KEY% %HOST% "cp -p /opt/fenix-os/grg/src/server.js /opt/fenix-os/grg/src/server.js.before-project-git-20260924"
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "cp -p /opt/fenix-os/grg/src/storage/file-system-service.js /opt/fenix-os/grg/src/storage/file-system-service.js.before-clone-guard-20260924"
if errorlevel 1 exit /b 1
scp -i %KEY% grg/src/api/project-git-routes.js %HOST%:/opt/fenix-os/grg/src/api/project-git-routes.js
if errorlevel 1 exit /b 1
scp -i %KEY% grg/src/projects/project-deploy.js %HOST%:/opt/fenix-os/grg/src/projects/project-deploy.js
if errorlevel 1 exit /b 1
scp -i %KEY% grg/deploy-project-git-patch.js %HOST%:/tmp/fenix-project-git-patch.js
if errorlevel 1 exit /b 1
scp -i %KEY% grg/patch-clone-credentials.js %HOST%:/tmp/fenix-clone-credentials-patch.js
if errorlevel 1 exit /b 1
for %%F in (project-hub-live.js project-hub-live.css) do (
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/public/%%F
  if errorlevel 1 exit /b 1
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/grg/public/%%F
  if errorlevel 1 exit /b 1
)
ssh -i %KEY% %HOST% "node /tmp/fenix-project-git-patch.js /opt/fenix-os/grg/src/server.js && node /tmp/fenix-clone-credentials-patch.js /opt/fenix-os/grg/src/storage/file-system-service.js && node --check /opt/fenix-os/grg/src/server.js && node --check /opt/fenix-os/grg/src/api/project-git-routes.js && node --check /opt/fenix-os/grg/src/projects/project-deploy.js && pm2 reload 16 && pm2 reload 17 && (for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:4410/health && curl -fsS -o /dev/null http://127.0.0.1:3000/GRG-login && break; sleep 1; done) && curl -fsS -o /dev/null http://127.0.0.1:4410/health && curl -fsS -o /dev/null http://127.0.0.1:3000/GRG-login && diff -qr --exclude='*.bak*' /opt/fenix-os/public /opt/fenix-os/grg/public"
exit /b %ERRORLEVEL%

:API_SECRET_DEPLOY
echo Deploying API Platform secret resolver fix...
ssh -i %KEY% %HOST% "cp -p /opt/fenix-os/grg/src/api/universal-system-routes.js /opt/fenix-os/grg/src/api/universal-system-routes.js.before-secret-fix-20260924"
if errorlevel 1 exit /b 1
scp -i %KEY% grg/src/api/universal-system-routes.js %HOST%:/opt/fenix-os/grg/src/api/universal-system-routes.js
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "node --check /opt/fenix-os/grg/src/api/universal-system-routes.js && pm2 reload 16 && (for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:4410/health && break; sleep 1; done) && curl -fsS -o /dev/null http://127.0.0.1:4410/health"
exit /b %ERRORLEVEL%

:PROJECT_DEPLOY_MODULE
echo Deploying Project Kernel deployment verifier...
scp -i %KEY% grg/src/projects/project-deploy.js %HOST%:/opt/fenix-os/grg/src/projects/project-deploy.js
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "node --check /opt/fenix-os/grg/src/projects/project-deploy.js && pm2 reload 16 && (for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:4410/health && break; sleep 1; done) && curl -fsS -o /dev/null http://127.0.0.1:4410/health"
exit /b %ERRORLEVEL%

:IDE_DEPLOY
echo Deploying canonical Project Kernel IDE to both webroots...
for %%F in (index.html project-ide-live.js project-ide-live.css) do (
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/public/%%F
  if errorlevel 1 exit /b 1
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/grg/public/%%F
  if errorlevel 1 exit /b 1
)
ssh -i %KEY% %HOST% "pm2 reload 17"
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "curl -fsS -o /dev/null http://127.0.0.1:3000/ && diff -qr --exclude='*.bak*' /opt/fenix-os/public /opt/fenix-os/grg/public"
exit /b %ERRORLEVEL%

:PROJECTS_DEPLOY
echo Deploying live Project Kernel hub to both webroots...
for %%F in (index.html project-hub-live.js project-hub-live.css project-ide-live.js) do (
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/public/%%F
  if errorlevel 1 exit /b 1
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/grg/public/%%F
  if errorlevel 1 exit /b 1
)
ssh -i %KEY% %HOST% "pm2 reload 17"
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "curl -fsS -o /dev/null http://127.0.0.1:3000/ && diff -qr --exclude='*.bak*' /opt/fenix-os/public /opt/fenix-os/grg/public"
exit /b %ERRORLEVEL%

:WORKSPACE_DEPLOY
echo Deploying authenticated workspace and Marketplace to both webroots...
for %%F in (index.html login.html unified-app.js fenix-core-controller.js iso-city.js marketplace-live.js marketplace-live.css) do (
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/public/%%F
  if errorlevel 1 exit /b 1
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/grg/public/%%F
  if errorlevel 1 exit /b 1
)
ssh -i %KEY% %HOST% "cp -p /opt/fenix-os/frontend-gateway.js /opt/fenix-os/frontend-gateway.js.before-workspace"
if errorlevel 1 exit /b 1
scp -i %KEY% grg/gateway/frontend-gateway.js %HOST%:/opt/fenix-os/frontend-gateway.js
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "node --check /opt/fenix-os/frontend-gateway.js && pm2 reload 17 && (for i in 1 2 3 4 5 6 7 8 9 10; do curl -fsS -o /dev/null http://127.0.0.1:3000/GRG-login && break; sleep 1; done) && curl -fsS -o /dev/null http://127.0.0.1:3000/GRG-login && diff -qr --exclude='*.bak*' /opt/fenix-os/public /opt/fenix-os/grg/public"
exit /b %ERRORLEVEL%

:UNREAL_DEPLOY
echo Deploying canonical Unreal Living World (HTML, JS, CSS, Routes, Server) to both webroots...
for %%F in (index.html unreal-world-live.js unreal-world.css) do (
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/public/%%F
  if errorlevel 1 exit /b 1
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/grg/public/%%F
  if errorlevel 1 exit /b 1
)
scp -i %KEY% grg/src/api/unreal-world-routes.js %HOST%:/opt/fenix-os/grg/src/api/unreal-world-routes.js
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "cp -p /opt/fenix-os/grg/src/server.js /opt/fenix-os/grg/src/server.js.before-unreal"
if errorlevel 1 exit /b 1
scp -i %KEY% grg/src/server.js %HOST%:/opt/fenix-os/grg/src/server.js
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "node --check /opt/fenix-os/grg/src/api/unreal-world-routes.js && node --check /opt/fenix-os/grg/src/server.js && pm2 reload 16 && pm2 reload 17 && (for i in $(seq 1 45); do curl -fsS -o /dev/null http://127.0.0.1:4410/health && break; sleep 1; done) && diff -qr --exclude='*.bak*' /opt/fenix-os/public /opt/fenix-os/grg/public"
exit /b %ERRORLEVEL%

:INTENT_DEPLOY
echo Deploying canonical Intent Engine 2.0 via atomic package...
tar -czf intent-deploy.tar.gz grg/src/intent grg/src/missions/intent-engine.js grg/src/orchestrator/intent-engine.js grg/src/api/intent-routes.js grg/src/server.js
if errorlevel 1 exit /b 1
scp -i %KEY% intent-deploy.tar.gz %HOST%:/tmp/intent-deploy.tar.gz
if errorlevel 1 exit /b 1
del intent-deploy.tar.gz
ssh -i %KEY% %HOST% "cp -p /opt/fenix-os/grg/src/server.js /opt/fenix-os/grg/src/server.js.before-intent && tar -xzf /tmp/intent-deploy.tar.gz -C /opt/fenix-os/ && rm -f /tmp/intent-deploy.tar.gz && node --check /opt/fenix-os/grg/src/intent/self-model.js && node --check /opt/fenix-os/grg/src/intent/intent-compiler.js && node --check /opt/fenix-os/grg/src/intent/intent-engine.js && node --check /opt/fenix-os/grg/src/api/intent-routes.js && node --check /opt/fenix-os/grg/src/server.js && pm2 reload 16 && (for i in $(seq 1 45); do curl -fsS -o /dev/null http://127.0.0.1:4410/health && break; sleep 1; done) && curl -fsS http://127.0.0.1:4410/health"
exit /b %ERRORLEVEL%

:REALITY_DEPLOY
echo Deploying City Reality Engine (HTML, JS, CSS, Routes) to VPS dual webroots...
for %%F in (index.html city-reality-engine.js iso-city.js fenix-pixel-engine.js pixi-building-interior.js) do (
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/public/%%F
  if errorlevel 1 exit /b 1
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/grg/public/%%F
  if errorlevel 1 exit /b 1
)
for %%F in (city-reality.css) do (
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/public/%%F
  if errorlevel 1 exit /b 1
  scp -i %KEY% %SRC%/%%F %HOST%:/opt/fenix-os/grg/public/%%F
  if errorlevel 1 exit /b 1
)
ssh -i %KEY% %HOST% "cp -p /opt/fenix-os/grg/src/api/living-city-routes.js /opt/fenix-os/grg/src/api/living-city-routes.js.before-reality && cp -p /opt/fenix-os/grg/src/api/company-brain-routes.js /opt/fenix-os/grg/src/api/company-brain-routes.js.before-reality"
scp -i %KEY% grg/src/api/living-city-routes.js %HOST%:/opt/fenix-os/grg/src/api/living-city-routes.js
if errorlevel 1 exit /b 1
scp -i %KEY% grg/src/api/company-brain-routes.js %HOST%:/opt/fenix-os/grg/src/api/company-brain-routes.js
if errorlevel 1 exit /b 1
ssh -i %KEY% %HOST% "node --check /opt/fenix-os/grg/src/api/living-city-routes.js && node --check /opt/fenix-os/grg/src/api/company-brain-routes.js && pm2 reload fenix-backend && pm2 reload fenix-frontend && (for i in $(seq 1 45); do curl -fsS -o /dev/null http://127.0.0.1:4410/health && break; sleep 1; done) && curl -fsS http://127.0.0.1:4410/health && diff -qr --exclude='*.bak*' --exclude='*.before-*' /opt/fenix-os/public /opt/fenix-os/grg/public"
exit /b %ERRORLEVEL%

