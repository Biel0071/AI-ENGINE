const fs = require('fs');

const file = '/opt/fenix-os/public/index.html';
let html = fs.readFileSync(file, 'utf8');

// 1. Update dispatchLoader for city
const oldDispatch = `      } else if (viewId === 'city') {
        if (typeof window.initV9City === 'function') window.initV9City();
        if (typeof window.updateV9CityStatus === 'function') window.updateV9CityStatus();
        if (typeof window.syncCityPlacement === 'function') window.syncCityPlacement();`;

const newDispatch = `      } else if (viewId === 'city') {
        if (typeof window.loadCityView === 'function') window.loadCityView();
        else {
          if (typeof window.initV9City === 'function') window.initV9City();
          if (typeof window.updateV9CityStatus === 'function') window.updateV9CityStatus();
          if (typeof window.syncCityPlacement === 'function') window.syncCityPlacement('city');
        }`;

if (!html.includes(oldDispatch)) {
  console.error('Could not find oldDispatch in index.html');
  process.exit(1);
}
html = html.replace(oldDispatch, newDispatch);

// 2. Add window.loadCityView definition before window.loadIdeView
const targetBeforeIde = `  // 2. IDE View Loader (Workflows & File Explorer)`;
if (!html.includes(targetBeforeIde)) {
  console.error('Could not find targetBeforeIde in index.html');
  process.exit(1);
}

const cityLoaderCode = `  // 1.5 City View Loader (AI City Living Engine & Real Telemetry)
  window.loadCityView = async function() {
    if (typeof window.syncCityPlacement === 'function') {
      window.syncCityPlacement('city');
    }
    if (!window.fenixCity && typeof IsoCityEngine !== 'undefined' && document.getElementById('cityCanvas')) {
      window.fenixCity = new IsoCityEngine('cityCanvas');
      window.fenixSetCameraMode = (mode) => window.fenixCity?.setCameraMode(mode);
      window.fenixPanToDistrict = (dist) => window.fenixCity?.panToDistrict(dist);
      window.refreshCityState = () => window.fenixCity?.syncRealData();
    }
    try {
      const [cityState, livingState, agentsRes] = await Promise.all([
        fetch('/api/v2/city/state').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/living-city/state').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/living-city/agents').then(r => r.json()).catch(() => ({}))
      ]);

      const agents = agentsRes.agents || [];
      const onlineCount = agents.filter(a => a.status === 'ONLINE' || a.state === 'IDLE' || a.state === 'WORKING' || a.health === 'healthy').length || agents.length;
      const workingCount = agents.filter(a => a.status === 'WORKING' || a.state === 'WORKING' || a.currentTask).length;

      const elOnline = document.getElementById('cityOnlineCount');
      if (elOnline) elOnline.textContent = '● ' + onlineCount + ' ONLINE';

      const elWorking = document.getElementById('cityWorkingCount');
      if (elWorking) elWorking.textContent = '⚡ ' + workingCount + ' EM OPERAÇÃO';

      const elMissions = document.getElementById('cityMissionsCount');
      if (elMissions) {
        const missionsCount = livingState.activeMissions !== undefined ? livingState.activeMissions : (livingState.metrics?.activeMissions || 0);
        elMissions.textContent = '🎯 ' + missionsCount + ' MISSÕES';
      }

      if (window.fenixCity?.syncRealData) {
        await window.fenixCity.syncRealData();
      }
      if (window.fenixCity?.resize) {
        window.fenixCity.resize();
      }
    } catch(err) {
      console.warn('loadCityView error:', err);
    }
  };

`;

html = html.replace(targetBeforeIde, cityLoaderCode + targetBeforeIde);

// 3. Add aliases if not present
if (!html.includes("'living-city': 'city'")) {
  html = html.replace("'infrastructure': 'project',", "'infrastructure': 'project',\n    'living-city': 'city',\n    'ai-city': 'city',");
}

fs.writeFileSync(file, html, 'utf8');
console.log('Successfully patched index.html with City View loader!');
