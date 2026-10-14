// Fenix AI City - Habbo/Tibia Style Physics & Rendering Engine
function initFenixPhysics() {
  if (window.fenixPhysicsLoop) clearInterval(window.fenixPhysicsLoop);
  
  window.fenixWorldState = window.fenixWorldState || {
    agents: {},
    chatBubbles: []
  };

  window.fenixPhysicsLoop = setInterval(() => {
    if (!window.FENIX_WORLD_MAP) return;
    
    const root = document.getElementById('fenix-agents-root');
    if (!root) return;
    
    const now = Date.now();
    const state = window.fenixWorldState;
    
    Object.values(state.agents).forEach(agent => {
      if (!agent.node) return;

      const dx = agent.tx - agent.x;
      const dy = agent.ty - agent.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 0.1) {
        agent.x = agent.tx;
        agent.y = agent.ty;
        agent.moving = false;
        
        // Randomly wander around their project area
        if (Math.random() < 0.05) {
          agent.tx = agent.baseX + (Math.random() * 8 - 4);
          agent.ty = agent.baseY + (Math.random() * 8 - 4);
          agent.moving = true;
        }
      } else {
        const speed = agent.status === 'WORKING' ? 0.4 : 0.2;
        agent.x += (dx / dist) * speed;
        agent.y += (dy / dist) * speed;
        agent.moving = true;
        // Direction facing (left/right)
        if (Math.abs(dx) > 0.1) agent.facingLeft = dx < 0;
      }
      
      // Update DOM
      agent.node.style.left = agent.x + '%';
      agent.node.style.top = agent.y + '%';
      
      const sprite = agent.node.querySelector('.npc-sprite');
      if (sprite) {
         sprite.style.setProperty('--facing', agent.facingLeft ? '-1' : '1');
         if (agent.moving) {
           sprite.style.animation = 'npcWalk 0.3s infinite alternate ease-in-out';
         } else {
           sprite.style.animation = 'none';
           sprite.style.transform = 'scaleX(var(--facing))';
         }
      }
    });
    
  }, 50);
}
initFenixPhysics();
