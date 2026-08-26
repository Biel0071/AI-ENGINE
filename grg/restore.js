const fs = require('fs');
const readline = require('readline');

const path = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\c7fa05bd-004b-46bd-90ee-e1051a5bc837\\.system_generated\\logs\\transcript_full.jsonl';

const stream = fs.createReadStream(path, { encoding: 'utf8' });
const rl = readline.createInterface({ input: stream });

rl.on('line', (line) => {
  try {
    const entry = JSON.parse(line);
    if (entry.step_index === 31 && entry.type === 'GENERIC') {
      const content = entry.content || '';
      if (content.includes('File Path: ile:///c:/projetos/ai-engine-core/ai-engine/grg/public/runtime-cockpit.js')) {
        const lines = content.split('\n');
        const output = [];
        for (const l of lines) {
          const match = l.match(/^\d+: (.*)$/);
          if (match) output.push(match[1]);
        }
        fs.writeFileSync('public/runtime-cockpit.js', output.join('\n'));
        console.log('Restored runtime-cockpit.js: ' + output.length + ' lines');
      }
    }
    if (entry.step_index === 29 && entry.type === 'GENERIC') {
      const content = entry.content || '';
      if (content.includes('File Path: ile:///c:/projetos/ai-engine-core/ai-engine/grg/public/index.html')) {
        const lines = content.split('\n');
        const output = [];
        for (const l of lines) {
          const match = l.match(/^\d+: (.*)$/);
          if (match) output.push(match[1]);
        }
        fs.writeFileSync('public/index.html', output.join('\n'));
        console.log('Restored index.html: ' + output.length + ' lines');
      }
    }
    // Also unified.css at step 27?
    if (entry.step_index === 33 && entry.type === 'GENERIC') {
      const content = entry.content || '';
      if (content.includes('File Path: ile:///c:/projetos/ai-engine-core/ai-engine/grg/public/unified.css')) {
        const lines = content.split('\n');
        const output = [];
        for (const l of lines) {
          const match = l.match(/^\d+: (.*)$/);
          if (match) output.push(match[1]);
        }
        fs.writeFileSync('public/unified.css', output.join('\n'));
        console.log('Restored unified.css: ' + output.length + ' lines');
      }
    }
  } catch (e) {}
});
