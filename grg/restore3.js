const fs = require('fs');
const readline = require('readline');

const path = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\c7fa05bd-004b-46bd-90ee-e1051a5bc837\\.system_generated\\logs\\transcript_full.jsonl';

const stream = fs.createReadStream(path, { encoding: 'utf8' });
const rl = readline.createInterface({ input: stream });

let runtimeCockpitLines = [];

rl.on('line', (line) => {
  try {
    const entry = JSON.parse(line);
    const content = entry.content || '';
    
    // Step 29: index.html
    if (entry.step_index === 29) {
      const lines = content.split('\n');
      const output = [];
      for (const l of lines) {
        const match = l.match(/^\d+: (.*)$/);
        if (match) output.push(match[1]);
      }
      if (output.length > 0) {
        fs.writeFileSync('public/index.html', output.join('\n'));
        console.log('Restored index.html: ' + output.length + ' lines');
      }
    }
    
    // Step 31, 33, 35: runtime-cockpit.js chunks
    if ([31, 33, 35].includes(entry.step_index)) {
      const lines = content.split('\n');
      for (const l of lines) {
        const match = l.match(/^\d+: (.*)$/);
        if (match) runtimeCockpitLines.push(match[1]);
      }
    }
    
    // Step 37: unified.css (Wait, what step was unified.css? Let me just ignore it for now or check later if I need it)
  } catch (e) {}
});

rl.on('close', () => {
  if (runtimeCockpitLines.length > 0) {
    fs.writeFileSync('public/runtime-cockpit.js', runtimeCockpitLines.join('\n'));
    console.log('Restored runtime-cockpit.js: ' + runtimeCockpitLines.length + ' lines');
  }
});
