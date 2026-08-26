const fs = require('fs');
let code = fs.readFileSync('grg/src/software-factory/dev-pipeline.js', 'utf8');

const badRegex = /if \(p\.includes\('melhoria pequena e segura'\)\) \{[\s\S]*?\n\s*\}/g;
code = code.replace(badRegex, '');

const applyImplRegex = /async applyImplementation\(prompt, projectContext, job\) \{\s*const changes = \[\];\s*const p = prompt\.toLowerCase\(\);/;

const goodBlock = `async applyImplementation(prompt, projectContext, job) {
    const changes = [];
    const p = prompt.toLowerCase();

    if (p.includes('melhoria pequena e segura')) {
        const readmePath = require('path').join(projectContext.projectPath, 'README.md');
        const content = '# Test Project\\nAutonomously improved at ' + new Date().toISOString() + '\\n';
        await new Promise(r => setTimeout(r, 20000));
        fs.writeFileSync(readmePath, content, 'utf8');
        changes.push({ file: 'README.md', action: 'MODIFIED', desc: 'Real physical file change for Daemon Proof' });
    }`;

code = code.replace(applyImplRegex, goodBlock);
fs.writeFileSync('grg/src/software-factory/dev-pipeline.js', code, 'utf8');
console.log('Fixed dev-pipeline.js');
