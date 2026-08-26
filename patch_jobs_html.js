const fs = require('fs');
let html = fs.readFileSync('grg/public/index.html', 'utf8');

const navItem = `          <button class="nav-item" data-view="jobs" title="Jobs"><i class="ph ph-list-numbers"></i></button>\n          <button class="nav-item active" data-view="ide"`;
if (!html.includes('data-view="jobs"')) {
   html = html.replace('          <button class="nav-item active" data-view="ide"', navItem);
}

const jobsViewHTML = `
        <!-- JOBS VIEW -->
        <div id="view-jobs" class="view" style="display: none; flex-direction: column; width: 320px; background: var(--bg-dark); border-right: 1px solid var(--border);">
          <div class="panel-header">
            <h3>Job Queue</h3>
          </div>
          <div id="jobsListContainer" class="panel-content" style="padding: 10px; overflow-y: auto;">
            <!-- Jobs will be rendered here -->
          </div>
        </div>

        <!-- EXPLORER (IDE) -->
`;
if (!html.includes('id="view-jobs"')) {
   html = html.replace('        <!-- EXPLORER (IDE) -->', jobsViewHTML);
}

if (!html.includes('jobs-app.js')) {
   html = html.replace('</body>', '  <script src="/jobs-app.js"></script>\n</body>');
}

fs.writeFileSync('grg/public/index.html', html, 'utf8');
console.log('index.html patched with jobs view!');
