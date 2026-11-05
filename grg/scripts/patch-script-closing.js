const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const target = `              }
            };
        </div>

        <!-- DEFESA & GOVERNANÇA ZERO-TRUST VIEW (Full Operational SOC View) -->`;

const replacement = `              }
            };
          </script>
        </div>

        <!-- DEFESA & GOVERNANÇA ZERO-TRUST VIEW (Full Operational SOC View) -->`;

if (html.includes(target)) {
  html = html.replace(target, replacement);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Successfully added missing </script> tag in index.html!');
} else {
  console.log('Target string not found');
}
