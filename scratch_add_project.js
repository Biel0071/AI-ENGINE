const fs = require('fs');
const path = require('path');
const fenixDataDir = path.join(__dirname, '.data');
if (!fs.existsSync(fenixDataDir)) fs.mkdirSync(fenixDataDir);

const projectsFile = path.join(fenixDataDir, 'projects.json');
let data = { projects: [] };
if (fs.existsSync(projectsFile)) {
  data = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
}
const proj = data.projects.find(p => p.id === 'daemon-test');
if (!proj) {
  const wsPath = path.join(__dirname, 'projects', 'daemon-test');
  if (!fs.existsSync(wsPath)) fs.mkdirSync(wsPath, { recursive: true });
  data.projects.push({
    id: 'daemon-test',
    name: 'Daemon Test',
    workspace: wsPath
  });
  fs.writeFileSync(projectsFile, JSON.stringify(data, null, 2));
  console.log('Project added to registry');
} else {
  console.log('Project already exists');
}

