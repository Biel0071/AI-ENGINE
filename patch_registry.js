const fs = require('fs');

let code = fs.readFileSync('grg/src/projects/project-registry.js', 'utf8');

const registerFunc = `
  register(projectData) {
    const projectId = projectData.projectId || crypto.randomUUID();
    const p = {
      projectId,
      name: projectData.name || 'Unnamed Project',
      workspace: projectData.workspace || '',
      status: projectData.status || 'ACTIVE',
      // --- PROJECT DNA ---
      dna: {
        domain: projectData.domain || 'UNKNOWN',
        architecture: projectData.architecture || 'UNKNOWN',
        frontend: projectData.frontend || 'UNKNOWN',
        backend: projectData.backend || 'UNKNOWN',
        admin: projectData.admin || 'UNKNOWN',
        designSystem: projectData.designSystem || 'UNKNOWN',
        isolationPolicy: projectData.isolationPolicy || { doNotCopy: ['visual identity'] }
      },
      createdAt: new Date().toISOString()
    };
    this.projects.set(projectId, p);
    this.save();
    return p;
  }
`;

// Replace the existing register function
code = code.replace(/register\s*\([^)]*\)\s*\{[\s\S]*?return\s+p;\s*\}/, registerFunc.trim());

fs.writeFileSync('grg/src/projects/project-registry.js', code, 'utf8');
console.log('Project Registry patched with DNA!');
