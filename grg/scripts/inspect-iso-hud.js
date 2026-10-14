const fs = require('fs');
const isoCity = fs.readFileSync('/opt/fenix-os/public/iso-city.js', 'utf8');

['cityOnlineCount', 'cityWorkingCount', 'cityMissionsCount'].forEach(id => {
  const idx = isoCity.indexOf(id);
  console.log(`=== ${id} in iso-city.js at ${idx} ===`);
  console.log(isoCity.slice(Math.max(0, idx - 100), Math.min(isoCity.length, idx + 300)));
});
