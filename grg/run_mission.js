const http = require('http');

const jobs = [
  "PERCEPTION_ENGINE", "VIDEO_OBSERVER", "BROWSER_OBSERVER", 
  "VISUAL_MEMORY", "DIGITAL_TWIN", "WORLD_MAP", 
  "CITY_RENDERER", "BUILDING_RENDERER", "FLOOR_RENDERER", 
  "ROOM_RENDERER", "NPC_SYSTEM", "AGENT_MOVEMENT", 
  "AGENT_INTERACTION", "AGENT_COMMUNICATION", "MEETING_SYSTEM", 
  "TELEMETRY", "MINIMAP", "ZOOM_SYSTEM", "PAN_SYSTEM", 
  "RUN_MODE", "EVOLUTION_LOOP", "API_PROJECT_MAPPING", 
  "VISUAL_QA", "PERFORMANCE_QA", "FINAL_REVIEW"
];

async function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log("Authenticating...");
  const loginData = JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'grg-admin' });
  const loginRes = await request({
    hostname: '127.0.0.1', port: 4400, path: '/api/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
  }, loginData);
  
  if (loginRes.status !== 200) {
    console.error("Login failed:", loginRes);
    return;
  }
  const token = JSON.parse(loginRes.body).token;
  console.log("Logged in!");

  console.log("Creating mission FENIX_LEVEL_30_EVOLUTION...");
  const missionData = JSON.stringify({
    title: "FENIX_LEVEL_30_EVOLUTION",
    objective: "Implement Phase 30: AI City Map and Perception Engine",
    projectId: "fenix_main"
  });
  const missionRes = await request({
    hostname: '127.0.0.1', port: 4400, path: '/api/missions', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': missionData.length, 'Authorization': 'Bearer ' + token }
  }, missionData);
  const missionId = JSON.parse(missionRes.body).id || "FENIX_LEVEL_30_EVOLUTION";

  console.log("Starting FENIX_LEVEL_30_EVOLUTION...");
  for (const jobName of jobs) {
    const data = JSON.stringify({
      type: "EXECUTE_JOB",
      payload: { jobName },
      projectId: "fenix_main"
    });
    
    // Note: the backend uses /api/runtime/jobs for jobs according to app.js
    const options = {
      hostname: '127.0.0.1', port: 4400, path: '/api/runtime/jobs', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': 'Bearer ' + token
      }
    };
    
    const res = await request(options, data);
    console.log(`Job ${jobName} created:`, res.status, res.body);
  }
}
run();
