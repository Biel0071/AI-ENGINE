'use strict';
/**
 * FÊNIX OS — Visual Agent Workspace & Video Production Studio API Routes
 * Exposes REST endpoints for the visual agent workspace, live cursors,
 * 24 canonical actions, website reconstruction, autonomous QA loop,
 * and multi-agent video production studio.
 */

const { VisualWorkspaceEngine } = require('../visual-ide/visual-workspace-engine');
const { VideoProductionStudioEngine } = require('../media/video-production-studio');

let globalVisualWorkspace = null;
let globalVideoStudio = null;

function getVisualWorkspace(app) {
  if (!globalVisualWorkspace) {
    globalVisualWorkspace = new VisualWorkspaceEngine();
    if (app) app.visualWorkspace = globalVisualWorkspace;
  }
  return globalVisualWorkspace;
}

function getVideoStudio(app) {
  if (!globalVideoStudio) {
    globalVideoStudio = new VideoProductionStudioEngine();
    if (app) app.videoStudio = globalVideoStudio;
  }
  return globalVideoStudio;
}

async function handleVisualAgentWorkspaceRoutes(req, res, url, app, sendJson, readJson, identity) {
  const method = req.method;
  const pathname = url.pathname;
  const workspace = getVisualWorkspace(app);
  const videoStudio = getVideoStudio(app);

  try {
    // 1. Visual Workspace Status
    if (method === 'GET' && pathname === '/api/v2/visual-workspace/status') {
      const status = workspace.getStatus();
      const videoStatus = {
        projectsCount: videoStudio.getProjects().length,
        mediaCount: videoStudio.getMediaLibrary().length,
        agentsCount: videoStudio.getVideoAgents().length,
      };
      return sendJson(res, 200, { ok: true, workspace: status, videoStudio: videoStatus });
    }

    // 2. Active Agents & Live Cursors
    if (method === 'GET' && pathname === '/api/v2/visual-workspace/agents') {
      const agents = workspace.getActiveAgents();
      return sendJson(res, 200, { ok: true, count: agents.length, agents });
    }

    // 3. Operations Timeline
    if (method === 'GET' && pathname === '/api/v2/visual-workspace/timeline') {
      const limit = Number(url.searchParams.get('limit') || 50);
      const timeline = workspace.getTimeline(limit);
      return sendJson(res, 200, { ok: true, count: timeline.length, timeline });
    }

    // 4. Canonical 24 Agent Actions Dispatcher
    if (method === 'POST' && pathname === '/api/v2/visual-workspace/action') {
      const body = await readJson(req);
      const action = body.action;
      if (!action) return sendJson(res, 400, { ok: false, error: 'action parameter is required' });

      let result = null;
      switch (action) {
        case 'open_project':
          result = await workspace.open_project(body.projectId, body);
          break;
        case 'open_browser':
          result = await workspace.open_browser(body.url, body);
          break;
        case 'navigate':
          result = await workspace.navigate(body.url, body);
          break;
        case 'inspect_page':
          result = await workspace.inspect_page(body);
          break;
        case 'inspect_dom':
          result = await workspace.inspect_dom(body.selector, body);
          break;
        case 'inspect_component':
          result = await workspace.inspect_component(body.componentName, body);
          break;
        case 'inspect_styles':
          result = await workspace.inspect_styles(body.selector, body);
          break;
        case 'select_element':
          result = await workspace.select_element(body.selector, body);
          break;
        case 'click_element':
          result = await workspace.click_element(body.selector, body);
          break;
        case 'type_text':
          result = await workspace.type_text(body.selector, body.text || '', body);
          break;
        case 'edit_text':
          result = await workspace.edit_text(body.selector, body.newText || '', body);
          break;
        case 'modify_css':
          result = await workspace.modify_css(body.selector, body.properties || {}, body);
          break;
        case 'modify_component':
          result = await workspace.modify_component(body.componentName, body.changes || {}, body);
          break;
        case 'create_component':
          result = await workspace.create_component(body.name, body.template, body);
          break;
        case 'create_section':
          result = await workspace.create_section(body.sectionName, body.config, body);
          break;
        case 'replace_asset':
          result = await workspace.replace_asset(body.selector, body.assetUrl, body);
          break;
        case 'resize_element':
          result = await workspace.resize_element(body.selector, body.width, body.height, body);
          break;
        case 'reposition_element':
          result = await workspace.reposition_element(body.selector, body.x, body.y, body);
          break;
        case 'capture_screenshot':
          result = await workspace.capture_screenshot(body.name, body);
          break;
        case 'compare_screenshots':
          result = await workspace.compare_screenshots(body.beforePath, body.afterPath, body);
          break;
        case 'inspect_console':
          result = await workspace.inspect_console(body);
          break;
        case 'run_responsive_test':
          result = await workspace.run_responsive_test(body.resolutions, body);
          break;
        case 'run_accessibility_test':
          result = await workspace.run_accessibility_test(body.selector, body);
          break;
        case 'run_e2e_test':
          result = await workspace.run_e2e_test(body.testSuite, body);
          break;
        case 'close_browser':
          result = await workspace.close_browser(body);
          break;
        case 'acquire_lock':
        case 'lock_element':
          result = workspace.acquireElementLock(body.agentId || 'frontend-dev', body.selector, body.operation || 'LOCK', true);
          break;
        case 'release_lock':
        case 'unlock_element':
          result = workspace.releaseElementLock(body.agentId || 'frontend-dev', body.selector, body.force || false);
          break;
        case 'undo':
          result = workspace.undo();
          break;
        case 'redo':
          result = workspace.redo();
          break;
        default:
          return sendJson(res, 400, { ok: false, error: `Unknown visual action: ${action}` });
      }

      return sendJson(res, 200, { ok: true, action, result });
    }

    // 5. Website Reconstruction
    if (method === 'POST' && pathname === '/api/v2/visual-workspace/reconstruct') {
      const body = await readJson(req);
      const { type, source, options } = body;
      if (!type || !source) return sendJson(res, 400, { ok: false, error: 'type (url, screenshot, video) and source are required' });
      const result = await workspace.reconstructFromSource(type, source, options || {});
      return sendJson(res, 200, result);
    }

    // 6. Autonomous Visual QA Loop
    if (method === 'POST' && pathname === '/api/v2/visual-workspace/qa-loop') {
      const body = await readJson(req);
      const result = await workspace.runAutonomousQaLoop(body.target, body.options || {});
      return sendJson(res, 200, result);
    }

    // 7. Fênix Self-Evolution Mode
    if (method === 'POST' && pathname === '/api/v2/visual-workspace/self-evolution') {
      const body = await readJson(req);
      const result = await workspace.runSelfEvolutionCycle(body.moduleTarget, body.proposedChange || {});
      return sendJson(res, 200, result);
    }

    // 8. Video Production Studio: Projects
    if (method === 'GET' && pathname === '/api/v2/video-studio/projects') {
      const projects = videoStudio.getProjects();
      return sendJson(res, 200, { ok: true, count: projects.length, projects });
    }

    if (method === 'POST' && pathname === '/api/v2/video-studio/projects') {
      const body = await readJson(req);
      const project = videoStudio.createProject(body);
      return sendJson(res, 201, { ok: true, project });
    }

    // 9. Video Production Studio: Media Library
    if (method === 'GET' && pathname === '/api/v2/video-studio/media') {
      const media = videoStudio.getMediaLibrary();
      return sendJson(res, 200, { ok: true, count: media.length, media });
    }

    if (method === 'POST' && pathname === '/api/v2/video-studio/media') {
      const body = await readJson(req);
      if (!body.filePath) return sendJson(res, 400, { ok: false, error: 'filePath is required' });
      const item = videoStudio.addMedia(body.filePath, body);
      return sendJson(res, 201, { ok: true, media: item });
    }

    // 10. Video Production Studio: Agents
    if (method === 'GET' && pathname === '/api/v2/video-studio/agents') {
      const agents = videoStudio.getVideoAgents();
      return sendJson(res, 200, { ok: true, count: agents.length, agents });
    }

    // 11. Video Production Studio: Timeline Clip Update
    if (method === 'POST' && pathname === '/api/v2/video-studio/timeline') {
      const body = await readJson(req);
      const result = videoStudio.updateTimelineClip(body.projectId, body.clip);
      return sendJson(res, 200, result);
    }

    // 12. Video Production Studio: FFmpeg Render
    if (method === 'POST' && pathname === '/api/v2/video-studio/render') {
      const body = await readJson(req);
      if (!body.projectId) return sendJson(res, 400, { ok: false, error: 'projectId is required' });
      const render = await videoStudio.renderVideo(body.projectId, body);
      return sendJson(res, 200, { ok: true, render });
    }

    return false;
  } catch (error) {
    const status = error.statusCode || (error.message?.includes('currently locked') ? 409 : 500);
    return sendJson(res, status, { ok: false, error: { message: error.message } });
  }
}

module.exports = {
  handleVisualAgentWorkspaceRoutes,
  getVisualWorkspace,
  getVideoStudio,
};
