const fs = require('fs');
const projectsFile = '.data/projects.json';
let data = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
const proj = data.projects.find(p => p.id === 'daemon-test' || p.projectId === 'daemon-test');
if (proj) {
  proj.projectId = 'daemon-test';
  fs.writeFileSync(projectsFile, JSON.stringify(data, null, 2));
  console.log('Fixed project ID');
}
