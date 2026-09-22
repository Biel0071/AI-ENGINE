@echo off
rem =========================================================================
rem FENIX OS CANONICAL DEPLOY SCRIPT
rem Source of Truth: c:/projetos/ai-engine-core/ai-engine/grg/public/
rem Target VPS: root@209.50.241.22 (/opt/fenix-os/public/ and /opt/fenix-os/grg/public/)
rem =========================================================================

set KEY=C:/Users/Dell/.ssh/grg_fenix_vps
set SRC=c:/projetos/ai-engine-core/ai-engine/grg/public
set HOST=root@209.50.241.22

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

echo [3/8] Deploying AI City & Pixel Engine (Pixi 8 Pipeline)...
scp -i %KEY% %SRC%/iso-city.js %HOST%:/opt/fenix-os/public/iso-city.js
scp -i %KEY% %SRC%/iso-city.js %HOST%:/opt/fenix-os/grg/public/iso-city.js
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

echo [4/8] Deploying IDE, Flow Graph & Specialized Modules...
scp -i %KEY% %SRC%/fenix-flow-graph.js %HOST%:/opt/fenix-os/public/fenix-flow-graph.js
scp -i %KEY% %SRC%/fenix-flow-graph.js %HOST%:/opt/fenix-os/grg/public/fenix-flow-graph.js
scp -i %KEY% %SRC%/fenix-visual-ide.js %HOST%:/opt/fenix-os/public/fenix-visual-ide.js
scp -i %KEY% %SRC%/fenix-visual-ide.js %HOST%:/opt/fenix-os/grg/public/fenix-visual-ide.js
scp -i %KEY% %SRC%/fenix-v11-interactions.js %HOST%:/opt/fenix-os/public/fenix-v11-interactions.js
scp -i %KEY% %SRC%/fenix-v11-interactions.js %HOST%:/opt/fenix-os/grg/public/fenix-v11-interactions.js
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

echo [5/8] Deploying Design System & Complete Stylesheets...
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

echo [6/8] Deploying static assets and icons...
scp -r -i %KEY% %SRC%/assets/ %HOST%:/opt/fenix-os/public/
scp -r -i %KEY% %SRC%/assets/ %HOST%:/opt/fenix-os/grg/public/
scp -i %KEY% %SRC%/favicon.ico %HOST%:/opt/fenix-os/public/favicon.ico
scp -i %KEY% %SRC%/favicon.ico %HOST%:/opt/fenix-os/grg/public/favicon.ico

echo [7/8] Reloading frontend gateway service (PM2 #17)...
ssh -i %KEY% %HOST% "pm2 reload 17"

echo [8/8] Verifying health and HTTP response...
ssh -i %KEY% %HOST% "curl -s -o /dev/null -w '%%{http_code}' http://127.0.0.1:3000/"

echo =========================================================================
echo Deploy complete from canonical source: %SRC%
echo =========================================================================
