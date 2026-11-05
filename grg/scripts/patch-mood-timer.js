const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../public/fenix-mascot-sidebar.js');
let code = fs.readFileSync(filePath, 'utf8');

const targetMood = `    setMood(mood) {
      state.mascotMood = mood;`;

const replacementMood = `    setMood(mood) {
      if (this._moodTimer) {
        clearTimeout(this._moodTimer);
        this._moodTimer = null;
      }
      state.mascotMood = mood;`;

if (code.includes(targetMood) && !code.includes('if (this._moodTimer)')) {
  code = code.replace(targetMood, replacementMood);
}

// Also replace the setTimeouts inside switch
code = code.replace(/setTimeout\(\(\) => this\.setMood\('idle'\), 3500\);/, `this._moodTimer = setTimeout(() => this.setMood('idle'), 3500);`);
code = code.replace(/setTimeout\(\(\) => this\.setMood\('idle'\), 4000\);/g, `this._moodTimer = setTimeout(() => this.setMood('idle'), 4000);`);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Updated setMood with timer cleanup in fenix-mascot-sidebar.js');
