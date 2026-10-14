const fs = require('fs');
const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

const hudIds = ['cityOnlineCount', 'cityWorkingCount', 'cityMissionsCount'];
hudIds.forEach(id => {
  const matches = [...html.matchAll(new RegExp(id, 'g'))];
  console.log(`Matches for ${id}:`, matches.length);
});

const isoCity = fs.readFileSync('/opt/fenix-os/public/iso-city.js', 'utf8');
hudIds.forEach(id => {
  const matches = [...isoCity.matchAll(new RegExp(id, 'g'))];
  console.log(`iso-city.js matches for ${id}:`, matches.length);
});
