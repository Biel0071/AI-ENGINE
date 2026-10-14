(function() {
    // 1. CSS inline
    const styles = `
        :root {
            --bg-color: #0a0d1a;
            --sidebar-bg: #111827;
            --card-bg: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #38bdf8;
            --accent-hover: #0284c7;
            --border: #334155;
            --success: #22c55e;
            --error: #ef4444;
            --warning: #f59e0b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: var(--bg-color); color: var(--text-main); height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        #app-container { display: flex; flex: 1; overflow: hidden; }
        
        /* Sidebar */
        #sidebar { width: 250px; background: var(--sidebar-bg); border-right: 1px solid var(--border); display: flex; flex-direction: column; z-index: 10; }
        .sidebar-header { padding: 20px; font-size: 24px; font-weight: bold; color: var(--accent); border-bottom: 1px solid var(--border); }
        .nav-items { flex: 1; padding: 10px 0; overflow-y: auto; }
        .nav-item { padding: 15px 20px; cursor: pointer; color: var(--text-muted); transition: all 0.2s; border-left: 3px solid transparent; }
        .nav-item:hover { background: rgba(56, 189, 248, 0.1); color: var(--text-main); }
        .nav-item.active { background: rgba(56, 189, 248, 0.15); color: var(--accent); border-left-color: var(--accent); }
        
        /* Main Area */
        #main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-color); position: relative; z-index: 5; }
        .view-header { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .view-title { font-size: 20px; font-weight: 600; }
        .view-actions button { background: var(--accent); color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        .view-actions button:hover { background: var(--accent-hover); }
        .view-content { flex: 1; padding: 20px; overflow-y: auto; }
        
        /* StatusBar */
        #statusbar { height: 30px; background: var(--sidebar-bg); border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; padding: 0 20px; font-size: 12px; color: var(--text-muted); z-index: 10; }
        .status-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
        .status-indicator.online { background: var(--success); }
        .status-indicator.offline { background: var(--error); }
        
        /* Components */
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 15px; }
        .card-title { font-size: 16px; font-weight: 600; color: var(--accent); margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 5px; }
        .metric-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
        .loading { display: flex; justify-content: center; align-items: center; height: 100%; color: var(--accent); font-size: 18px; }
        .error-msg { color: var(--error); background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 4px; border: 1px solid var(--error); }
        
        /* Lists */
        .list-item { padding: 10px; border-bottom: 1px solid var(--border); }
        .list-item:last-child { border-bottom: none; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 11px; font-weight: 600; background: var(--border); color: var(--text-main); }
        .badge.active { background: rgba(34, 197, 94, 0.2); color: var(--success); }
    `;

    const styleTag = document.createElement('style');
    styleTag.innerHTML = styles;
    document.head.appendChild(styleTag);

    // 2. State management
    const state = {
        currentView: 'dashboard',
        data: {
            dashboard: null,
            agents: null,
            learning: null,
            projects: null,
            knowledge: null,
            skills: null,
            errors: null,
            snapshot: null,
            models: null
        },
        loading: false,
        error: null,
        lastUpdate: null,
        isOnline: false,
        refreshInterval: null
    };

    // 3. API Helpers
    const API_BASE = ''; // Same origin
    
    async function fetchApi(endpoint) {
        try {
            const response = await fetch(API_BASE + endpoint, {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
            return await response.json();
        } catch (e) {
            console.error('API Error:', endpoint, e);
            throw e;
        }
    }

    async function loadViewData(view) {
        state.loading = true;
        state.error = null;
        renderApp();
        
        try {
            switch(view) {
                case 'dashboard':
                    state.data.dashboard = await fetchApi('/api/v2/intelligence/dashboard').catch(() => ({}));
                    break;
                case 'ai-city':
                case 'agentes':
                    const agentsRes = await fetchApi('/api/v2/living-city/agents').catch(() => []);
                    state.data.agents = Array.isArray(agentsRes) ? agentsRes : (agentsRes.agents || []);
                    break;
                case 'learning':
                    state.data.learning = await fetchApi('/api/v2/learning/metrics').catch(() => ({}));
                    break;
                case 'projetos':
                    state.data.projects = await fetchApi('/api/v2/public/projects').catch(() => []);
                    break;
                case 'memoria':
                    const [know, ski, err, snap] = await Promise.all([
                        fetchApi('/api/v2/memory/knowledge').catch(() => []),
                        fetchApi('/api/v2/memory/skills').catch(() => []),
                        fetchApi('/api/v2/memory/errors').catch(() => []),
                        fetchApi('/api/v2/memory/snapshot').catch(() => ({}))
                    ]);
                    state.data.knowledge = know;
                    state.data.skills = ski;
                    state.data.errors = err;
                    state.data.snapshot = snap;
                    break;
            }
            state.isOnline = true;
            state.lastUpdate = new Date();
        } catch (e) {
            state.error = "Erro ao carregar dados: " + e.message;
            state.isOnline = false;
        } finally {
            state.loading = false;
            renderApp();
        }
    }

    // 4. Render functions
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        if (typeof unsafe === 'object') return escapeHtml(JSON.stringify(unsafe));
        return String(unsafe).replace(/[&<"'>]/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '"': '&quot;', "'": '&#39;', '>': '&gt;' }[m];
        });
    }

    function renderDashboard() {
        const d = state.data.dashboard || {};
        return \`
            <div class="grid">
                <div class="card">
                    <div class="card-title">Sistema</div>
                    <div>Status: <span class="badge active">\${escapeHtml(d.systemStatus || 'Online')}</span></div>
                    <div class="metric-value">Uptime: \${escapeHtml(d.uptime || 'N/A')}</div>
                </div>
                <div class="card">
                    <div class="card-title">Métricas de IA</div>
                    <div>Requisições Totais: \${escapeHtml(d.totalRequests || 0)}</div>
                    <div>Tarefas Ativas: \${escapeHtml(d.activeTasks || 0)}</div>
                </div>
            </div>
            <div class="card" style="margin-top: 20px;">
                <div class="card-title">Eventos Recentes</div>
                <div style="font-family: monospace; font-size: 12px;">
                    \${(d.recentEvents || []).map(e => \`<div class="list-item">[\${escapeHtml(e.time || '')}] \${escapeHtml(e.message || e.type)}</div>\`).join('')}
                    \${!(d.recentEvents && d.recentEvents.length) ? 'Nenhum evento recente.' : ''}
                </div>
            </div>
        \`;
    }

    function renderAiCity() {
        const agents = state.data.agents || [];
        return \`
            <div style="margin-bottom: 20px;">Visualização da Cidade IA. Agentes ativos: \${agents.length}</div>
            <div class="grid">
                \${agents.map(a => \`
                    <div class="card">
                        <div class="card-title">\${escapeHtml(a.name || a.id)}</div>
                        <div>Role: \${escapeHtml(a.role || 'N/A')}</div>
                        <div>Status: <span class="badge \${a.status === 'active' || a.status === 'idle' ? 'active' : ''}">\${escapeHtml(a.status || 'unknown')}</span></div>
                        <div style="margin-top: 10px; font-size: 12px; color: var(--text-muted);">\${escapeHtml(a.currentTask || 'Sem tarefa atual')}</div>
                    </div>
                \`).join('')}
                \${agents.length === 0 ? 'Nenhum agente encontrado na cidade.' : ''}
            </div>
        \`;
    }

    function renderLearning() {
        const l = state.data.learning || {};
        return \`
            <div class="grid">
                <div class="card">
                    <div class="card-title">Knowledge Reuse Rate</div>
                    <div class="metric-value">\${escapeHtml(l.knowledgeReuseRate || '0')}%</div>
                </div>
                <div class="card">
                    <div class="card-title">Skills Aprendidas</div>
                    <div class="metric-value">\${escapeHtml(l.skillsLearned || l.totalSkills || '0')}</div>
                </div>
                <div class="card">
                    <div class="card-title">AI Avoided</div>
                    <div class="metric-value">\${escapeHtml(l.aiAvoidedCount || '0')} tasks</div>
                </div>
            </div>
        \`;
    }

    function renderProjetos() {
        const p = state.data.projects || [];
        return \`
            <div class="grid">
                \${p.length > 0 ? p.map(proj => \`
                    <div class="card">
                        <div class="card-title">\${escapeHtml(proj.name)}</div>
                        <div>Status: \${escapeHtml(proj.status)}</div>
                        <div style="font-size: 12px; margin-top:10px;">\${escapeHtml(proj.description || '')}</div>
                    </div>
                \`).join('') : '<div class="card">Nenhum projeto encontrado.</div>'}
            </div>
        \`;
    }

    function renderMemoria() {
        const k = state.data.knowledge || [];
        return \`
            <div class="grid">
                <div class="card" style="grid-column: 1 / -1;">
                    <div class="card-title">Snapshot de Memória Global</div>
                    <pre style="font-size: 11px; overflow-x: auto;">\${escapeHtml(state.data.snapshot || {})}</pre>
                </div>
                <div class="card">
                    <div class="card-title">Knowledge (\${k.length})</div>
                    <ul style="padding-left: 20px; font-size: 13px;">
                        \${k.slice(0, 10).map(i => \`<li>\${escapeHtml(i.title || i.id || i)}</li>\`).join('')}
                    </ul>
                </div>
                <div class="card">
                    <div class="card-title">Errors Registrados (\${(state.data.errors || []).length})</div>
                </div>
                <div class="card">
                    <div class="card-title">Skills (\${(state.data.skills || []).length})</div>
                </div>
            </div>
        \`;
    }

    function renderAgentes() {
        return renderAiCity();
    }

    function renderContent() {
        if (state.loading && !state.lastUpdate) return \`<div class="loading">Carregando \${state.currentView}...</div>\`;
        if (state.error && !state.lastUpdate) return \`<div class="error-msg">\${escapeHtml(state.error)}</div>\`;

        switch(state.currentView) {
            case 'dashboard': return renderDashboard();
            case 'ai-city': return renderAiCity();
            case 'learning': return renderLearning();
            case 'projetos': return renderProjetos();
            case 'memoria': return renderMemoria();
            case 'agentes': return renderAgentes();
            default: return '<div>View não encontrada</div>';
        }
    }

    function renderApp() {
        const app = document.getElementById('app') || document.body;
        
        let container = document.getElementById('fenix-os-root');
        if (!container) {
            if (app === document.body) {
                Array.from(document.body.children).forEach(child => {
                    if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.id !== 'fenix-os-root') {
                        child.style.display = 'none'; // Hide everything else
                    }
                });
            } else {
                app.innerHTML = '';
            }
            
            container = document.createElement('div');
            container.id = 'fenix-os-root';
            container.style.height = '100vh';
            container.style.width = '100vw';
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.zIndex = '9999';
            container.style.background = 'var(--bg-color)';
            app.appendChild(container);
        }

        const navItems = [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'ai-city', label: 'AI City' },
            { id: 'learning', label: 'Learning Engine' },
            { id: 'projetos', label: 'Projetos' },
            { id: 'memoria', label: 'Memória' },
            { id: 'agentes', label: 'Agentes' }
        ];

        const lastUpdateStr = state.lastUpdate ? state.lastUpdate.toLocaleTimeString() : 'Nunca';

        container.innerHTML = \`
            <div id="app-container">
                <div id="sidebar">
                    <div class="sidebar-header">FÊNIX OS</div>
                    <div class="nav-items">
                        \${navItems.map(item => \`
                            <div class="nav-item \${state.currentView === item.id ? 'active' : ''}" data-view="\${item.id}">
                                \${item.label}
                            </div>
                        \`).join('')}
                    </div>
                </div>
                <div id="main-area">
                    <div class="view-header">
                        <div class="view-title">\${navItems.find(i => i.id === state.currentView)?.label || 'View'} \${state.loading ? '<span style="font-size:12px;color:var(--accent);">(Atualizando...)</span>' : ''}</div>
                        <div class="view-actions">
                            <button id="btn-refresh">Refresh Agora</button>
                        </div>
                    </div>
                    <div class="view-content">
                        \${state.error ? \`<div class="error-msg" style="margin-bottom:15px;">\${escapeHtml(state.error)}</div>\` : ''}
                        \${renderContent()}
                    </div>
                </div>
            </div>
            <div id="statusbar">
                <div>
                    <span class="status-indicator \${state.isOnline ? 'online' : 'offline'}"></span>
                    Backend: \${state.isOnline ? 'Online' : 'Offline'}
                </div>
                <div>Última atualização: \${lastUpdateStr}</div>
            </div>
        \`;

        // 5. Navigation Events
        document.querySelectorAll('.nav-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                if (view !== state.currentView) {
                    state.currentView = view;
                    loadViewData(view);
                }
            });
        });

        document.getElementById('btn-refresh').addEventListener('click', () => {
            loadViewData(state.currentView);
        });
    }

    // 6. Auto-refresh
    function setupAutoRefresh() {
        if (state.refreshInterval) clearInterval(state.refreshInterval);
        state.refreshInterval = setInterval(() => {
            loadViewData(state.currentView);
        }, 15000);
    }

    // 7. Init
    function init() {
        renderApp();
        loadViewData(state.currentView);
        setupAutoRefresh();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
