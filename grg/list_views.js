const fs = require('fs');
const readline = require('readline');

const path = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\c7fa05bd-004b-46bd-90ee-e1051a5bc837\\.system_generated\\logs\\transcript.jsonl';

const stream = fs.createReadStream(path, { encoding: 'utf8' });
const rl = readline.createInterface({ input: stream });

rl.on('line', (line) => {
  try {
    const entry = JSON.parse(line);
    if (entry.tool_calls) {
      entry.tool_calls.forEach(call => {
        if (call.name === 'view_file' && call.args.AbsolutePath.includes('runtime-cockpit.js')) {
          console.log('Step ' + entry.step_index + ': view_file ' + JSON.stringify(call.args));
        }
      });
    }
  } catch (e) {}
});
