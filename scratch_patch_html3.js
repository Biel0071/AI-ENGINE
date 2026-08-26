const fs = require('fs');
let html = fs.readFileSync('grg/public/index.html', 'utf8');

const jobsViewHTML = \
        <!-- JOBS VIEW -->
        <div id=\"view-jobs\" class=\"view\" style=\"display: none; flex-direction: column; flex: 1; background: var(--bg-dark);\">
          <div class=\"panel-header\">
            <h3>Job Queue</h3>
          </div>
          <div id=\"jobsListContainer\" class=\"panel-content\" style=\"padding: 20px; overflow-y: auto;\">
            <!-- Jobs will be rendered here -->
          </div>
        </div>

        <div id=\"view-ide\"\;

if (!html.includes('id=\"view-jobs\"')) {
   html = html.replace('<div id=\"view-ide\"', jobsViewHTML);
}
fs.writeFileSync('grg/public/index.html', html, 'utf8');
console.log('patched view-jobs');

