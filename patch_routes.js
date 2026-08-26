const fs = require('fs');

let code = fs.readFileSync('grg/src/api/cloud-routes.js', 'utf8');

const enhancedPromptCode = `
      // --- COMMAND ROUTER ---
      if (prompt.startsWith('/LEARN')) {
         console.log(\`[CommandRouter] Executing /LEARN on \${projectId}\`);
         const ptnLib = app.patternLibrary || require('../memory/pattern-library').PatternLibrary;
         const library = new ptnLib();
         const patterns = library.extractPatterns({ projectName: project ? project.name : 'Unknown', files: ['admin.js', 'sidebar.css'] });
         sendJson(res, 200, { message: 'Learned patterns', patterns });
         return true;
      }
      if (prompt.startsWith('/PATTERNS')) {
         console.log(\`[CommandRouter] Executing /PATTERNS\`);
         sendJson(res, 200, { message: 'Pattern Library', patterns: [] });
         return true;
      }
      if (prompt.startsWith('/ISOLATE')) {
         if (project) {
            project.dna = project.dna || {};
            project.dna.isolationPolicy = { doNotCopy: ['visual identity', 'branding'] };
         }
         sendJson(res, 200, { message: 'Project isolated visually', dna: project.dna });
         return true;
      }
      if (prompt.startsWith('/NEW-DESIGN')) {
         console.log(\`[CommandRouter] Executing /NEW-DESIGN\`);
         // Trigger a massive Full Dev loop conceptually
      }

      // Step 1: Prompt Enhancer (mock or real logic here)
`;

code = code.replace(/\/\/ Step 1: Prompt Enhancer[^\n]*/, enhancedPromptCode.trim());

fs.writeFileSync('grg/src/api/cloud-routes.js', code, 'utf8');
console.log('Cloud Routes patched with Commands!');
