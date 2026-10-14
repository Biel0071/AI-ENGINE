const fs = require('fs');
const file = 'c:/projetos/ai-engine-core/scratch/frontend-evolution/candidate/public/fenix-v11-phase6.css';
const css = `
/* Dynamic Agent Cards CSS */
.fenix-empty-state {
  text-align: center;
  color: var(--fenix-text-muted);
  font-size: 14px;
  padding: 40px;
}

.fenix-agent-card {
  background: var(--fenix-bg-card);
  border: 1px solid var(--fenix-border-default);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(12px);
}

.fenix-agent-card:hover {
  background: var(--fenix-bg-card-hover);
  border-color: var(--fenix-border-glow);
  box-shadow: var(--fenix-green-glow);
  transform: translateY(-2px);
}

.fenix-agent-card .agent-avatar {
  display: flex;
  justify-content: center;
}

.fenix-agent-card .agent-avatar img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid rgba(0, 229, 160, 0.2);
}

.fenix-agent-card .agent-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  text-align: center;
}

.fenix-agent-card .agent-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--fenix-text-primary);
  margin: 0;
}

.fenix-agent-card .agent-role-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: var(--fenix-text-secondary);
}

.fenix-agent-card .agent-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.fenix-agent-card .agent-status.online { background: #00E5A0; box-shadow: 0 0 8px #00E5A0; }
.fenix-agent-card .agent-status.busy { background: #FBBF24; box-shadow: 0 0 8px #FBBF24; }
.fenix-agent-card .agent-status.offline { background: #64748B; }

.fenix-agent-card .agent-stats {
  font-size: 11px;
  color: var(--fenix-text-muted);
}

.fenix-agent-card .agent-tags,
.fenix-agent-card .agent-personality {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.fenix-agent-card .agent-tag,
.fenix-agent-card .agent-trait {
  font-size: 9px;
  padding: 2px 6px;
  background: rgba(34, 211, 238, 0.1);
  border: 1px solid rgba(34, 211, 238, 0.2);
  border-radius: 4px;
  color: var(--fenix-cyan);
}
`;
fs.appendFileSync(file, css);
console.log('Appended CSS.');
