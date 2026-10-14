const fs = require('fs');
const file = 'c:/projetos/ai-engine-core/scratch/frontend-evolution/candidate/public/index.html';
let content = fs.readFileSync(file, 'utf8');
const startTag = '<!-- Dynamic 15 Agents Grid (Elite V11 Card Design) -->';
const endTag = '<!-- Dynamic Agents Mount & Error Trap (Preserved for Sabotage Test B & Live Table Switching) -->';
const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);
if(startIndex > -1 && endIndex > -1) {
  const newContent = content.substring(0, startIndex + startTag.length) + '\n          <div id="fenix-agents-grid" class="fenix-agents-grid"></div>\n\n          ' + content.substring(endIndex);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Success!');
} else {
  console.log('Tags not found.');
}
