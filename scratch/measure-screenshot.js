const fs = require('fs');

// We can read PNG dimensions directly from IHDR
const buf = fs.readFileSync('C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/.user_uploaded/media_1790816627521.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);

console.log('Image dimensions:', width, 'x', height);
